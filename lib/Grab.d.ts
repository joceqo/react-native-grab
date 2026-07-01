import React, { type ReactNode } from 'react';
export interface GrabProps {
    /** Enable the inspector. Pass `__DEV__` so it tree-shakes in production. */
    enabled?: boolean;
    children: ReactNode;
}
export declare function Grab({ enabled, children }: GrabProps): React.JSX.Element;
//# sourceMappingURL=Grab.d.ts.map