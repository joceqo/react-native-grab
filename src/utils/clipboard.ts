export async function copyToClipboard(text: string): Promise<void> {
  // expo-clipboard (Expo managed workflow)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoCb = require('expo-clipboard') as { setStringAsync: (s: string) => Promise<void> };
    await expoCb.setStringAsync(text);
    return;
  } catch {}

  // @react-native-clipboard/clipboard (bare RN / Expo bare)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnCb = require('@react-native-clipboard/clipboard') as {
      default: { setString: (s: string) => void };
    };
    rnCb.default.setString(text);
    return;
  } catch {}

  console.warn(
    '[react-native-grab] No clipboard module found.\n' +
      'Install expo-clipboard (Expo) or @react-native-clipboard/clipboard (bare RN).',
  );
}
