import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface GrabTriggerProps {
  isActive: boolean;
  onToggle: () => void;
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
    zIndex: 9999,
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
