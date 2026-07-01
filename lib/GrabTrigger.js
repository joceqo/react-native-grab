"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIGGER_GEOMETRY = void 0;
exports.isPointInTrigger = isPointInTrigger;
exports.GrabTrigger = GrabTrigger;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
// Trigger geometry, also used by Grab to carve an "exit" hit-zone out of the tap overlay
// (a full-screen responder inside FullWindowOverlay wins the hit-test over the trigger, so
// the overlay routes taps in this corner to onToggle instead of selecting). Keep in sync
// with `styles.trigger` below.
exports.TRIGGER_GEOMETRY = { bottom: 60, right: 20, width: 92, height: 34 };
/** True if a screen-space point falls in the trigger's bottom-right corner (with slop). */
function isPointInTrigger(pageX, pageY, winWidth, winHeight) {
    const slop = 16;
    const left = winWidth - exports.TRIGGER_GEOMETRY.right - exports.TRIGGER_GEOMETRY.width - slop;
    const top = winHeight - exports.TRIGGER_GEOMETRY.bottom - exports.TRIGGER_GEOMETRY.height - slop;
    const right = winWidth - exports.TRIGGER_GEOMETRY.right + slop;
    const bottom = winHeight - exports.TRIGGER_GEOMETRY.bottom + slop;
    return pageX >= left && pageX <= right && pageY >= top && pageY <= bottom;
}
function GrabTrigger({ isActive, onToggle }) {
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { style: [styles.trigger, isActive && styles.triggerActive], onPress: onToggle, activeOpacity: 0.85 },
        react_1.default.createElement(react_native_1.Text, { style: styles.label }, isActive ? '× exit' : 'grab')));
}
const styles = react_native_1.StyleSheet.create({
    trigger: {
        position: 'absolute',
        bottom: 60,
        right: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#111111',
        borderWidth: 1,
        borderColor: '#333333',
        zIndex: 20,
    },
    triggerActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    label: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});
//# sourceMappingURL=GrabTrigger.js.map