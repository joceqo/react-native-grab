import type { MeasuredElement } from '../fiber/types';
/**
 * Find every element under the tap, most-specific first.
 *
 * `tolerance` grows each element's hit rect by a few px so small targets (icons, send
 * buttons) still get selected when the finger lands a hair off. Large elements already
 * contain the tap, so tolerance only ever *adds* nearby small elements — and because we
 * sort smallest-area-first they stay on top of the list.
 */
export declare function hitTest(snapshot: MeasuredElement[], tapX: number, tapY: number, tolerance?: number): MeasuredElement[];
//# sourceMappingURL=hitTest.d.ts.map