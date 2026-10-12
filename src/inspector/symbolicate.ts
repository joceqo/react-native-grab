import { isBundleUrl } from './componentStack';
import type { StackFrame, Symbolication } from './types';

/**
 * React reports component locations as offsets into the Metro bundle
 * (`http://10.0.0.2:8081/index.bundle…:11134:3`), which is useless to a human
 * and to a coding agent alike. Metro can map those back to real source files
 * through its `/symbolicate` endpoint — the same one LogBox uses.
 */

/**
 * Generous on purpose. The first call of a session pays for Metro's exploded
 * source map — seconds on a large app, a minute on a cold cache — and the two
 * seconds this used to allow turned a working setup into a block of bundle
 * URLs roughly half the time. Nothing waits on this but the panel, and the
 * panel says so while it waits.
 */
const TIMEOUT_MS = 15000;
const FALLBACK_SERVER = 'http://localhost:8081/';

interface MetroFrame {
  file: string;
  methodName: string;
  lineNumber: number | null;
  column: number | null;
}

export interface SymbolicateResult {
  frames: StackFrame[];
  info: Symbolication;
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

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

/** Identifies one bundle offset, so the same one is never asked about twice. */
function keyOf(frame: StackFrame): string {
  return `${frame.fileName}|${frame.lineNumber}|${frame.columnNumber ?? 0}`;
}

/** Throws with a sentence worth showing, rather than returning null. */
async function post(server: string, frames: MetroFrame[]): Promise<MetroFrame[]> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${server}symbolicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack: frames }),
      signal: controller?.signal,
    });
  } catch (error) {
    throw new Error(
      controller?.signal.aborted
        ? `no answer from Metro at ${server} after ${Math.round(TIMEOUT_MS / 1000)}s`
        : `cannot reach Metro at ${server} (${messageOf(error)})`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Metro at ${server} answered HTTP ${response.status}`);
  }

  let json: { stack?: MetroFrame[] };
  try {
    json = (await response.json()) as { stack?: MetroFrame[] };
  } catch (error) {
    throw new Error(`Metro at ${server} answered something unreadable (${messageOf(error)})`);
  }

  if (!Array.isArray(json?.stack)) {
    throw new Error(`Metro at ${server} answered without a stack`);
  }

  return json.stack;
}

/**
 * Replace bundle offsets with real `file:line:column` locations.
 *
 * Frames that are not bundle offsets are left untouched, and any failure —
 * no Metro, offline, malformed answer — returns the frames unchanged *and*
 * says why in {@link SymbolicateResult.info}. A silent failure is what made
 * this worth rewriting: the copied block looked complete and located nothing.
 */
export async function symbolicateStack(frames: StackFrame[]): Promise<SymbolicateResult> {
  // One entry per distinct offset: a real stack repeats the same `View` line
  // dozens of times, and Metro should not be asked about it dozens of times.
  const order: string[] = [];
  const asked = new Map<string, MetroFrame>();

  for (const frame of frames) {
    if (!isBundleUrl(frame.fileName) || frame.lineNumber == null) continue;
    const key = keyOf(frame);
    if (asked.has(key)) continue;
    asked.set(key, {
      file: frame.fileName,
      methodName: frame.name,
      lineNumber: frame.lineNumber,
      column: frame.columnNumber ?? 0,
    });
    order.push(key);
  }

  if (asked.size === 0) {
    return { frames, info: { server: null, requested: 0, mapped: 0, error: null } };
  }

  const server = devServerUrl(frames);
  let resolved: MetroFrame[];
  try {
    resolved = await post(server, Array.from(asked.values()));
  } catch (error) {
    return {
      frames,
      info: { server, requested: asked.size, mapped: 0, error: messageOf(error) },
    };
  }

  if (resolved.length !== asked.size) {
    return {
      frames,
      info: {
        server,
        requested: asked.size,
        mapped: 0,
        error: `Metro answered ${resolved.length} frames for ${asked.size}`,
      },
    };
  }

  const located = new Map<string, Pick<StackFrame, 'fileName' | 'lineNumber' | 'columnNumber'>>();
  resolved.forEach((frame, n) => {
    // Metro echoes the bundle URL back, with a null line, for what it cannot map.
    if (!frame || typeof frame.file !== 'string') return;
    if (isBundleUrl(frame.file) || frame.lineNumber == null) return;
    located.set(order[n], {
      fileName: frame.file,
      lineNumber: frame.lineNumber,
      columnNumber: frame.column ?? null,
    });
  });

  const out = frames.map((frame) => {
    if (!isBundleUrl(frame.fileName) || frame.lineNumber == null) return frame;
    const hit = located.get(keyOf(frame));
    return hit ? { ...frame, ...hit } : frame;
  });

  return {
    frames: out,
    info: {
      server,
      requested: asked.size,
      mapped: located.size,
      error:
        located.size === 0
          ? `Metro at ${server} mapped none of the ${asked.size} bundle offsets — ` +
            'the running bundle is probably not the one it is serving (reload the app)'
          : null,
    },
  };
}
