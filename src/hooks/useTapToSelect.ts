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

/**
 * Build the ancestor chain (deepest → root) from the tapped element by walking `fiber.return`.
 * Unlike the raw hit-stack, this includes *logical* containers — even ones the New Architecture
 * flattened away natively (a bg-less layout `<View>`, or a component like MessageBubble). Those
 * have no measured rect, so we inherit the nearest measured descendant's bounds for the highlight
 * (approximate), while name/props/stack stay exact. This is what lets Parent climb to "the group".
 */
function buildAncestry(
  start: MeasuredElement,
  byFiber: Map<FiberNode, MeasuredElement>,
): MeasuredElement[] {
  const chain: MeasuredElement[] = [];
  let rect = { x: start.x, y: start.y, width: start.width, height: start.height };
  let fiber: FiberNode | null = start.fiber;
  let depth = 0;
  const seen = new Set<FiberNode>();
  while (fiber && !seen.has(fiber)) {
    seen.add(fiber);
    const measured = byFiber.get(fiber);
    if (measured) rect = { x: measured.x, y: measured.y, width: measured.width, height: measured.height };
    const name = FiberAdapter.getComponentName(fiber);
    const meaningful = fiber.tag === HOST_COMPONENT_TAG || (name !== 'Unknown' && name !== 'Anonymous');
    if (meaningful) {
      chain.push({ fiber, componentName: name, depth, zIndex: measured?.zIndex ?? 0, ...rect });
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
      const byFiber = new Map(snapshot.map((e) => [e.fiber, e]));
      const chain = buildAncestry(start, byFiber);
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
