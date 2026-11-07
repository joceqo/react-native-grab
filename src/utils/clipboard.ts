/**
 * Copy text, through whichever clipboard module the app installed.
 *
 * Throws when there is none. It used to warn and resolve, which made the
 * panel flash "Copied!" over a clipboard that had not changed — the one
 * outcome worse than a visible failure.
 */
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

  throw new Error(
    '[react-native-grab] no clipboard module found. ' +
      'Install expo-clipboard (Expo) or @react-native-clipboard/clipboard (bare RN), ' +
      'or pass `onGrab` to send the selection somewhere else.',
  );
}
