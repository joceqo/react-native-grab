"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebouncedCallback = useDebouncedCallback;
const react_1 = require("react");
function useDebouncedCallback(fn, delay) {
    const timer = (0, react_1.useRef)(null);
    const fnRef = (0, react_1.useRef)(fn);
    fnRef.current = fn;
    (0, react_1.useEffect)(() => {
        return () => {
            if (timer.current !== null)
                clearTimeout(timer.current);
        };
    }, []);
    return (0, react_1.useCallback)((...args) => {
        if (timer.current !== null)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => fnRef.current(...args), delay);
    }, [delay]);
}
//# sourceMappingURL=useDebouncedCallback.js.map