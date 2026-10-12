import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  inspectAtPoint,
  isInspectorAvailable,
  selectHierarchyIndex,
  withRealSources,
} from '../inspector/inspect';
import type { GrabSelection, InspectorFrame } from '../inspector/types';
import type { ScopeRegistry } from '../inspector/scopes';

let warned = false;

function warnOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    '[react-native-grab] React did not expose an element inspector.\n' +
      'This only works in a development build (__DEV__).',
  );
}

export interface Inspector {
  active: boolean;
  selection: GrabSelection | null;
  hoveredFrame: InspectorFrame | null;
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  /** Select whatever sits under a point, in screen coordinates. */
  select: (x: number, y: number) => void;
  /** Preview what sits under a point without committing to it. */
  hover: (x: number, y: number) => void;
  selectIndex: (index: number) => void;
  /**
   * Resolve the current selection's source locations, if that has not already
   * happened or has failed. Call it right before reading the selection out —
   * copying it, posting it — so the result is never a block of bundle URLs
   * just because Metro was slow when the element was tapped.
   */
  ensureSources: () => Promise<GrabSelection | null>;
  selectParent: () => void;
  selectChild: () => void;
  clearSelection: () => void;
}

export function useInspector(inspectedViewRef: MutableRefObject<unknown>, scopes?: ScopeRegistry): Inspector {
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState<GrabSelection | null>(null);
  const [hoveredFrame, setHoveredFrame] = useState<InspectorFrame | null>(null);

  // One query in flight at a time: a drag would otherwise queue dozens.
  const hoverBusy = useRef(false);
  const generation = useRef(0);
  const selectionRef = useRef<GrabSelection | null>(null);
  selectionRef.current = selection;

  const clearSelection = useCallback(() => {
    generation.current += 1;
    selectionRef.current = null;
    setSelection(null);
    setHoveredFrame(null);
  }, []);

  useEffect(() => scopes?.subscribe(clearSelection), [scopes, clearSelection]);
  useEffect(() => () => { generation.current += 1; }, []);

  const inspect = useCallback(async (x: number, y: number) => {
    const scope = await scopes?.resolve(x, y);
    return scope
      ? inspectAtPoint(scope.x, scope.y, scope.view)
      : inspectAtPoint(x, y, inspectedViewRef.current);
  }, [scopes, inspectedViewRef]);

  const activate = useCallback(() => {
    if (!isInspectorAvailable()) {
      warnOnce();
      return;
    }
    clearSelection();
    setActive(true);
  }, [clearSelection]);

  const deactivate = useCallback(() => {
    setActive(false);
    clearSelection();
  }, [clearSelection]);

  const toggle = useCallback(() => {
    if (active) deactivate();
    else activate();
  }, [active, activate, deactivate]);

  /** Symbolicate in the background and upgrade the selection in place. */
  const refine = useCallback((base: GrabSelection, request: number) => {
    void withRealSources(base).then(
      (next) => {
        if (request !== generation.current) return;
        selectionRef.current = next;
        setSelection(next);
      },
      () => {},
    );
  }, []);

  const ensureSources = useCallback(async (): Promise<GrabSelection | null> => {
    const current = selectionRef.current;
    if (!current) return null;
    // Retry a failed attempt: Metro may have come back, and an explicit grab
    // is worth waiting for in a way a tap is not.
    if (current.symbolication && current.symbolication.error == null) return current;

    const request = generation.current;
    const next = await withRealSources(current);
    if (request === generation.current) {
      selectionRef.current = next;
      setSelection(next);
    }
    return next;
  }, []);

  const select = useCallback(
    (x: number, y: number) => {
      clearSelection();
      const request = generation.current;
      const view = inspectedViewRef.current;
      if (view == null) {
        console.warn(
          '[react-native-grab] no host view to inspect — the ref on the app wrapper is empty.',
        );
        return;
      }

      inspect(x, y).then(
        (next) => {
          if (request !== generation.current) return;
          if (next) {
            selectionRef.current = next;
            setSelection(next);
            setHoveredFrame(null);
            // The panel is already on screen; the files catch up when Metro answers.
            refine(next, request);
          } else {
            console.warn(`[react-native-grab] nothing found at (${x}, ${y}).`);
          }
        },
        (error) => console.warn('[react-native-grab] inspection failed:', error),
      );
    },
    [inspectedViewRef, inspect, clearSelection, refine],
  );

  const hover = useCallback(
    (x: number, y: number) => {
      if (hoverBusy.current) return;
      hoverBusy.current = true;
      const request = generation.current;
      void inspect(x, y).then((next) => {
        if (request === generation.current) setHoveredFrame(next ? next.frame : null);
      }, () => {
        if (request === generation.current) setHoveredFrame(null);
      }).finally(() => { hoverBusy.current = false; });
    },
    [inspect],
  );

  const selectIndex = useCallback((index: number) => {
    const current = selectionRef.current;
    if (!current) return;
    if (index < 0 || index >= current.hierarchy.length) return;
    const request = ++generation.current;
    void selectHierarchyIndex(current, index).then((next) => {
      if (request !== generation.current) return;
      if (next) {
        selectionRef.current = next;
        setSelection(next);
      }
    });
  }, []);

  const selectParent = useCallback(
    () => selectIndex((selectionRef.current?.index ?? 0) - 1),
    [selectIndex],
  );
  const selectChild = useCallback(
    () => selectIndex((selectionRef.current?.index ?? 0) + 1),
    [selectIndex],
  );

  return {
    active,
    selection,
    hoveredFrame,
    activate,
    deactivate,
    toggle,
    select,
    hover,
    selectIndex,
    ensureSources,
    selectParent,
    selectChild,
    clearSelection,
  };
}
