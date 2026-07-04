"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTapToSelect = useTapToSelect;
const react_1 = require("react");
const hitTest_1 = require("../utils/hitTest");
// Grow the tap hit-rect by a few px so small targets (icons, the send button) still get
// picked when the finger lands a hair off. Only ever adds nearby small elements.
const TAP_TOLERANCE = 6;
function useTapToSelect(snapshot) {
    const [state, setState] = (0, react_1.useState)({
        matches: [],
        selectedIndex: 0,
        selected: null,
    });
    // Live preview while the finger is down (there is no hover on touch): the ring follows
    // the most-specific element under the finger. Committed to `selected` on release.
    const [hovered, setHovered] = (0, react_1.useState)(null);
    const handleMove = (0, react_1.useCallback)((event) => {
        var _a;
        const { pageX, pageY } = event.nativeEvent;
        setHovered((_a = (0, hitTest_1.hitTest)(snapshot, pageX, pageY, TAP_TOLERANCE)[0]) !== null && _a !== void 0 ? _a : null);
    }, [snapshot]);
    const handleTap = (0, react_1.useCallback)((event) => {
        var _a;
        const { pageX, pageY } = event.nativeEvent;
        const matches = (0, hitTest_1.hitTest)(snapshot, pageX, pageY, TAP_TOLERANCE);
        setHovered(null);
        setState({ matches, selectedIndex: 0, selected: (_a = matches[0]) !== null && _a !== void 0 ? _a : null });
    }, [snapshot]);
    // Walk UP the stack: matches are sorted smallest→largest, so the next index is a
    // larger (ancestor) element — e.g. from a message bubble up to the message group / list.
    // Clamped (no wrap) so Parent stops at the outermost and Child at the innermost.
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
    return { ...state, hovered, handleMove, handleTap, selectParent, selectChild, clearSelection };
}
//# sourceMappingURL=useTapToSelect.js.map