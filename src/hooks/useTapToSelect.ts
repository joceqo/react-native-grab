import { useCallback, useState } from 'react';
import { FiberAdapter } from '../fiber/FiberAdapter';
import { HOST_COMPONENT_TAG } from '../fiber/types';
import type { FiberNode, MeasuredElement } from '../fiber/types';
import { hitTest } from '../utils/hitTest';

// Grow the tap hit-rect so small targets (icons, dots, the send button) still get picked
// when the finger lands a hair off. Only ever adds nearby small elements — smallest-area
// sort keeps them on top. Bumped to 10 for tiny targets like 11px passcode dots.
const TAP_TOLERANCE = 10;

interface TapState {
  matches: MeasuredElement[];
  selectedIndex: number;
  selected: MeasuredElement | null;
}

type Rect = { x: number; y: number; width: number; height: number };

function unionInto(map: Map<FiberNode, Rect>, fiber: FiberNode, r: MeasuredElement): void {
  const cur = map.get(fiber);
  if (!cur) {
    map.set(fiber, { x: r.x, y: r.y, width: r.width, height: r.height });
    return;
  }
  const x1 = Math.min(cur.x, r.x);
  const y1 = Math.min(cur.y, r.y);
  const x2 = Math.max(cur.x + cur.width, r.x + r.width);
  const y2 = Math.max(cur.y + cur.height, r.y + r.height);
  cur.x = x1;
  cur.y = y1;
  cur.width = x2 - x1;
  cur.height = y2 - y1;
}

/**
 * Bounding box per fiber = union of every measured descendant's rect. This gives *containers*
 * (even ones the New Architecture flattened away natively — a bg-less layout `<View>` like a
 * keypad grid) a correct box around all their children, not just the one we tapped.
 */
function computeBBoxes(snapshot: MeasuredElement[]): Map<FiberNode, Rect> {
  const map = new Map<FiberNode, Rect>();
  for (const m of snapshot) {
    let fiber: FiberNode | null = m.fiber;
    const seen = new Set<FiberNode>();
    while (fiber && !seen.has(fiber)) {
      seen.add(fiber);
      unionInto(map, fiber, m);
      fiber = fiber.return;
    }
  }
  return map;
}

/**
 * Ancestor chain (deepest → root) by walking `fiber.return`. Keeps the real View hierarchy
 * (all host nodes, incl. flattened layout containers like the keypad grid) + named user
 * components (PasscodeScreen, MessageBubble…), dropping internal wrappers (CssInterop /
 * Context / Provider / ForwardRef / Memo). Each entry is highlighted by its descendants'
 * bounding box, so Parent climbs to "the group around all the digits". name/props/stack exact.
 */
function buildAncestry(start: MeasuredElement, bboxes: Map<FiberNode, Rect>): MeasuredElement[] {
  const chain: MeasuredElement[] = [];
  let rect: Rect = { x: start.x, y: start.y, width: start.width, height: start.height };
  let fiber: FiberNode | null = start.fiber;
  let depth = 0;
  const seen = new Set<FiberNode>();
  while (fiber && !seen.has(fiber)) {
    seen.add(fiber);
    const bbox = bboxes.get(fiber);
    if (bbox) rect = bbox;
    const name = FiberAdapter.getComponentName(fiber);
    const isHost = fiber.tag === HOST_COMPONENT_TAG;
    const internal = /CssInterop|Context|Provider|ForwardRef|Memo/.test(name);
    const meaningful = isHost || (name !== 'Unknown' && name !== 'Anonymous' && !internal);
    if (meaningful) {
      chain.push({ fiber, componentName: name, depth, zIndex: 0, ...rect });
      depth += 1;
    }
    fiber = fiber.return;
  }
  return chain;
}

export function useTapToSelect(snapshot: MeasuredElement[]) {
  const [state, setState] = useState<TapState>({
    matches: [],
    selectedIndex: 0,
    selected: null,
  });
  // Live preview while the finger is down (there is no hover on touch): the ring follows
  // the most-specific element under the reticle. Committed to `selected` on release.
  const [hovered, setHovered] = useState<MeasuredElement | null>(null);

  // Hit-test at explicit screen coords (the caller applies any finger→reticle offset), so
  // tiny targets aren't obscured by the finger.
  const handleMoveAt = useCallback(
    (x: number, y: number) => {
      setHovered(hitTest(snapshot, x, y, TAP_TOLERANCE)[0] ?? null);
    },
    [snapshot],
  );

  const handleTapAt = useCallback(
    (x: number, y: number) => {
      const start = hitTest(snapshot, x, y, TAP_TOLERANCE)[0] ?? null;
      setHovered(null);
      if (!start) {
        setState({ matches: [], selectedIndex: 0, selected: null });
        return;
      }
      // matches = the fiber ancestry (deepest → root), so Parent/Child walk the real tree.
      const bboxes = computeBBoxes(snapshot);
      const chain = buildAncestry(start, bboxes);
      setState({ matches: chain, selectedIndex: 0, selected: chain[0] ?? start });
    },
    [snapshot],
  );

  // Walk the ancestry: index 0 is the tapped (deepest) element; higher indices are ancestors.
  // Clamped (no wrap) so Parent stops at the root and Child at the deepest.
  const selectParent = useCallback(() => {
    setState((prev) => {
      if (prev.matches.length === 0) return prev;
      const next = Math.min(prev.selectedIndex + 1, prev.matches.length - 1);
      return { ...prev, selectedIndex: next, selected: prev.matches[next] ?? null };
    });
  }, []);

  const selectChild = useCallback(() => {
    setState((prev) => {
      if (prev.matches.length === 0) return prev;
      const next = Math.max(prev.selectedIndex - 1, 0);
      return { ...prev, selectedIndex: next, selected: prev.matches[next] ?? null };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setHovered(null);
    setState({ matches: [], selectedIndex: 0, selected: null });
  }, []);

  return { ...state, hovered, handleMoveAt, handleTapAt, selectParent, selectChild, clearSelection };
}
