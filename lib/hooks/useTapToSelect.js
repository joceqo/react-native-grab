"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTapToSelect = useTapToSelect;
const react_1 = require("react");
const hitTest_1 = require("../utils/hitTest");
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
        setHovered((_a = (0, hitTest_1.hitTest)(snapshot, pageX, pageY)[0]) !== null && _a !== void 0 ? _a : null);
    }, [snapshot]);
    const handleTap = (0, react_1.useCallback)((event) => {
        var _a;
        const { pageX, pageY } = event.nativeEvent;
        const matches = (0, hitTest_1.hitTest)(snapshot, pageX, pageY);
        setHovered(null);
        setState({ matches, selectedIndex: 0, selected: (_a = matches[0]) !== null && _a !== void 0 ? _a : null });
    }, [snapshot]);
    const cycleNext = (0, react_1.useCallback)(() => {
        setState((prev) => {
            var _a;
            if (prev.matches.length === 0)
                return prev;
            const next = (prev.selectedIndex + 1) % prev.matches.length;
            return { ...prev, selectedIndex: next, selected: (_a = prev.matches[next]) !== null && _a !== void 0 ? _a : null };
        });
    }, []);
    const cyclePrevious = (0, react_1.useCallback)(() => {
        setState((prev) => {
            var _a;
            if (prev.matches.length === 0)
                return prev;
            const prev_ = (prev.selectedIndex - 1 + prev.matches.length) % prev.matches.length;
            return { ...prev, selectedIndex: prev_, selected: (_a = prev.matches[prev_]) !== null && _a !== void 0 ? _a : null };
        });
    }, []);
    const clearSelection = (0, react_1.useCallback)(() => {
        setHovered(null);
        setState({ matches: [], selectedIndex: 0, selected: null });
    }, []);
    return { ...state, hovered, handleMove, handleTap, cycleNext, cyclePrevious, clearSelection };
}
//# sourceMappingURL=useTapToSelect.js.map