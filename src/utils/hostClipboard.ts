import { NativeModules } from 'react-native';
import type { GrabSelection } from '../inspector/types';
import { copyToClipboard } from './clipboard';

function metroOrigin(selection: GrabSelection): string | null {
  const sourceUrl = (NativeModules.SourceCode as { scriptURL?: string } | undefined)?.scriptURL;
  const candidates = [
    selection.symbolication?.server,
    ...selection.stack.map(frame => frame.fileName),
    sourceUrl,
  ];
  for (const candidate of candidates) {
    if (!candidate || !/^https?:\/\//.test(candidate)) continue;
    try {
      return new URL(candidate).origin;
    } catch { /* try the next candidate */ }
  }
  return null;
}

/** Copy on the device and on the Metro host when `withGrabMetro` is installed. */
export async function copyToHostClipboard(text: string, selection: GrabSelection): Promise<void> {
  await copyToClipboard(text);
  const origin = metroOrigin(selection);
  if (!origin) throw new Error('[react-native-grab] cannot find the Metro server for host clipboard');

  const response = await fetch(`${origin}/__react-native-grab/clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-React-Native-Grab': '1' },
    body: text,
  });
  if (!response.ok) {
    throw new Error(`[react-native-grab] host clipboard answered HTTP ${response.status}`);
  }
}
