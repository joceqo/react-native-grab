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

  const handleTap = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      const matches = hitTest(snapshot, pageX, pageY);
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
    setState({ matches: [], selectedIndex: 0, selected: null });
  }, []);

  return { ...state, handleTap, cycleNext, cyclePrevious, clearSelection };
}
