import type { FiberNode, SourceLocation } from './types';
declare function getFiberRoot(): FiberNode | null;
declare function walkHostFibers(fiber: FiberNode | null, depth?: number, results?: Array<{
    fiber: FiberNode;
    depth: number;
}>): Array<{
    fiber: FiberNode;
    depth: number;
}>;
declare function getComponentName(fiber: FiberNode): string;
declare function getSource(fiber: FiberNode): SourceLocation | null;
declare function getStyle(fiber: FiberNode): Record<string, unknown>;
declare function measure(fiber: FiberNode): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
}>;
export declare const FiberAdapter: {
    getFiberRoot: typeof getFiberRoot;
    walkHostFibers: typeof walkHostFibers;
    getComponentName: typeof getComponentName;
    getSource: typeof getSource;
    getStyle: typeof getStyle;
    measure: typeof measure;
};
export {};
//# sourceMappingURL=FiberAdapter.d.ts.map