"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrabPanel = GrabPanel;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const FiberAdapter_1 = require("./fiber/FiberAdapter");
const serialize_1 = require("./fiber/serialize");
const clipboard_1 = require("./utils/clipboard");
function GrabPanel({ element, onClose }) {
    var _a;
    const { width, height } = (0, react_native_1.useWindowDimensions)();
    // Hidden offset = the sheet's own measured height, so it fully clears the bottom edge
    // regardless of content length (a fixed 400 left tall panels peeking — the sheet can be
    // up to 65% of the screen). Start hidden with a generous fallback until onLayout runs.
    const [sheetH, setSheetH] = (0, react_1.useState)(600);
    const translateY = (0, react_1.useRef)(new react_native_1.Animated.Value(600)).current;
    const [copied, setCopied] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        react_native_1.Animated.spring(translateY, {
            // +80 clears the home indicator + any measurement slack so nothing peeks when hidden.
            toValue: element ? 0 : sheetH + 80,
            // JS-driven on purpose: inside FullWindowOverlay (a separate native window) a
            // native-driven transform never reaches the shadow node, leaving the sheet stuck at
            // its initial off-screen value. JS driver updates the style each frame and works.
            useNativeDriver: false,
            tension: 65,
            friction: 11,
        }).start();
        if (!element)
            setCopied(false);
    }, [element, sheetH, translateY]);
    const handleCopy = (0, react_1.useCallback)(async () => {
        if (!element)
            return;
        await (0, clipboard_1.copyToClipboard)((0, serialize_1.serializeForLLM)(element));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [element]);
    const source = element ? FiberAdapter_1.FiberAdapter.getSource(element.fiber) : null;
    return (
    // box-none lets touches in the empty area above the panel pass to the tap overlay
    react_1.default.createElement(react_native_1.Animated.View, { style: [styles.container, { width, height }, { transform: [{ translateY }] }], pointerEvents: "box-none" },
        react_1.default.createElement(react_native_1.View, { style: styles.panel, onLayout: (e) => setSheetH(e.nativeEvent.layout.height) },
            react_1.default.createElement(react_native_1.View, { style: styles.handle }),
            react_1.default.createElement(react_native_1.View, { style: styles.header },
                react_1.default.createElement(react_native_1.View, { style: styles.headerMeta },
                    react_1.default.createElement(react_native_1.Text, { style: styles.componentName, numberOfLines: 1 }, (_a = element === null || element === void 0 ? void 0 : element.componentName) !== null && _a !== void 0 ? _a : ''),
                    source && (react_1.default.createElement(react_native_1.Text, { style: styles.sourcePath, numberOfLines: 1 },
                        shortPath(source.fileName),
                        ":",
                        source.lineNumber))),
                react_1.default.createElement(react_native_1.View, { style: styles.headerActions },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { style: [styles.copyBtn, copied && styles.copyBtnSuccess], onPress: handleCopy, activeOpacity: 0.8 },
                        react_1.default.createElement(react_native_1.Text, { style: styles.copyBtnText }, copied ? 'Copied!' : 'Copy')),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { style: styles.closeBtn, onPress: onClose, hitSlop: HIT_SLOP },
                        react_1.default.createElement(react_native_1.Text, { style: styles.closeBtnText }, "\u00D7")))),
            element && (react_1.default.createElement(react_native_1.ScrollView, { style: styles.scroll, contentContainerStyle: styles.scrollContent, showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: "handled" },
                react_1.default.createElement(PropsSection, { fiber: element.fiber }),
                react_1.default.createElement(StackSection, { fiber: element.fiber }))))));
}
function PropsSection({ fiber }) {
    var _a;
    const props = (_a = fiber.memoizedProps) !== null && _a !== void 0 ? _a : {};
    const entries = Object.entries(props).filter(([k, v]) => k !== 'children' && v !== undefined && v !== null);
    if (entries.length === 0)
        return null;
    return (react_1.default.createElement(react_native_1.View, { style: styles.section },
        react_1.default.createElement(react_native_1.Text, { style: styles.sectionTitle }, "Props"),
        entries.map(([key, value]) => (react_1.default.createElement(react_native_1.View, { key: key, style: styles.propRow },
            react_1.default.createElement(react_native_1.Text, { style: styles.propKey }, key),
            react_1.default.createElement(react_native_1.Text, { style: styles.propValue, numberOfLines: 2 }, formatValue(value)))))));
}
function StackSection({ fiber }) {
    const stack = getComponentStack(fiber);
    if (stack.length === 0)
        return null;
    return (react_1.default.createElement(react_native_1.View, { style: styles.section },
        react_1.default.createElement(react_native_1.Text, { style: styles.sectionTitle }, "Stack"),
        stack.map(({ name, source }, i) => (react_1.default.createElement(react_native_1.View, { key: i, style: styles.stackRow },
            react_1.default.createElement(react_native_1.Text, { style: styles.stackIn }, "in "),
            react_1.default.createElement(react_native_1.Text, { style: styles.stackName }, name),
            source && (react_1.default.createElement(react_native_1.Text, { style: styles.stackSource },
                '  ',
                shortPath(source.fileName),
                ":",
                source.lineNumber)))))));
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
function shortPath(fileName) {
    const parts = fileName.replace(/\\/g, '/').split('/');
    return parts.slice(-2).join('/');
}
function formatValue(value) {
    if (typeof value === 'function')
        return '[Function]';
    if (typeof value === 'boolean')
        return String(value);
    if (typeof value === 'string')
        return `"${value}"`;
    if (typeof value === 'number')
        return String(value);
    try {
        const json = JSON.stringify(value);
        return json.length > 60 ? json.slice(0, 57) + '...' : json;
    }
    catch {
        return String(value);
    }
}
const HIT_SLOP = { top: 12, right: 12, bottom: 12, left: 12 };
const styles = react_native_1.StyleSheet.create({
    container: {
        // top-anchored with an explicit width/height (set inline) + flex-end: bottom-anchoring
        // via `bottom: 0` does not resolve inside FullWindowOverlay's native window, so we lay
        // out a full-window box and push the sheet to its bottom edge instead.
        position: 'absolute',
        top: 0,
        left: 0,
        justifyContent: 'flex-end',
        zIndex: 10,
    },
    panel: {
        backgroundColor: '#111111',
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        maxHeight: '65%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#222222',
    },
    handle: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#333333',
        marginTop: 10,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e1e1e',
    },
    headerMeta: {
        flex: 1,
        marginRight: 12,
    },
    componentName: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    sourcePath: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    copyBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: '#3B82F6',
        borderRadius: 8,
    },
    copyBtnSuccess: {
        backgroundColor: '#22c55e',
    },
    copyBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
    },
    closeBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: {
        color: '#6b7280',
        fontSize: 22,
        lineHeight: 26,
        fontWeight: '300',
    },
    scroll: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    section: {
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    sectionTitle: {
        color: '#4b5563',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    propRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        borderBottomWidth: react_native_1.StyleSheet.hairlineWidth,
        borderBottomColor: '#1e1e1e',
    },
    propKey: {
        color: '#9ca3af',
        fontSize: 13,
        fontFamily: 'monospace',
        width: 110,
        flexShrink: 0,
    },
    propValue: {
        color: '#e5e7eb',
        fontSize: 13,
        fontFamily: 'monospace',
        flex: 1,
    },
    stackRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingVertical: 4,
    },
    stackIn: {
        color: '#4b5563',
        fontSize: 13,
        fontFamily: 'monospace',
    },
    stackName: {
        color: '#93c5fd',
        fontSize: 13,
        fontFamily: 'monospace',
        fontWeight: '600',
    },
    stackSource: {
        color: '#4b5563',
        fontSize: 12,
        fontFamily: 'monospace',
        alignSelf: 'center',
    },
});
//# sourceMappingURL=GrabPanel.js.map