import { findNodeHandle } from 'react-native';
import { findSourceFrame, parseComponentStack } from './componentStack';
import {
  getInspectorDataForViewAtPoint,
  type FindNodeHandle,
  type RawInspectorData,
} from './getInspectorDataForViewAtPoint';
import { symbolicateStack } from './symbolicate';
import type { GrabSelection, StackFrame } from './types';

/** Fabric answers through a callback; give up rather than hang if it never fires. */
const INSPECT_TIMEOUT_MS = 600;

const resolveHandle = findNodeHandle as unknown as FindNodeHandle;

function toSelection(
  raw: RawInspectorData,
  index: number,
  stack?: StackFrame[],
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
    raw,
  };
}

/** Turn Metro bundle offsets into real source locations, best effort. */
async function withRealSources(selection: GrabSelection): Promise<GrabSelection> {
  let stack: StackFrame[];
  try {
    stack = await symbolicateStack(selection.stack);
  } catch {
    // Nice to have, never worth losing the selection over.
    return selection;
  }
  if (stack === selection.stack) return selection;

  return {
    ...selection,
    stack,
    source: findSourceFrame(stack, selection.hierarchy, selection.index),
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
 */
export async function inspectAtPoint(
  x: number,
  y: number,
  inspectedView: unknown,
): Promise<GrabSelection | null> {
  if (inspectedView == null) return null;

  const selection = await queryPoint(x, y, inspectedView);
  if (!selection) return null;

  return withRealSources(selection);
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
    const next = toSelection(selection.raw, index, selection.stack);
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
