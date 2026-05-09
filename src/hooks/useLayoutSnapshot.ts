import { useCallback, useRef, useState } from 'react';
import { FiberAdapter } from '../fiber/FiberAdapter';
import type { MeasuredElement } from '../fiber/types';
import { buildLayoutSnapshot } from '../utils/buildLayoutSnapshot';
import { useDebouncedCallback } from './useDebouncedCallback';

export function useLayoutSnapshot() {
  const [snapshot, setSnapshot] = useState<MeasuredElement[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const snapshotRef = useRef<MeasuredElement[]>([]);

  const buildSnapshot = useCallback(async (): Promise<number> => {
    const root = FiberAdapter.getFiberRoot();
    if (!root) return 0;

    setIsBuilding(true);
    try {
      const elements = await buildLayoutSnapshot(root);
      snapshotRef.current = elements;
      setSnapshot(elements);
      return elements.length;
    } finally {
      setIsBuilding(false);
    }
  }, []);

  const invalidate = useDebouncedCallback(buildSnapshot, 300);

  return { snapshot, isBuilding, buildSnapshot, invalidate };
}
