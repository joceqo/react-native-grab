import { StyleSheet } from 'react-native';
import { HOST_COMPONENT_TAG } from './types';
import type { FiberNode, SourceLocation } from './types';

const MEASURE_TIMEOUT_MS = 200;

function getDevToolsHook(): Record<string, unknown> | null {
  return (globalThis as unknown as Record<string, unknown>)
    .__REACT_DEVTOOLS_GLOBAL_HOOK__ as Record<string, unknown> | null ?? null;
}

function getFiberRoot(): FiberNode | null {
  const hook = getDevToolsHook();
  if (!hook) return null;

  const renderers = hook.renderers as Map<number, unknown> | undefined;
  if (!renderers?.size) return null;

  for (const [id] of renderers) {
    try {
      const getFiberRoots = hook.getFiberRoots as ((id: number) => Set<{ current: FiberNode }>) | undefined;
      const roots = getFiberRoots?.(id);
      if (!roots) continue;
      for (const root of roots) {
        if (root.current) return root.current;
      }
    } catch {
      // renderer not ready
    }
  }
  return null;
}

function walkHostFibers(
  fiber: FiberNode | null,
  depth = 0,
  results: Array<{ fiber: FiberNode; depth: number }> = [],
): Array<{ fiber: FiberNode; depth: number }> {
  if (!fiber) return results;
  if (fiber.tag === HOST_COMPONENT_TAG) {
    results.push({ fiber, depth });
  }
  walkHostFibers(fiber.child, depth + 1, results);
  walkHostFibers(fiber.sibling, depth, results);
  return results;
}

function getComponentName(fiber: FiberNode): string {
  const { type } = fiber;
  if (!type) return 'Unknown';
  if (typeof type === 'string') {
    return type.replace(/^RCT/, '');
  }
  const fn = type as { displayName?: string; name?: string };
  return fn.displayName || fn.name || 'Anonymous';
}

// file:line recovery, adaptive across React versions:
//  - React < 19 (with @babel/plugin-transform-react-jsx-source): `fiber._debugSource`.
//  - Classic JSX runtime setups surface it as the `__source` prop instead.
//  - React 19 dropped `_debugSource` from the fiber entirely: neither is present, so we
//    return null and let serialize/panel fall back to name + text + rect + stack.
//    (Full file:line on React 19 needs a build-time Babel plugin — see README.)
function getSource(fiber: FiberNode): SourceLocation | null {
  if (fiber._debugSource) return fiber._debugSource;
  const fromProps = fiber.memoizedProps?.__source;
  if (fromProps && typeof fromProps.fileName === 'string') return fromProps;
  return null;
}

function getStyle(fiber: FiberNode): Record<string, unknown> {
  const style = (fiber.memoizedProps as { style?: unknown } | null)?.style;
  if (!style) return {};
  try {
    const flat = StyleSheet.flatten(style as Parameters<typeof StyleSheet.flatten>[0]);
    return (flat as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function measure(
  fiber: FiberNode,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const stateNode = fiber.stateNode as Record<string, unknown> | null;
    if (!stateNode) return reject(new Error('No stateNode'));

    const timer = setTimeout(
      () => reject(new Error('measure timeout')),
      MEASURE_TIMEOUT_MS,
    );

    const done = (
      _x: number,
      _y: number,
      width: number,
      height: number,
      pageX: number,
      pageY: number,
    ) => {
      clearTimeout(timer);
      resolve({ x: pageX, y: pageY, width, height });
    };

    type MeasureFn = (cb: typeof done) => void;

    // Old architecture
    if (typeof (stateNode as { measure?: unknown }).measure === 'function') {
      try {
        (stateNode as { measure: MeasureFn }).measure(done);
        return;
      } catch {}
    }

    // Fabric / New Architecture
    const canonical = (stateNode as { canonical?: { publicInstance?: { measure?: MeasureFn } } })
      .canonical;
    if (typeof canonical?.publicInstance?.measure === 'function') {
      try {
        canonical.publicInstance.measure(done);
        return;
      } catch {}
    }

    clearTimeout(timer);
    reject(new Error('Cannot measure'));
  });
}

export const FiberAdapter = {
  getFiberRoot,
  walkHostFibers,
  getComponentName,
  getSource,
  getStyle,
  measure,
};
