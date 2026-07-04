import type { MeasuredElement } from '../fiber/types';
export declare function useTapToSelect(snapshot: MeasuredElement[]): {
    hovered: MeasuredElement | null;
    handleMoveAt: (x: number, y: number) => void;
    handleTapAt: (x: number, y: number) => void;
    selectParent: () => void;
    selectChild: () => void;
    clearSelection: () => void;
    matches: MeasuredElement[];
    selectedIndex: number;
    selected: MeasuredElement | null;
};
//# sourceMappingURL=useTapToSelect.d.ts.map