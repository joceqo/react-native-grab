import type { GestureResponderEvent } from 'react-native';
import type { MeasuredElement } from '../fiber/types';
export declare function useTapToSelect(snapshot: MeasuredElement[]): {
    hovered: MeasuredElement | null;
    handleMove: (event: GestureResponderEvent) => void;
    handleTap: (event: GestureResponderEvent) => void;
    selectParent: () => void;
    selectChild: () => void;
    clearSelection: () => void;
    matches: MeasuredElement[];
    selectedIndex: number;
    selected: MeasuredElement | null;
};
//# sourceMappingURL=useTapToSelect.d.ts.map