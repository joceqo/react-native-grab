import { findNodeHandle } from 'react-native';
import { findSourceFrame, parseComponentStack } from './componentStack';
import {
  getInspectorDataForViewAtPoint,
  type FindNodeHandle,
  type RawInspectorData,
} from './getInspectorDataForViewAtPoint';
import { symbolicateStack } from './symbolicate';
import type { GrabSelection, StackFrame, Symbolication } from './types';

/** Fabric answers through a callback; give up rather than hang if it never fires. */
const INSPECT_TIMEOUT_MS = 600;

const resolveHandle = findNodeHandle as unknown as FindNodeHandle;

function toSelection(
  raw: RawInspectorData,
  index: number,
  stack?: StackFrame[],
  symbolication: Symbolication | null = null,
): GrabSelection {
  const hierarchy = raw.hierarchy.map((item) => item.name || 'Unknown');
  const frames = stack ?? parseComponentStack(raw.componentStack);
  const safeIndex = Math.min(Math.max(index, 0), Math.max(hierarchy.length - 1, 0));

  return {
    name: hierarchy[safeIndex] ?? 'Unknown',
    frame: raw.frame,
    props: raw.props ?? {},
    hierarchy,
    index: safeIndex,
    stack: frames,
    source: findSourceFrame(frames, hierarchy, safeIndex),
    symbolication,
    raw,
  };
}

/**
 * Turn Metro bundle offsets into real source locations, best effort.
 *
 * Deliberately *not* part of {@link inspectAtPoint}: a round-trip to Metro
 * costs anything from a few milliseconds to most of a minute on a cold cache,
 * and the panel must appear on the first frame either way. Callers show the
 * selection, then apply this to it.
 *
 * The outcome — including the reason it failed — rides along on the returned
 * selection, so the copied block can admit it has no locations instead of
 * pasting a dozen bundle URLs that look like ones.
 */
export async function withRealSources(selection: GrabSelection): Promise<GrabSelection> {
  let result: Awaited<ReturnType<typeof symbolicateStack>>;
  try {
    result = await symbolicateStack(selection.stack);
  } catch (error) {
    // Nice to have, never worth losing the selection over.
    return {
      ...selection,
      symbolication: {
        server: null,
        requested: 0,
        mapped: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }

  return {
    ...selection,
    stack: result.frames,
    source: findSourceFrame(result.frames, selection.hierarchy, selection.index),
    symbolication: result.info,
  };
}

function queryPoint(
  x: number,
  y: number,
  inspectedView: unknown,
): Promise<GrabSelection | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: GrabSelection | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const queried = getInspectorDataForViewAtPoint(inspectedView, x, y, (raw) => {
      settle(toSelection(raw, raw.selectedIndex ?? raw.hierarchy.length - 1));
      return true;
    });

    if (!queried) {
      settle(null);
      return;
    }

    setTimeout(() => settle(null), INSPECT_TIMEOUT_MS);
  });
}

/**
 * Ask React what sits at a point on screen.
 *
 * `inspectedView` must be the host instance wrapping your app: it scopes the
 * hit test, so the inspector's own overlays are never selected — and Fabric
 * dereferences it without a null check, so there is no meaningful default.
 *
 * The returned stack still holds Metro bundle offsets: pass the selection
 * through {@link withRealSources} to turn them into files on disk.
 */
export async function inspectAtPoint(
  x: number,
  y: number,
  inspectedView: unknown,
): Promise<GrabSelection | null> {
  if (inspectedView == null) return null;

  return queryPoint(x, y, inspectedView);
}

/**
 * Move the selection to another level of the same hierarchy — one step towards
 * the root, or back down towards the touched element.
 */
export function selectHierarchyIndex(
  selection: GrabSelection,
  index: number,
): Promise<GrabSelection | null> {
  const item = selection.raw.hierarchy[index];
  if (!item) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: GrabSelection | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let data: { measure: (cb: never) => void; props: Record<string, unknown> };
    try {
      data = item.getInspectorData(resolveHandle) as typeof data;
    } catch {
      settle(null);
      return;
    }

    // The stack is already symbolicated: reuse it rather than pay for it twice.
    const next = toSelection(selection.raw, index, selection.stack, selection.symbolication);
    next.props = data.props ?? {};

    try {
      (data.measure as unknown as (cb: (...args: number[]) => void) => void)(
        (_x, _y, width, height, pageX, pageY) => {
          next.frame = { left: pageX, top: pageY, width, height };
          settle(next);
        },
      );
    } catch {
      settle(next);
      return;
    }

    // `measure` is a no-op on unmounted nodes: fall back to the known frame.
    setTimeout(() => settle(next), INSPECT_TIMEOUT_MS);
  });
}

export { isInspectorAvailable } from './getInspectorDataForViewAtPoint';
export { symbolicateStack } from './symbolicate';
