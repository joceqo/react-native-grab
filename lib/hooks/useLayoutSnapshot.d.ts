import type { MeasuredElement } from '../fiber/types';
export declare function useLayoutSnapshot(): {
    snapshot: MeasuredElement[];
    isBuilding: boolean;
    buildSnapshot: () => Promise<number>;
    invalidate: () => void;
};
//# sourceMappingURL=useLayoutSnapshot.d.ts.map