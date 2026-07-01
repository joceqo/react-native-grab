"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyToClipboard = copyToClipboard;
async function copyToClipboard(text) {
    // expo-clipboard (Expo managed workflow)
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const expoCb = require('expo-clipboard');
        await expoCb.setStringAsync(text);
        return;
    }
    catch { }
    // @react-native-clipboard/clipboard (bare RN / Expo bare)
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const rnCb = require('@react-native-clipboard/clipboard');
        rnCb.default.setString(text);
        return;
    }
    catch { }
    console.warn('[react-native-grab] No clipboard module found.\n' +
        'Install expo-clipboard (Expo) or @react-native-clipboard/clipboard (bare RN).');
}
//# sourceMappingURL=clipboard.js.map