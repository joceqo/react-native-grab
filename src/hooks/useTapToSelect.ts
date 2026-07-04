import { useCallback, useState } from 'react';
import type { MeasuredElement } from '../fiber/types';
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

export function useTapToSelect(snapshot: MeasuredElement[]) {
  const [state, setState] = useState<TapState>({
    matches: [],
    selectedIndex: 0,
    selected: null,
  });
  // Live preview while the finger is down (there is no hover on touch): the ring follows
  // the most-specific element under the finger. Committed to `selected` on release.
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
      const matches = hitTest(snapshot, x, y, TAP_TOLERANCE);
      setHovered(null);
      setState({ matches, selectedIndex: 0, selected: matches[0] ?? null });
    },
    [snapshot],
  );

  // Walk UP the stack: matches are sorted smallest→largest, so the next index is a
  // larger (ancestor) element — e.g. from a message bubble up to the message group / list.
  // Clamped (no wrap) so Parent stops at the outermost and Child at the innermost.
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
