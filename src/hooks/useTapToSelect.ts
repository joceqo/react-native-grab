import { useCallback, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import type { MeasuredElement } from '../fiber/types';
import { hitTest } from '../utils/hitTest';

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

  const handleMove = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      setHovered(hitTest(snapshot, pageX, pageY)[0] ?? null);
    },
    [snapshot],
  );

  const handleTap = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      const matches = hitTest(snapshot, pageX, pageY);
      setHovered(null);
      setState({ matches, selectedIndex: 0, selected: matches[0] ?? null });
    },
    [snapshot],
  );

  const cycleNext = useCallback(() => {
    setState((prev) => {
      if (prev.matches.length === 0) return prev;
      const next = (prev.selectedIndex + 1) % prev.matches.length;
      return { ...prev, selectedIndex: next, selected: prev.matches[next] ?? null };
    });
  }, []);

  const cyclePrevious = useCallback(() => {
    setState((prev) => {
      if (prev.matches.length === 0) return prev;
      const prev_ = (prev.selectedIndex - 1 + prev.matches.length) % prev.matches.length;
      return { ...prev, selectedIndex: prev_, selected: prev.matches[prev_] ?? null };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setHovered(null);
    setState({ matches: [], selectedIndex: 0, selected: null });
  }, []);

  return { ...state, hovered, handleMove, handleTap, cycleNext, cyclePrevious, clearSelection };
}
