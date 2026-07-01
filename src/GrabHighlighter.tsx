import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { MeasuredElement } from './fiber/types';

interface GrabHighlighterProps {
  element: MeasuredElement | null;
}

export function GrabHighlighter({ element }: GrabHighlighterProps) {
  if (!element) return null;
  const { x, y, width, height } = element;

  return (
    <View
      pointerEvents="none"
      style={[styles.outline, { left: x, top: y, width, height }]}
    />
  );
}

const styles = StyleSheet.create({
  outline: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 2,
    zIndex: 2,
  },
});
