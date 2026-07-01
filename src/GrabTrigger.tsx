import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface GrabTriggerProps {
  isActive: boolean;
  onToggle: () => void;
}

// Trigger geometry, also used by Grab to carve an "exit" hit-zone out of the tap overlay
// (a full-screen responder inside FullWindowOverlay wins the hit-test over the trigger, so
// the overlay routes taps in this corner to onToggle instead of selecting). Keep in sync
// with `styles.trigger` below.
export const TRIGGER_GEOMETRY = { bottom: 60, right: 20, width: 92, height: 34 };

/** True if a screen-space point falls in the trigger's bottom-right corner (with slop). */
export function isPointInTrigger(
  pageX: number,
  pageY: number,
  winWidth: number,
  winHeight: number,
): boolean {
  const slop = 16;
  const left = winWidth - TRIGGER_GEOMETRY.right - TRIGGER_GEOMETRY.width - slop;
  const top = winHeight - TRIGGER_GEOMETRY.bottom - TRIGGER_GEOMETRY.height - slop;
  const right = winWidth - TRIGGER_GEOMETRY.right + slop;
  const bottom = winHeight - TRIGGER_GEOMETRY.bottom + slop;
  return pageX >= left && pageX <= right && pageY >= top && pageY <= bottom;
}

export function GrabTrigger({ isActive, onToggle }: GrabTriggerProps) {
  return (
    <TouchableOpacity
      style={[styles.trigger, isActive && styles.triggerActive]}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <Text style={styles.label}>{isActive ? '× exit' : 'grab'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    zIndex: 20,
  },
  triggerActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  label: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
