type ComponentFunction = ((...args: never[]) => unknown) & {
    displayName?: string;
    name?: string;
};
export interface SourceLocation {
    fileName: string;
    lineNumber: number;
    columnNumber?: number;
}
export interface FiberNode {
    tag: number;
    type: string | ComponentFunction | null;
    memoizedProps: Record<string, unknown> & {
        __source?: SourceLocation;
    };
    stateNode: unknown;
    child: FiberNode | null;
    sibling: FiberNode | null;
    return: FiberNode | null;
    /** React < 19 (with @babel/plugin-transform-react-jsx-source). Removed in React 19. */
    _debugSource?: SourceLocation;
    _debugOwner?: FiberNode;
}
export interface MeasuredElement {
    fiber: FiberNode;
    x: number;
    y: number;
    width: number;
    height: number;
    depth: number;
    zIndex: number;
    componentName: string;
}
export declare const HOST_COMPONENT_TAG = 5;
export {};
//# sourceMappingURL=types.d.ts.map