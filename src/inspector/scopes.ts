import type { MeasureOnSuccessCallback } from './getInspectorDataForViewAtPoint';

export interface ScopeView {
  measure: (callback: MeasureOnSuccessCallback) => void;
}

export interface InspectionScope {
  view: ScopeView | null;
  active: boolean;
  depth: number;
  parent?: InspectionScope | null;
}

/** Navigation keeps native screens mounted. Query the focused screen directly. */
export function createScopeRegistry() {
  const scopes = new Set<InspectionScope>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const isActive = (scope: InspectionScope): boolean =>
    scopes.has(scope) && scope.active && (!scope.parent || isActive(scope.parent));
  return {
    update(scope: InspectionScope, active: boolean) {
      scope.active = active;
      notify();
    },
    register(scope: InspectionScope) {
      scopes.add(scope);
      notify();
      return () => { scopes.delete(scope); notify(); };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async resolve(x: number, y: number) {
      const candidates = [...scopes].filter(isActive)
        .sort((a, b) => b.depth - a.depth);
      const measured = await Promise.all(candidates.map((scope) => new Promise<{
        view: ScopeView; x: number; y: number;
      } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 100);
        try {
          if (!scope.view) { clearTimeout(timer); resolve(null); return; }
          scope.view.measure((localX, localY, width, height, pageX, pageY) => {
            clearTimeout(timer);
            if (!scope.view || !isActive(scope) ||
                ![localX, localY, width, height, pageX, pageY].every(Number.isFinite) ||
                width <= 0 || height <= 0 || x < pageX || y < pageY ||
                x >= pageX + width || y >= pageY + height) {
              resolve(null);
              return;
            }
            // Fabric's findNodeAtPoint expects coordinates in the host's parent.
            resolve({ view: scope.view, x: x - pageX + localX, y: y - pageY + localY });
          });
        } catch { clearTimeout(timer); resolve(null); }
      })));
      return measured.find((value) => value !== null) ?? null;
    },
  };
}

export type ScopeRegistry = ReturnType<typeof createScopeRegistry>;
