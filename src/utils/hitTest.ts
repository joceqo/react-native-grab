import type { MeasuredElement } from '../fiber/types';

/**
 * Find every element under the tap, most-specific first.
 *
 * `tolerance` grows each element's hit rect by a few px so small targets (icons, send
 * buttons) still get selected when the finger lands a hair off. Large elements already
 * contain the tap, so tolerance only ever *adds* nearby small elements — and because we
 * sort smallest-area-first they stay on top of the list.
 */
export function hitTest(
  snapshot: MeasuredElement[],
  tapX: number,
  tapY: number,
  tolerance = 0,
): MeasuredElement[] {
  const matches: MeasuredElement[] = [];

  for (const element of snapshot) {
    const { x, y, width, height } = element;
    if (width === 0 || height === 0) continue;
    if (
      tapX >= x - tolerance &&
      tapX <= x + width + tolerance &&
      tapY >= y - tolerance &&
      tapY <= y + height + tolerance
    ) {
      matches.push(element);
    }
  }

  // Most specific first: smallest area, then deepest fiber on ties (nested equal-size
  // wrappers — e.g. a Pressable and the icon View inside it share the exact same rect).
  matches.sort(
    (a, b) => a.width * a.height - b.width * b.height || b.depth - a.depth,
  );

  return matches;
}
