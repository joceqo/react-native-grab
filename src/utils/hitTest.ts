import type { MeasuredElement } from '../fiber/types';

export function hitTest(
  snapshot: MeasuredElement[],
  tapX: number,
  tapY: number,
): MeasuredElement[] {
  const matches: MeasuredElement[] = [];

  for (const element of snapshot) {
    const { x, y, width, height } = element;
    if (width === 0 || height === 0) continue;
    if (tapX >= x && tapX <= x + width && tapY >= y && tapY <= y + height) {
      matches.push(element);
    }
  }

  // Smallest area first = most specific element first
  matches.sort((a, b) => a.width * a.height - b.width * b.height);

  return matches;
}
