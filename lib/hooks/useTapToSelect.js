"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTapToSelect = useTapToSelect;
const react_1 = require("react");
const FiberAdapter_1 = require("../fiber/FiberAdapter");
const types_1 = require("../fiber/types");
const hitTest_1 = require("../utils/hitTest");
// Grow the tap hit-rect so small targets (icons, dots, the send button) still get picked
// when the finger lands a hair off. Only ever adds nearby small elements — smallest-area
// sort keeps them on top. Bumped to 10 for tiny targets like 11px passcode dots.
const TAP_TOLERANCE = 10;
/**
 * Build the ancestor chain (deepest → root) from the tapped element by walking `fiber.return`.
 * Unlike the raw hit-stack, this includes *logical* containers — even ones the New Architecture
 * flattened away natively (a bg-less layout `<View>`, or a component like MessageBubble). Those
 * have no measured rect, so we inherit the nearest measured descendant's bounds for the highlight
 * (approximate), while name/props/stack stay exact. This is what lets Parent climb to "the group".
 */
function buildAncestry(start, byFiber) {
    var _a;
    const chain = [];
    let rect = { x: start.x, y: start.y, width: start.width, height: start.height };
    let fiber = start.fiber;
    let depth = 0;
    const seen = new Set();
    while (fiber && !seen.has(fiber)) {
        seen.add(fiber);
        const measured = byFiber.get(fiber);
        if (measured)
            rect = { x: measured.x, y: measured.y, width: measured.width, height: measured.height };
        const name = FiberAdapter_1.FiberAdapter.getComponentName(fiber);
        const meaningful = fiber.tag === types_1.HOST_COMPONENT_TAG || (name !== 'Unknown' && name !== 'Anonymous');
        if (meaningful) {
            chain.push({ fiber, componentName: name, depth, zIndex: (_a = measured === null || measured === void 0 ? void 0 : measured.zIndex) !== null && _a !== void 0 ? _a : 0, ...rect });
            depth += 1;
        }
        fiber = fiber.return;
    }
    return chain;
}
function useTapToSelect(snapshot) {
    const [state, setState] = (0, react_1.useState)({
        matches: [],
        selectedIndex: 0,
        selected: null,
    });
    // Live preview while the finger is down (there is no hover on touch): the ring follows
    // the most-specific element under the reticle. Committed to `selected` on release.
    const [hovered, setHovered] = (0, react_1.useState)(null);
    // Hit-test at explicit screen coords (the caller applies any finger→reticle offset), so
    // tiny targets aren't obscured by the finger.
    const handleMoveAt = (0, react_1.useCallback)((x, y) => {
        var _a;
        setHovered((_a = (0, hitTest_1.hitTest)(snapshot, x, y, TAP_TOLERANCE)[0]) !== null && _a !== void 0 ? _a : null);
    }, [snapshot]);
    const handleTapAt = (0, react_1.useCallback)((x, y) => {
        var _a, _b;
        const start = (_a = (0, hitTest_1.hitTest)(snapshot, x, y, TAP_TOLERANCE)[0]) !== null && _a !== void 0 ? _a : null;
        setHovered(null);
        if (!start) {
            setState({ matches: [], selectedIndex: 0, selected: null });
            return;
        }
        // matches = the fiber ancestry (deepest → root), so Parent/Child walk the real tree.
        const byFiber = new Map(snapshot.map((e) => [e.fiber, e]));
        const chain = buildAncestry(start, byFiber);
        setState({ matches: chain, selectedIndex: 0, selected: (_b = chain[0]) !== null && _b !== void 0 ? _b : start });
    }, [snapshot]);
    // Walk the ancestry: index 0 is the tapped (deepest) element; higher indices are ancestors.
    // Clamped (no wrap) so Parent stops at the root and Child at the deepest.
    const selectParent = (0, react_1.useCallback)(() => {
        setState((prev) => {
            var _a;
            if (prev.matches.length === 0)
                return prev;
            const next = Math.min(prev.selectedIndex + 1, prev.matches.length - 1);
            return { ...prev, selectedIndex: next, selected: (_a = prev.matches[next]) !== null && _a !== void 0 ? _a : null };
        });
    }, []);
    const selectChild = (0, react_1.useCallback)(() => {
        setState((prev) => {
            var _a;
            if (prev.matches.length === 0)
                return prev;
            const next = Math.max(prev.selectedIndex - 1, 0);
            return { ...prev, selectedIndex: next, selected: (_a = prev.matches[next]) !== null && _a !== void 0 ? _a : null };
        });
    }, []);
    const clearSelection = (0, react_1.useCallback)(() => {
        setHovered(null);
        setState({ matches: [], selectedIndex: 0, selected: null });
    }, []);
    return { ...state, hovered, handleMoveAt, handleTapAt, selectParent, selectChild, clearSelection };
}
//# sourceMappingURL=useTapToSelect.js.map