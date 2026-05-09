import React, { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GrabHighlighter } from './GrabHighlighter';
import { GrabPanel } from './GrabPanel';
import { GrabTrigger } from './GrabTrigger';
import { useLayoutSnapshot } from './hooks/useLayoutSnapshot';
import { useTapToSelect } from './hooks/useTapToSelect';

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
  const { snapshot, buildSnapshot } = useLayoutSnapshot();
  const { selected, handleTap, cycleNext, cyclePrevious, clearSelection } =
    useTapToSelect(snapshot);

  const toggleActive = async () => {
    if (isActive) {
      setIsActive(false);
      clearSelection();
    } else {
      await buildSnapshot();
      setIsActive(true);
    }
  };

  return (
    <View style={styles.root}>
      {children}

      {/* Tap overlay — full screen transparent responder, below the panel */}
      {isActive && (
        <View
          style={styles.tapOverlay}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(event) => handleTap(event)}
        />
      )}

      <GrabHighlighter element={isActive ? selected : null} />

      <GrabPanel element={selected} onClose={clearSelection} />

      <GrabTrigger isActive={isActive} onToggle={toggleActive} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 9000,
  },
});
