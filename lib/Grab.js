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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grab = Grab;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const GrabHighlighter_1 = require("./GrabHighlighter");
const GrabPanel_1 = require("./GrabPanel");
const GrabTrigger_1 = require("./GrabTrigger");
const useLayoutSnapshot_1 = require("./hooks/useLayoutSnapshot");
const useTapToSelect_1 = require("./hooks/useTapToSelect");
// On iOS with react-native-screens native-stack (the default for Expo Router / React
// Navigation on the New Architecture), each screen is a native container that a plain
// sibling <View> at the JS root cannot capture touches over. `FullWindowOverlay` renders
// into a true top-level native window that sits above every screen — the only place the
// tap layer reliably receives touches. It's optional: if react-native-screens isn't
// installed we fall back to a JS-root overlay (works on Android / old architecture).
let FullWindowOverlay = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    FullWindowOverlay = (_a = require('react-native-screens').FullWindowOverlay) !== null && _a !== void 0 ? _a : null;
}
catch {
    FullWindowOverlay = null;
}
function Grab({ enabled = false, children }) {
    if (!enabled)
        return react_1.default.createElement(react_1.default.Fragment, null, children);
    return react_1.default.createElement(GrabInner, null, children);
}
function GrabInner({ children }) {
    const [isActive, setIsActive] = (0, react_1.useState)(false);
    const { width, height } = (0, react_native_1.useWindowDimensions)();
    const { snapshot, buildSnapshot } = (0, useLayoutSnapshot_1.useLayoutSnapshot)();
    const { selected, hovered, matches, selectedIndex, handleMoveAt, handleTapAt, selectParent, selectChild, clearSelection } = (0, useTapToSelect_1.useTapToSelect)(snapshot);
    // The finger obscures small targets, so we hit-test at a reticle placed above the touch
    // point (like an iOS loupe). You aim the visible crosshair, not your fingertip — this is
    // what makes tiny elements (icons, 11px dots) pointable, react-grab-style.
    const RETICLE_OFFSET_Y = 44;
    const [reticle, setReticle] = (0, react_1.useState)(null);
    const aim = (pageX, pageY) => ({
        x: pageX,
        y: Math.max(6, Math.min(pageY - RETICLE_OFFSET_Y, height - 6)),
    });
    const toggleActive = async () => {
        if (isActive) {
            setIsActive(false);
            setReticle(null);
            clearSelection();
        }
        else {
            await buildSnapshot();
            setIsActive(true);
        }
    };
    // Stacking uses zIndex (highlighter 2 < panel 10 < trigger 20) so the ring never draws
    // over the sheet and × exit stays on top. The tap overlay only captures WHILE nothing is
    // selected: inside FullWindowOverlay a full-screen responder wins the hit-test even over
    // higher-zIndex siblings, so leaving it up would swallow taps meant for the panel's Copy/×
    // buttons. Once an element is picked the panel is fully interactive; close (×) to pick again.
    const layer = (react_1.default.createElement(react_1.default.Fragment, null,
        isActive && !selected && (react_1.default.createElement(react_native_1.View, { style: [react_native_1.StyleSheet.absoluteFill, styles.tapOverlay], onStartShouldSetResponder: () => true, onMoveShouldSetResponder: () => true, 
            // Rebuild the snapshot on every touch so it reflects the CURRENT screen. The
            // snapshot is first built when grab activates; without this, navigating afterwards
            // (e.g. opening a pushed conversation) leaves stale rects and taps land on the
            // previous screen's elements — like grabbing the tab bar while you're in chat.
            onResponderGrant: (e) => {
                const { pageX, pageY } = e.nativeEvent;
                if ((0, GrabTrigger_1.isPointInTrigger)(pageX, pageY, width, height))
                    return;
                buildSnapshot();
                const p = aim(pageX, pageY);
                setReticle(p);
                handleMoveAt(p.x, p.y);
            }, 
            // Live preview: the ring follows the element under the reticle (above the finger).
            onResponderMove: (e) => {
                const { pageX, pageY } = e.nativeEvent;
                if ((0, GrabTrigger_1.isPointInTrigger)(pageX, pageY, width, height))
                    return;
                const p = aim(pageX, pageY);
                setReticle(p);
                handleMoveAt(p.x, p.y);
            }, onResponderRelease: (e) => {
                const { pageX, pageY } = e.nativeEvent;
                setReticle(null);
                // The trigger can't win the hit-test under this overlay, so route taps in its
                // corner to exit instead of selecting whatever host view sits beneath it.
                if ((0, GrabTrigger_1.isPointInTrigger)(pageX, pageY, width, height)) {
                    toggleActive();
                    return;
                }
                const p = aim(pageX, pageY);
                handleTapAt(p.x, p.y);
            }, onResponderTerminate: () => setReticle(null) })),
        react_1.default.createElement(GrabHighlighter_1.GrabHighlighter, { element: isActive ? selected !== null && selected !== void 0 ? selected : hovered : null }),
        isActive && !selected && reticle && (react_1.default.createElement(react_native_1.View, { pointerEvents: "none", style: [styles.reticle, { left: reticle.x - 16, top: reticle.y - 16 }] },
            react_1.default.createElement(react_native_1.View, { style: styles.reticleDot }))),
        react_1.default.createElement(GrabPanel_1.GrabPanel, { element: selected, matchCount: matches.length, matchIndex: selectedIndex, onParent: selectParent, onChild: selectChild, onClose: clearSelection }),
        react_1.default.createElement(GrabTrigger_1.GrabTrigger, { isActive: isActive, onToggle: toggleActive })));
    const useNativeOverlay = FullWindowOverlay != null && react_native_1.Platform.OS === 'ios';
    const Overlay = FullWindowOverlay;
    return (react_1.default.createElement(react_native_1.View, { style: styles.root },
        children,
        useNativeOverlay ? (react_1.default.createElement(Overlay, null,
            react_1.default.createElement(react_native_1.View, { style: { width, height }, pointerEvents: "box-none" }, layer))) : (layer)));
}
const styles = react_native_1.StyleSheet.create({
    root: {
        flex: 1,
    },
    tapOverlay: {
        zIndex: 1,
    },
    reticle: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    reticleDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3B82F6',
    },
});
//# sourceMappingURL=Grab.js.map