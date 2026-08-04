import type { StackFrame } from './types';

/**
 * React reports component locations as offsets into the Metro bundle
 * (`http://10.0.0.2:8081/index.bundle…:11134:3`), which is useless to a human
 * and to a coding agent alike. Metro can map those back to real source files
 * through its `/symbolicate` endpoint — the same one LogBox uses.
 */

const TIMEOUT_MS = 2000;
const FALLBACK_SERVER = 'http://localhost:8081/';

interface MetroFrame {
  file: string;
  methodName: string;
  lineNumber: number;
  column: number;
}

function isBundleUrl(fileName: string | null): fileName is string {
  return fileName != null && /^https?:\/\//.test(fileName);
}

/** Metro's origin, taken from any bundle URL React handed us. */
function devServerUrl(frames: StackFrame[]): string {
  for (const frame of frames) {
    if (isBundleUrl(frame.fileName)) {
      const match = frame.fileName.match(/^https?:\/\/.*?\//);
      if (match) return match[0];
    }
  }
  return FALLBACK_SERVER;
}

async function post(url: string, frames: MetroFrame[]): Promise<MetroFrame[] | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${url}symbolicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack: frames }),
      signal: controller?.signal,
    });
    const json = (await response.json()) as { stack?: MetroFrame[] };
    return Array.isArray(json?.stack) ? json.stack : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Replace bundle offsets with real `file:line:column` locations.
 *
 * Frames that are not bundle offsets are left untouched, and any failure —
 * no Metro, offline, malformed answer — returns the frames unchanged.
 */
export async function symbolicateStack(frames: StackFrame[]): Promise<StackFrame[]> {
  const indices: number[] = [];
  const payload: MetroFrame[] = [];

  frames.forEach((frame, i) => {
    if (!isBundleUrl(frame.fileName) || frame.lineNumber == null) return;
    indices.push(i);
    payload.push({
      file: frame.fileName,
      methodName: frame.name,
      lineNumber: frame.lineNumber,
      column: frame.columnNumber ?? 0,
    });
  });

  if (payload.length === 0) return frames;

  const resolved = await post(devServerUrl(frames), payload);
  if (!resolved || resolved.length !== payload.length) return frames;

  const out = frames.slice();
  resolved.forEach((frame, n) => {
    if (!frame || typeof frame.file !== 'string') return;
    // Metro answers with `null` file for frames it cannot map.
    if (isBundleUrl(frame.file)) return;

    const i = indices[n];
    out[i] = {
      ...out[i],
      fileName: frame.file,
      lineNumber: frame.lineNumber ?? out[i].lineNumber,
      columnNumber: frame.column ?? out[i].columnNumber,
    };
  });

  return out;
}
