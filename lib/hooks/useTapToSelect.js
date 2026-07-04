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
function unionInto(map, fiber, r) {
    const cur = map.get(fiber);
    if (!cur) {
        map.set(fiber, { x: r.x, y: r.y, width: r.width, height: r.height });
        return;
    }
    const x1 = Math.min(cur.x, r.x);
    const y1 = Math.min(cur.y, r.y);
    const x2 = Math.max(cur.x + cur.width, r.x + r.width);
    const y2 = Math.max(cur.y + cur.height, r.y + r.height);
    cur.x = x1;
    cur.y = y1;
    cur.width = x2 - x1;
    cur.height = y2 - y1;
}
/**
 * Bounding box per fiber = union of every measured descendant's rect. This gives *containers*
 * (even ones the New Architecture flattened away natively — a bg-less layout `<View>` like a
 * keypad grid) a correct box around all their children, not just the one we tapped.
 */
function computeBBoxes(snapshot) {
    const map = new Map();
    for (const m of snapshot) {
        let fiber = m.fiber;
        const seen = new Set();
        while (fiber && !seen.has(fiber)) {
            seen.add(fiber);
            unionInto(map, fiber, m);
            fiber = fiber.return;
        }
    }
    return map;
}
/**
 * Ancestor chain (deepest → root) by walking `fiber.return`. Keeps the real View hierarchy
 * (all host nodes, incl. flattened layout containers like the keypad grid) + named user
 * components (PasscodeScreen, MessageBubble…), dropping internal wrappers (CssInterop /
 * Context / Provider / ForwardRef / Memo). Each entry is highlighted by its descendants'
 * bounding box, so Parent climbs to "the group around all the digits". name/props/stack exact.
 */
function buildAncestry(start, bboxes) {
    const chain = [];
    let rect = { x: start.x, y: start.y, width: start.width, height: start.height };
    let fiber = start.fiber;
    let depth = 0;
    const seen = new Set();
    while (fiber && !seen.has(fiber)) {
        seen.add(fiber);
        const bbox = bboxes.get(fiber);
        if (bbox)
            rect = bbox;
        const name = FiberAdapter_1.FiberAdapter.getComponentName(fiber);
        const isHost = fiber.tag === types_1.HOST_COMPONENT_TAG;
        const internal = /CssInterop|Context|Provider|ForwardRef|Memo/.test(name);
        const meaningful = isHost || (name !== 'Unknown' && name !== 'Anonymous' && !internal);
        if (meaningful) {
            chain.push({ fiber, componentName: name, depth, zIndex: 0, ...rect });
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
        const bboxes = computeBBoxes(snapshot);
        const chain = buildAncestry(start, bboxes);
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