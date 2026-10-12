import type { InspectorFrame, RawInspectorData } from './getInspectorDataForViewAtPoint';

export type { InspectorFrame };

/** One `in Foo (at app/index.tsx:12:5)` entry of a component stack. */
export interface StackFrame {
  name: string;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
}

/**
 * What came back from asking Metro to turn bundle offsets into real files.
 *
 * Kept on the selection because a block of `index.bundle:549003` lines is
 * worse than no stack at all: it looks like a location and points nowhere.
 * Whoever reads the copied text — a human or an agent — has to be told.
 */
export interface Symbolication {
  /** Metro origin the request went to, `null` when none was needed. */
  server: string | null;
  /** Distinct bundle offsets that needed a real location. */
  requested: number;
  /** How many of them Metro mapped back to a source file. */
  mapped: number;
  /** Why nothing came back, in a sentence. `null` when all went well. */
  error: string | null;
}

/** Everything Grab knows about one inspected element. */
export interface GrabSelection {
  /** Component name, e.g. `Pressable`. */
  name: string;
  /** Measured position on screen, in dp. */
  frame: InspectorFrame;
  /** Props of the selected element. */
  props: Record<string, unknown>;
  /** Component names from the root down to the touched element. */
  hierarchy: string[];
  /** Index of {@link name} inside {@link hierarchy}. */
  index: number;
  /** Owner stack of the touched element, innermost first. */
  stack: StackFrame[];
  /** Best guess at where the selected element is written. */
  source: StackFrame | null;
  /** Outcome of the Metro round-trip. `null` until it has been attempted. */
  symbolication: Symbolication | null;
  /** @internal — kept so the hierarchy can be walked up and down. */
  raw: RawInspectorData;
}
