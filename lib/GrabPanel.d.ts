import React from 'react';
import type { MeasuredElement } from './fiber/types';
interface GrabPanelProps {
    element: MeasuredElement | null;
    /** Number of elements under the tap (the hit stack) and the currently-selected index. */
    matchCount?: number;
    matchIndex?: number;
    /** Walk up (larger/ancestor) / down (smaller/descendant) the hit stack. */
    onParent?: () => void;
    onChild?: () => void;
    onClose: () => void;
}
export declare function GrabPanel({ element, matchCount, matchIndex, onParent, onChild, onClose, }: GrabPanelProps): React.JSX.Element;
export {};
//# sourceMappingURL=GrabPanel.d.ts.map