import { FiberAdapter } from '../fiber/FiberAdapter';
import type { FiberNode, MeasuredElement } from '../fiber/types';

export async function buildLayoutSnapshot(root: FiberNode): Promise<MeasuredElement[]> {
  const hostFibers = FiberAdapter.walkHostFibers(root);

  const settled = await Promise.allSettled(
    hostFibers.map(async ({ fiber, depth }) => {
      const rect = await FiberAdapter.measure(fiber);
      if (rect.width === 0 && rect.height === 0) return null;

      const style = FiberAdapter.getStyle(fiber);
      const zIndex = typeof style.zIndex === 'number' ? style.zIndex : 0;

      return {
        fiber,
        depth,
        zIndex,
        componentName: FiberAdapter.getComponentName(fiber),
        ...rect,
      } satisfies MeasuredElement;
    }),
  );

  const elements: MeasuredElement[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value !== null) {
      elements.push(result.value);
    }
  }

  // Sort by z-index desc, then depth desc so specific elements come first
  elements.sort((a, b) => b.zIndex - a.zIndex || b.depth - a.depth);

  return elements;
}
