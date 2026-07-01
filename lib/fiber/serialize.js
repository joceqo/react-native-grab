"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeForLLM = serializeForLLM;
const react_native_1 = require("react-native");
const FiberAdapter_1 = require("./FiberAdapter");
function shortPath(fileName) {
    const parts = fileName.replace(/\\/g, '/').split('/');
    return parts.slice(-2).join('/');
}
function getComponentStack(fiber) {
    var _a, _b;
    const stack = [];
    const seen = new Set();
    let current = (_a = fiber._debugOwner) !== null && _a !== void 0 ? _a : fiber.return;
    while (current && !seen.has(current)) {
        seen.add(current);
        const name = FiberAdapter_1.FiberAdapter.getComponentName(current);
        if (name && name !== 'Unknown' && name !== 'Anonymous') {
            stack.push({ name, source: FiberAdapter_1.FiberAdapter.getSource(current) });
        }
        current = (_b = current._debugOwner) !== null && _b !== void 0 ? _b : current.return;
    }
    return stack;
}
function formatPropValue(value) {
    if (typeof value === 'function')
        return '[Function]';
    if (value === null || value === undefined)
        return String(value);
    if (typeof value === 'boolean')
        return String(value);
    if (typeof value === 'string')
        return `"${value}"`;
    if (typeof value === 'number')
        return String(value);
    try {
        const flat = react_native_1.StyleSheet.flatten(value);
        if (flat !== undefined) {
            const json = JSON.stringify(flat);
            return json.length > 80 ? json.slice(0, 77) + '...' : json;
        }
    }
    catch { }
    const json = JSON.stringify(value);
    return json.length > 80 ? json.slice(0, 77) + '...' : json;
}
function formatProps(props) {
    const lines = [];
    for (const [key, value] of Object.entries(props)) {
        if (key === 'children')
            continue;
        if (value === undefined || value === null)
            continue;
        if (typeof value === 'boolean') {
            lines.push(value ? `  ${key}` : `  ${key}={false}`);
        }
        else if (typeof value === 'string') {
            lines.push(`  ${key}="${value}"`);
        }
        else {
            lines.push(`  ${key}={${formatPropValue(value)}}`);
        }
    }
    return lines.join('\n');
}
// Visible text inside this element's subtree — the strongest identity signal when
// file:line is unavailable (React 19). Bounded so we never walk the whole tree.
function collectText(fiber) {
    const parts = [];
    (function walk(n) {
        if (!n || parts.join(' ').length > 160)
            return;
        const c = n.memoizedProps.children;
        if (typeof c === 'string' || typeof c === 'number') {
            const s = String(c);
            // Nested Text / CssInterop wrappers carry the same string on each layer — skip
            // consecutive repeats so "Log in" doesn't come out as "Log in Log in Log in".
            if (parts[parts.length - 1] !== s)
                parts.push(s);
        }
        walk(n.child);
        if (n !== fiber)
            walk(n.sibling);
    })(fiber);
    return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}
function serializeForLLM(element) {
    var _a;
    const { fiber, x, y, width, height } = element;
    const name = element.componentName;
    const source = FiberAdapter_1.FiberAdapter.getSource(fiber);
    const props = (_a = fiber.memoizedProps) !== null && _a !== void 0 ? _a : {};
    const stack = getComponentStack(fiber);
    const text = collectText(fiber);
    const rect = `@ (${Math.round(x)}, ${Math.round(y)}) ${Math.round(width)}×${Math.round(height)}`;
    const lines = [];
    lines.push('Element selected in the app via react-native-grab (paste to your AI):');
    lines.push('');
    if (source)
        lines.push(`// ${shortPath(source.fileName)}:${source.lineNumber}`);
    const formattedProps = formatProps(props);
    if (formattedProps) {
        lines.push(`<${name}  ${rect}`);
        lines.push(formattedProps);
        lines.push('/>');
    }
    else {
        lines.push(`<${name} />  ${rect}`);
    }
    if (text) {
        lines.push('');
        lines.push(`text: "${text}"`);
    }
    if (stack.length > 0) {
        lines.push('');
        lines.push('Component stack:');
        for (const { name: sName, source: sSource } of stack) {
            if (sSource) {
                lines.push(`  in ${sName} (${shortPath(sSource.fileName)}:${sSource.lineNumber})`);
            }
            else {
                lines.push(`  in ${sName}`);
            }
        }
    }
    if (!source) {
        lines.push('');
        lines.push('(source file:line unavailable on this React version — use component/text/rect above)');
    }
    return lines.join('\n');
}
//# sourceMappingURL=serialize.js.map