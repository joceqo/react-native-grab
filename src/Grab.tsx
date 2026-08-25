import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { addDevMenuItem } from './devMenu';
import { GrabErrorBoundary } from './GrabErrorBoundary';
import { GrabTrigger } from './GrabTrigger';
import { useInspector, type Inspector } from './hooks/useInspector';
import type { GrabSelection } from './inspector/types';
import { InspectorOverlay } from './rn/InspectorOverlay';
import { InspectorPanel } from './rn/InspectorPanel';

export interface GrabProps {
  /** Enable the inspector. Pass `__DEV__` so it drops out of production. */
  enabled?: boolean;
  /**
   * How to enter inspection mode.
   *  - `devMenu` (default): an entry in the developer menu (⌘D / ⌘M / shake).
   *  - `button`: a floating button, always on screen.
   *  - `both`: either.
   */
  trigger?: 'devMenu' | 'button' | 'both';
  /** Label of the developer-menu entry. */
  devMenuLabel?: string;
  /**
   * What to do with the selection. Defaults to copying it to the clipboard.
   *
   * The clipboard is a fine destination when the agent runs on the same machine
   * as the app. It is a dead end when it does not — a phone inspecting itself, a
   * device on a desk, an agent living behind an API. Handing the serialized block
   * over lets the app decide where it goes: POST it, write it to a file, drop it
   * into a chat that already talks to the agent.
   *
   * Receives both the paste-ready text and the raw selection, so a caller
   * building its own payload does not have to serialize twice.
   */
  onGrab?: (text: string, selection: GrabSelection) => void | Promise<void>;
  /** Label of the panel's action button. Set it when `onGrab` changes its meaning. */
  grabLabel?: string;
  /** Confirmation shown for two seconds once the action resolves. */
  grabDoneLabel?: string;
  children: ReactNode;
}

export function Grab({
  enabled = false,
  trigger = 'devMenu',
  devMenuLabel = 'Inspect element (custom)',
  onGrab,
  grabLabel,
  grabDoneLabel,
  children,
}: GrabProps) {
  if (!enabled) return <>{children}</>;

  return (
    <GrabRoot
      trigger={trigger}
      devMenuLabel={devMenuLabel}
      onGrab={onGrab}
      grabLabel={grabLabel}
      grabDoneLabel={grabDoneLabel}
    >
      {children}
    </GrabRoot>
  );
}

/**
 * Mirrors React Native's own `AppContainer` + `Inspector` arrangement: the app
 * lives in a measured wrapper, and the inspector is an absolutely positioned
 * sibling. Because the hit test is scoped to the wrapper, the inspector can
 * never select itself — and because it is absolute, it adds nothing to the
 * app's layout.
 */
type GrabRootProps = Omit<GrabProps, 'enabled'> & Required<Pick<GrabProps, 'trigger' | 'devMenuLabel' | 'children'>>;

function GrabRoot({ trigger, devMenuLabel, onGrab, grabLabel, grabDoneLabel, children }: GrabRootProps) {
  const appRef = useRef<View | null>(null);
  const inspector = useInspector(appRef);
  const { toggle } = inspector;

  useEffect(() => {
    if (trigger === 'button') return;
    return addDevMenuItem(devMenuLabel, toggle);
  }, [trigger, devMenuLabel, toggle]);

  return (
    <View style={styles.root}>
      <View ref={appRef} style={styles.root} collapsable={false}>
        {children}
      </View>

      <GrabErrorBoundary fallback={null}>
        <GrabInspector inspector={inspector} onGrab={onGrab} grabLabel={grabLabel} grabDoneLabel={grabDoneLabel} />
      </GrabErrorBoundary>

      {trigger !== 'devMenu' && (
        <GrabErrorBoundary fallback={null}>
          <GrabTrigger isActive={inspector.active} onToggle={toggle} />
        </GrabErrorBoundary>
      )}
    </View>
  );
}

function GrabInspector({
  inspector,
  onGrab,
  grabLabel,
  grabDoneLabel,
}: { inspector: Inspector } & Pick<GrabProps, 'onGrab' | 'grabLabel' | 'grabDoneLabel'>) {
  const { active, selection, hoveredFrame, select, hover, deactivate, selectIndex } = inspector;
  // Keep the panel away from the finger, as React Native's inspector does.
  const [panelAtTop, setPanelAtTop] = useState(false);
  const { height } = useWindowDimensions();

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <InspectorOverlay
        selection={selection}
        hoveredFrame={hoveredFrame}
        onTouchPoint={(x, y) => {
          setPanelAtTop(y > height / 2);
          select(x, y);
        }}
        onMovePoint={hover}
      />

      {/* The panel brings its own safe area. */}
      <View style={[styles.panelContainer, panelAtTop ? styles.panelTop : styles.panelBottom]}>
        <InspectorPanel
          selection={selection}
          onSelectIndex={selectIndex}
          onClose={deactivate}
          onGrab={onGrab}
          grabLabel={grabLabel}
          grabDoneLabel={grabDoneLabel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  panelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  panelBottom: {
    bottom: 0,
  },
  panelTop: {
    top: 0,
  },
});
