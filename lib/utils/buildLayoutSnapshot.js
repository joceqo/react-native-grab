"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLayoutSnapshot = buildLayoutSnapshot;
const FiberAdapter_1 = require("../fiber/FiberAdapter");
async function buildLayoutSnapshot(root) {
    const hostFibers = FiberAdapter_1.FiberAdapter.walkHostFibers(root);
    const settled = await Promise.allSettled(hostFibers.map(async ({ fiber, depth }) => {
        const rect = await FiberAdapter_1.FiberAdapter.measure(fiber);
        if (rect.width === 0 && rect.height === 0)
            return null;
        const style = FiberAdapter_1.FiberAdapter.getStyle(fiber);
        const zIndex = typeof style.zIndex === 'number' ? style.zIndex : 0;
        return {
            fiber,
            depth,
            zIndex,
            componentName: FiberAdapter_1.FiberAdapter.getComponentName(fiber),
            ...rect,
        };
    }));
    const elements = [];
    for (const result of settled) {
        if (result.status === 'fulfilled' && result.value !== null) {
            elements.push(result.value);
        }
    }
    // Sort by z-index desc, then depth desc so specific elements come first
    elements.sort((a, b) => b.zIndex - a.zIndex || b.depth - a.depth);
    return elements;
}
//# sourceMappingURL=buildLayoutSnapshot.js.map