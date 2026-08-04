/**
 * Ported from React Native's element inspector.
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of the React Native source tree:
 * packages/react-native/src/private/devsupport/devmenu/elementinspector/
 *   InspectorPanel.js
 *
 * Changes: ported to TypeScript; the Inspect/Touchables toggles are replaced
 * by what React Native does not offer — copying the selection for a coding
 * agent.
 */
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';
import type { GrabSelection } from '../inspector/types';
import { serializeForLLM } from '../serialize';
import { copyToClipboard } from '../utils/clipboard';
import { ElementProperties } from './ElementProperties';

interface InspectorPanelProps {
  selection: GrabSelection | null;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
}

export function InspectorPanel({ selection, onSelectIndex, onClose }: InspectorPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!selection) return;
    await copyToClipboard(serializeForLLM(selection));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selection]);

  return (
    <SafeAreaView style={styles.container}>
      {selection ? (
        <ScrollView style={styles.properties}>
          <ElementProperties selection={selection} onSelectIndex={onSelectIndex} />
        </ScrollView>
      ) : (
        <View style={styles.waiting}>
          <Text style={styles.waitingText}>Tap something to inspect it</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <PanelButton
          title={copied ? 'Copied!' : 'Copy for LLM'}
          highlighted={copied}
          disabled={!selection}
          onPress={handleCopy}
        />
        <PanelButton title="Done" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}

interface PanelButtonProps {
  title: string;
  onPress: () => void;
  highlighted?: boolean;
  disabled?: boolean;
}

function PanelButton({ title, onPress, highlighted, disabled }: PanelButtonProps) {
  return (
    <TouchableHighlight
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, highlighted && styles.buttonPressed, disabled && styles.buttonOff]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  properties: {
    height: 200,
  },
  waiting: {
    height: 100,
  },
  waitingText: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 20,
    color: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    margin: 2,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonOff: {
    opacity: 0.4,
  },
  buttonText: {
    textAlign: 'center',
    color: 'white',
    margin: 5,
  },
});
