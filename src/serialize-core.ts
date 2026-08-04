import { appFrames, formatStackFrame } from './inspector/componentStack';
import type { GrabSelection } from './inspector/types';

export interface SerializeOptions {
  /**
   * Optional flatten function (typically `StyleSheet.flatten` from React
   * Native). When provided, it normalizes array-of-style props before
   * stringifying. When absent, values go straight to `JSON.stringify`.
   */
  flattenStyle?: (style: unknown) => unknown;
}

const MAX_VALUE_LENGTH = 80;
const MAX_STACK_FRAMES = 12;

function truncate(s: string): string {
  return s.length > MAX_VALUE_LENGTH ? s.slice(0, MAX_VALUE_LENGTH - 3) + '...' : s;
}

function formatPropValue(value: unknown, opts: SerializeOptions): string {
  if (typeof value === 'function') return '[Function]';
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);

  if (opts.flattenStyle) {
    try {
      const flat = opts.flattenStyle(value);
      if (flat !== undefined) return truncate(JSON.stringify(flat));
    } catch {}
  }

  try {
    return truncate(JSON.stringify(value));
  } catch {
    return truncate(String(value));
  }
}

/** Props worth showing: no children, no nullish, no React or internal plumbing. */
export function visibleProps(props: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(props).filter(
    ([key, value]) =>
      key !== 'children' &&
      key !== 'ref' &&
      key !== 'key' &&
      !key.startsWith('__') &&
      value !== undefined &&
      value !== null,
  );
}

function formatProps(props: Record<string, unknown>, opts: SerializeOptions): string {
  const lines: string[] = [];

  for (const [key, value] of visibleProps(props)) {
    if (typeof value === 'boolean') {
      lines.push(value ? `  ${key}` : `  ${key}={false}`);
    } else if (typeof value === 'string') {
      lines.push(`  ${key}="${value}"`);
    } else {
      lines.push(`  ${key}={${formatPropValue(value, opts)}}`);
    }
  }

  return lines.join('\n');
}

function formatFrame(frame: GrabSelection['frame']): string {
  const round = (n: number) => Math.round(n);
  return `${round(frame.width)}×${round(frame.height)} at (${round(frame.left)}, ${round(frame.top)})`;
}

/** Render one selection as a block meant to be pasted into a coding agent. */
export function serializeForLLMCore(
  selection: GrabSelection,
  opts: SerializeOptions = {},
): string {
  const { name, source, frame, props, stack } = selection;
  const lines: string[] = [];

  if (source?.fileName) {
    lines.push(`// ${source.fileName}:${source.lineNumber ?? 0}`);
  }
  lines.push(`// ${formatFrame(frame)}`);
  lines.push('');

  const formatted = formatProps(props, opts);
  if (formatted) {
    lines.push(`<${name}`, formatted, '/>');
  } else {
    lines.push(`<${name} />`);
  }

  // A real stack runs to 200+ frames, nearly all of them inside dependencies.
  // Keep the app's own frames — that is what anyone reading this can act on.
  const own = appFrames(stack);
  const shown = (own.length > 0 ? own : stack).slice(0, MAX_STACK_FRAMES);

  if (shown.length > 0) {
    lines.push('');
    for (const frameEntry of shown) {
      lines.push(formatStackFrame(frameEntry));
    }

    const omitted = stack.length - shown.length;
    if (omitted > 0) lines.push(`// … ${omitted} library frames omitted`);
  }

  return lines.join('\n');
}
