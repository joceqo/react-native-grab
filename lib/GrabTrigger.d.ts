import React from 'react';
interface GrabTriggerProps {
    isActive: boolean;
    onToggle: () => void;
}
export declare const TRIGGER_GEOMETRY: {
    bottom: number;
    right: number;
    width: number;
    height: number;
};
/** True if a screen-space point falls in the trigger's bottom-right corner (with slop). */
export declare function isPointInTrigger(pageX: number, pageY: number, winWidth: number, winHeight: number): boolean;
export declare function GrabTrigger({ isActive, onToggle }: GrabTriggerProps): React.JSX.Element;
export {};
//# sourceMappingURL=GrabTrigger.d.ts.map