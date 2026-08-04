/**
 * Ported from React Native's element inspector.
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of the React Native source tree:
 * packages/react-native/src/private/devsupport/devmenu/elementinspector/
 *   InspectorOverlay.js
 *
 * Changes: ported to TypeScript, and a move reports through `onMovePoint` so
 * a drag can be previewed without paying for a full selection each frame.
 */
import React from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type { GrabSelection, InspectorFrame } from '../inspector/types';
import { ElementBox } from './ElementBox';

interface InspectorOverlayProps {
  selection: GrabSelection | null;
  hoveredFrame: InspectorFrame | null;
  onTouchPoint: (x: number, y: number) => void;
  onMovePoint: (x: number, y: number) => void;
}

export function InspectorOverlay({
  selection,
  hoveredFrame,
  onTouchPoint,
  onMovePoint,
}: InspectorOverlayProps) {
  const pointOf = (e: GestureResponderEvent) => {
    const touch = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
    return { x: touch.locationX, y: touch.locationY };
  };

  // React Native acts on touch *start* and returns true, so a plain tap is
  // enough — nothing waits for a release the responder system may terminate.
  const handleStartShouldSetResponder = (e: GestureResponderEvent): boolean => {
    const { x, y } = pointOf(e);
    onTouchPoint(x, y);
    return true;
  };

  const frame = selection?.frame ?? hoveredFrame;

  return (
    <View
      onStartShouldSetResponder={handleStartShouldSetResponder}
      onResponderMove={(e) => {
        const { x, y } = pointOf(e);
        onMovePoint(x, y);
      }}
      style={styles.inspector}
    >
      {frame && <ElementBox frame={frame} style={selection?.props.style} />}
    </View>
  );
}

const styles = StyleSheet.create({
  inspector: {
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
