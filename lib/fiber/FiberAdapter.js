"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiberAdapter = void 0;
const react_native_1 = require("react-native");
const types_1 = require("./types");
const MEASURE_TIMEOUT_MS = 200;
function getDevToolsHook() {
    var _a;
    return (_a = globalThis
        .__REACT_DEVTOOLS_GLOBAL_HOOK__) !== null && _a !== void 0 ? _a : null;
}
function getFiberRoot() {
    const hook = getDevToolsHook();
    if (!hook)
        return null;
    const renderers = hook.renderers;
    if (!(renderers === null || renderers === void 0 ? void 0 : renderers.size))
        return null;
    for (const [id] of renderers) {
        try {
            const getFiberRoots = hook.getFiberRoots;
            const roots = getFiberRoots === null || getFiberRoots === void 0 ? void 0 : getFiberRoots(id);
            if (!roots)
                continue;
            for (const root of roots) {
                if (root.current)
                    return root.current;
            }
        }
        catch {
            // renderer not ready
        }
    }
    return null;
}
function walkHostFibers(fiber, depth = 0, results = []) {
    if (!fiber)
        return results;
    if (fiber.tag === types_1.HOST_COMPONENT_TAG) {
        results.push({ fiber, depth });
    }
    walkHostFibers(fiber.child, depth + 1, results);
    walkHostFibers(fiber.sibling, depth, results);
    return results;
}
function getComponentName(fiber) {
    const { type } = fiber;
    if (!type)
        return 'Unknown';
    if (typeof type === 'string') {
        return type.replace(/^RCT/, '');
    }
    const fn = type;
    return fn.displayName || fn.name || 'Anonymous';
}
// file:line recovery, adaptive across React versions:
//  - React < 19 (with @babel/plugin-transform-react-jsx-source): `fiber._debugSource`.
//  - Classic JSX runtime setups surface it as the `__source` prop instead.
//  - React 19 dropped `_debugSource` from the fiber entirely: neither is present, so we
//    return null and let serialize/panel fall back to name + text + rect + stack.
//    (Full file:line on React 19 needs a build-time Babel plugin — see README.)
function getSource(fiber) {
    var _a;
    if (fiber._debugSource)
        return fiber._debugSource;
    const fromProps = (_a = fiber.memoizedProps) === null || _a === void 0 ? void 0 : _a.__source;
    if (fromProps && typeof fromProps.fileName === 'string')
        return fromProps;
    return null;
}
function getStyle(fiber) {
    var _a, _b;
    const style = (_a = fiber.memoizedProps) === null || _a === void 0 ? void 0 : _a.style;
    if (!style)
        return {};
    try {
        const flat = react_native_1.StyleSheet.flatten(style);
        return (_b = flat) !== null && _b !== void 0 ? _b : {};
    }
    catch {
        return {};
    }
}
function measure(fiber) {
    return new Promise((resolve, reject) => {
        var _a;
        const stateNode = fiber.stateNode;
        if (!stateNode)
            return reject(new Error('No stateNode'));
        const timer = setTimeout(() => reject(new Error('measure timeout')), MEASURE_TIMEOUT_MS);
        const done = (_x, _y, width, height, pageX, pageY) => {
            clearTimeout(timer);
            resolve({ x: pageX, y: pageY, width, height });
        };
        // Old architecture
        if (typeof stateNode.measure === 'function') {
            try {
                stateNode.measure(done);
                return;
            }
            catch { }
        }
        // Fabric / New Architecture
        const canonical = stateNode
            .canonical;
        if (typeof ((_a = canonical === null || canonical === void 0 ? void 0 : canonical.publicInstance) === null || _a === void 0 ? void 0 : _a.measure) === 'function') {
            try {
                canonical.publicInstance.measure(done);
                return;
            }
            catch { }
        }
        clearTimeout(timer);
        reject(new Error('Cannot measure'));
    });
}
exports.FiberAdapter = {
    getFiberRoot,
    walkHostFibers,
    getComponentName,
    getSource,
    getStyle,
    measure,
};
//# sourceMappingURL=FiberAdapter.js.map