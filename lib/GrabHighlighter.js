"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrabHighlighter = GrabHighlighter;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
function GrabHighlighter({ element }) {
    if (!element)
        return null;
    const { x, y, width, height } = element;
    return (react_1.default.createElement(react_native_1.View, { pointerEvents: "none", style: [styles.outline, { left: x, top: y, width, height }] }));
}
const styles = react_native_1.StyleSheet.create({
    outline: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#3B82F6',
        borderRadius: 2,
        zIndex: 2,
    },
});
//# sourceMappingURL=GrabHighlighter.js.map