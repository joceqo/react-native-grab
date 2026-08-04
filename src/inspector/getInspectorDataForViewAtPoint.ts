/**
 * Adapted from React Native's built-in element inspector.
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of the React Native source tree:
 * packages/react-native/src/private/devsupport/devmenu/elementinspector/
 *   getInspectorDataForViewAtPoint.js
 *
 * Changes from the original:
 *  - ported to TypeScript;
 *  - no `invariant`: returns `false` instead of throwing when the React
 *    DevTools hook or a renderer is missing, so importing this module can
 *    never crash an app;
 *  - renderers are resolved lazily on each call instead of at import time,
 *    so the module may be imported before React has injected itself.
 */

export interface InspectorFrame {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type MeasureOnSuccessCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageX: number,
  pageY: number,
) => void;

export type FindNodeHandle = (componentOrHandle: unknown) => number | null;

export interface RawHierarchyItem {
  name?: string | null;
  getInspectorData: (findNodeHandle: FindNodeHandle) => {
    measure: (callback: MeasureOnSuccessCallback) => void;
    props: Record<string, unknown>;
  };
}

/** What React hands back for a point on screen. */
export interface RawInspectorData {
  hierarchy: RawHierarchyItem[];
  selectedIndex?: number | null;
  props: Record<string, unknown>;
  componentStack: string;
  frame: InspectorFrame;
  pointerY?: number;
  touchedViewTag?: number;
  closestInstance?: unknown;
}

interface ReactRenderer {
  rendererConfig?: {
    getInspectorDataForViewAtPoint?: (
      inspectedView: unknown,
      locationX: number,
      locationY: number,
      callback: (viewData: RawInspectorData) => void,
    ) => void;
  };
}

interface DevToolsHook {
  renderers?: Map<number, ReactRenderer>;
  on?: (event: string, listener: (payload: { renderer: ReactRenderer }) => void) => void;
}

function getHook(): DevToolsHook | undefined {
  return (globalThis as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevToolsHook })
    .__REACT_DEVTOOLS_GLOBAL_HOOK__;
}

/** Renderers attached after the first call, reported by the hook. */
const lateRenderers: ReactRenderer[] = [];
let subscribed = false;

function getRenderers(): ReactRenderer[] {
  const hook = getHook();
  if (!hook || !hook.renderers) return [];

  if (!subscribed && typeof hook.on === 'function') {
    subscribed = true;
    hook.on('renderer', ({ renderer }) => lateRenderers.push(renderer));
  }

  return [...Array.from(hook.renderers.values()), ...lateRenderers];
}

/**
 * True when React exposes the inspector on at least one renderer. This is the
 * case in any development build — it does *not* require the React DevTools
 * backend to be connected.
 */
export function isInspectorAvailable(): boolean {
  return getRenderers().some((r) => r?.rendererConfig?.getInspectorDataForViewAtPoint != null);
}

/**
 * Ask every renderer what sits at (locationX, locationY).
 *
 * `inspectedView` scopes the search to a subtree — pass the host instance
 * wrapping your app so the inspector's own overlays are never selected.
 *
 * Returns `false` when no renderer could be queried at all. The callback may
 * be invoked asynchronously (it is, on Fabric).
 */
export function getInspectorDataForViewAtPoint(
  inspectedView: unknown,
  locationX: number,
  locationY: number,
  callback: (viewData: RawInspectorData) => boolean,
): boolean {
  const renderers = getRenderers();
  let queried = false;
  let shouldBreak = false;

  for (const renderer of renderers) {
    if (shouldBreak) break;

    const query = renderer?.rendererConfig?.getInspectorDataForViewAtPoint;
    if (query == null) continue;

    queried = true;
    try {
      query(inspectedView, locationX, locationY, (viewData) => {
        // Only one renderer owns the view, so ignore the empty answers.
        if (viewData && viewData.hierarchy && viewData.hierarchy.length > 0) {
          shouldBreak = callback(viewData);
        }
      });
    } catch (error) {
      // Fabric dereferences `inspectedView` without a null check, and any
      // unmounted host instance throws here. Never take the app down for it.
      if (__DEV__) {
        console.warn('[react-native-grab] inspector query failed:', error);
      }
    }
  }

  return queried;
}
