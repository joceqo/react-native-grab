import React, { type ReactNode, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GrabHighlighter } from './GrabHighlighter';
import { GrabPanel } from './GrabPanel';
import { GrabTrigger, isPointInTrigger } from './GrabTrigger';
import { useLayoutSnapshot } from './hooks/useLayoutSnapshot';
import { useTapToSelect } from './hooks/useTapToSelect';

// On iOS with react-native-screens native-stack (the default for Expo Router / React
// Navigation on the New Architecture), each screen is a native container that a plain
// sibling <View> at the JS root cannot capture touches over. `FullWindowOverlay` renders
// into a true top-level native window that sits above every screen — the only place the
// tap layer reliably receives touches. It's optional: if react-native-screens isn't
// installed we fall back to a JS-root overlay (works on Android / old architecture).
let FullWindowOverlay: React.ComponentType<{ children?: ReactNode }> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FullWindowOverlay = require('react-native-screens').FullWindowOverlay ?? null;
} catch {
  FullWindowOverlay = null;
}

export interface GrabProps {
  /** Enable the inspector. Pass `__DEV__` so it tree-shakes in production. */
  enabled?: boolean;
  children: ReactNode;
}

export function Grab({ enabled = false, children }: GrabProps) {
  if (!enabled) return <>{children}</>;
  return <GrabInner>{children}</GrabInner>;
}

function GrabInner({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const { width, height } = useWindowDimensions();
  const { snapshot, buildSnapshot } = useLayoutSnapshot();
  const { selected, hovered, matches, selectedIndex, handleMoveAt, handleTapAt, selectParent, selectChild, clearSelection } =
    useTapToSelect(snapshot);
  // WYSIWYG: hit-test exactly under the finger (an above-finger offset was confusing — you
  // tapped a target and selected whatever sat above it). A floating label above the finger
  // shows what's under it (name + size), so you know your target even when your fingertip
  // covers a tiny element. Tolerance in the hit-test still catches near-misses on small ones.
  const [reticle, setReticle] = useState<{ x: number; y: number } | null>(null);

  const toggleActive = async () => {
    if (isActive) {
      setIsActive(false);
      setReticle(null);
      clearSelection();
    } else {
      await buildSnapshot();
      setIsActive(true);
    }
  };

  // Stacking uses zIndex (highlighter 2 < panel 10 < trigger 20) so the ring never draws
  // over the sheet and × exit stays on top. The tap overlay only captures WHILE nothing is
  // selected: inside FullWindowOverlay a full-screen responder wins the hit-test even over
  // higher-zIndex siblings, so leaving it up would swallow taps meant for the panel's Copy/×
  // buttons. Once an element is picked the panel is fully interactive; close (×) to pick again.
  const layer = (
    <>
      {isActive && !selected && (
        <View
          style={[StyleSheet.absoluteFill, styles.tapOverlay]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          // Rebuild the snapshot on every touch so it reflects the CURRENT screen. The
          // snapshot is first built when grab activates; without this, navigating afterwards
          // (e.g. opening a pushed conversation) leaves stale rects and taps land on the
          // previous screen's elements — like grabbing the tab bar while you're in chat.
          onResponderGrant={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            if (isPointInTrigger(pageX, pageY, width, height)) return;
            buildSnapshot();
            setReticle({ x: pageX, y: pageY });
            handleMoveAt(pageX, pageY);
          }}
          // Live preview: the ring + label follow the element directly under the finger.
          onResponderMove={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            if (isPointInTrigger(pageX, pageY, width, height)) return;
            setReticle({ x: pageX, y: pageY });
            handleMoveAt(pageX, pageY);
          }}
          onResponderRelease={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            setReticle(null);
            // The trigger can't win the hit-test under this overlay, so route taps in its
            // corner to exit instead of selecting whatever host view sits beneath it.
            if (isPointInTrigger(pageX, pageY, width, height)) {
              toggleActive();
              return;
            }
            handleTapAt(pageX, pageY);
          }}
          onResponderTerminate={() => setReticle(null)}
        />
      )}
      <GrabHighlighter element={isActive ? selected ?? hovered : null} />
      {isActive && !selected && reticle && hovered && (
        <View
          pointerEvents="none"
          style={[
            styles.label,
            { left: Math.max(6, Math.min(reticle.x - 80, width - 166)), top: Math.max(6, reticle.y - 48) },
          ]}
        >
          <Text numberOfLines={1} style={styles.labelText}>
            {hovered.componentName} · {Math.round(hovered.width)}×{Math.round(hovered.height)}
          </Text>
        </View>
      )}
      <GrabPanel
        element={selected}
        matchCount={matches.length}
        matchIndex={selectedIndex}
        onParent={selectParent}
        onChild={selectChild}
        onClose={clearSelection}
      />
      <GrabTrigger isActive={isActive} onToggle={toggleActive} />
    </>
  );

  const useNativeOverlay = FullWindowOverlay != null && Platform.OS === 'ios';
  const Overlay = FullWindowOverlay as React.ComponentType<{ children?: ReactNode }>;

  return (
    <View style={styles.root}>
      {children}
      {useNativeOverlay ? (
        <Overlay>
          {/* FullWindowOverlay has no Yoga size of its own, so absoluteFill inside it
              collapses. Give the child explicit window dimensions so the panel's bottom
              sheet, tap overlay and highlighter all resolve against a real frame. */}
          <View style={{ width, height }} pointerEvents="box-none">
            {layer}
          </View>
        </Overlay>
      ) : (
        layer
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tapOverlay: {
    zIndex: 1,
  },
  label: {
    position: 'absolute',
    maxWidth: 160,
    backgroundColor: '#111111',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 3,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
