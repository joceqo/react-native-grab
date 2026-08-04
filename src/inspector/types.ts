import type { InspectorFrame, RawInspectorData } from './getInspectorDataForViewAtPoint';

export type { InspectorFrame };

/** One `in Foo (at app/index.tsx:12:5)` entry of a component stack. */
export interface StackFrame {
  name: string;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
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
  /** @internal — kept so the hierarchy can be walked up and down. */
  raw: RawInspectorData;
}
