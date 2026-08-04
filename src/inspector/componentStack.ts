import type { StackFrame } from './types';

// React emits several shapes:
//   "    in Foo (at app/index.tsx:12:5)"
//   "    at Foo (app/index.tsx:12:5)"
//   "    in Animated (at ScrollView) (http://host:8081/index.bundle…:70179:29)"
//   "    in RCTView"                       — host components carry no location
// So read the name from the start and the location from the *end*: the last
// parenthesised group is the only one that ever holds a file.
// Two passes, because a path may itself contain parentheses — Expo Router
// route groups such as `app/(tabs)/index.tsx`. The strict pass, which forbids
// them, correctly picks the trailing group of a double-parenthesis line; the
// loose pass then catches the paths the strict one had to reject.
const NAME = /^\s*(?:in|at)\s+([^\s(]+)/;
const LOCATION_STRICT = /\(\s*(?:at\s+)?([^()]+?):(\d+)(?::(\d+))?\)\s*$/;
const LOCATION_LOOSE = /\(\s*(?:at\s+)?(.+?):(\d+)(?::(\d+))?\)\s*$/;

/** Turn React's `componentStack` string into frames, innermost first. */
export function parseComponentStack(componentStack: string | null | undefined): StackFrame[] {
  if (!componentStack) return [];

  const frames: StackFrame[] = [];

  for (const raw of componentStack.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const name = NAME.exec(line);
    if (!name) continue;

    const location = LOCATION_STRICT.exec(line) ?? LOCATION_LOOSE.exec(line);
    frames.push({
      name: name[1],
      fileName: location ? location[1] : null,
      lineNumber: location ? Number(location[2]) : null,
      columnNumber: location?.[3] ? Number(location[3]) : null,
    });
  }

  return frames;
}

/** Keep the last two path segments — enough to recognise a file, short enough to read. */
export function shortPath(fileName: string): string {
  return fileName.replace(/\\/g, '/').split('/').slice(-2).join('/');
}

/**
 * `short` trims the path for on-screen display. Leave it off when the text is
 * headed for a coding agent — it can open a full path.
 */
export function formatStackFrame(frame: StackFrame, options: { short?: boolean } = {}): string {
  if (!frame.fileName) return `in ${frame.name}`;
  const file = options.short ? shortPath(frame.fileName) : frame.fileName;
  const column = frame.columnNumber ?? 1;
  return `in ${frame.name} (at ${file}:${frame.lineNumber ?? 0}:${column})`;
}

/**
 * A frame written by the app rather than by a dependency. Everything useful to
 * a developer — and to a coding agent — lives in these.
 */
export function isAppFrame(frame: StackFrame): boolean {
  return (
    frame.fileName != null &&
    !frame.fileName.includes('node_modules') &&
    !/^https?:\/\//.test(frame.fileName)
  );
}

export function appFrames(stack: StackFrame[]): StackFrame[] {
  return stack.filter(isAppFrame);
}

/**
 * Locate the stack frame describing `hierarchy[index]`.
 *
 * App code wins over dependencies: pointing at
 * `node_modules/react-native/.../View.js` is technically right and practically
 * useless. Within app frames, a name match wins over position — the hierarchy
 * runs root → leaf while the stack runs leaf → root, so the positional guess
 * is mirrored, and the two lists do not always hold the same host components.
 */
export function findSourceFrame(
  stack: StackFrame[],
  hierarchy: string[],
  index: number,
): StackFrame | null {
  if (stack.length === 0) return null;

  const name = hierarchy[index];
  const own = appFrames(stack);

  if (name) {
    const namedOwn = own.find((f) => f.name === name);
    if (namedOwn) return namedOwn;
  }
  if (own.length > 0) return own[0];

  if (name) {
    const named = stack.find((f) => f.name === name && f.fileName);
    if (named) return named;
  }

  const mirrored = stack[hierarchy.length - 1 - index];
  if (mirrored) return mirrored;

  return stack.find((f) => f.fileName) ?? stack[0];
}
