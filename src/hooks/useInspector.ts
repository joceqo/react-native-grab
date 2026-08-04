import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { inspectAtPoint, isInspectorAvailable, selectHierarchyIndex } from '../inspector/inspect';
import type { GrabSelection, InspectorFrame } from '../inspector/types';

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
  selectParent: () => void;
  selectChild: () => void;
  clearSelection: () => void;
}

export function useInspector(inspectedViewRef: MutableRefObject<unknown>): Inspector {
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState<GrabSelection | null>(null);
  const [hoveredFrame, setHoveredFrame] = useState<InspectorFrame | null>(null);

  // One query in flight at a time: a drag would otherwise queue dozens.
  const hoverBusy = useRef(false);
  const selectionRef = useRef<GrabSelection | null>(null);
  selectionRef.current = selection;

  const clearSelection = useCallback(() => {
    setSelection(null);
    setHoveredFrame(null);
  }, []);

  const activate = useCallback(() => {
    if (!isInspectorAvailable()) {
      warnOnce();
      return;
    }
    setActive(true);
  }, []);

  const deactivate = useCallback(() => {
    setActive(false);
    setSelection(null);
    setHoveredFrame(null);
  }, []);

  const toggle = useCallback(() => {
    if (active) deactivate();
    else activate();
  }, [active, activate, deactivate]);

  const select = useCallback(
    (x: number, y: number) => {
      const view = inspectedViewRef.current;
      if (view == null) {
        console.warn(
          '[react-native-grab] no host view to inspect — the ref on the app wrapper is empty.',
        );
        return;
      }

      inspectAtPoint(x, y, view).then(
        (next) => {
          if (next) {
            setSelection(next);
            setHoveredFrame(null);
          } else {
            console.warn(`[react-native-grab] nothing found at (${x}, ${y}).`);
          }
        },
        (error) => console.warn('[react-native-grab] inspection failed:', error),
      );
    },
    [inspectedViewRef],
  );

  const hover = useCallback(
    (x: number, y: number) => {
      if (hoverBusy.current) return;
      hoverBusy.current = true;
      void inspectAtPoint(x, y, inspectedViewRef.current).then((next) => {
        hoverBusy.current = false;
        setHoveredFrame(next ? next.frame : null);
      });
    },
    [inspectedViewRef],
  );

  const selectIndex = useCallback((index: number) => {
    const current = selectionRef.current;
    if (!current) return;
    if (index < 0 || index >= current.hierarchy.length) return;

    void selectHierarchyIndex(current, index).then((next) => {
      if (next) setSelection(next);
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
    selectParent,
    selectChild,
    clearSelection,
  };
}
