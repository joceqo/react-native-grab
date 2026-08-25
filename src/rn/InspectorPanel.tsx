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
  /** Where the selection goes. Absent: the clipboard, exactly as before. */
  onGrab?: (text: string, selection: GrabSelection) => void | Promise<void>;
  grabLabel?: string;
  grabDoneLabel?: string;
}

export function InspectorPanel({
  selection,
  onSelectIndex,
  onClose,
  onGrab,
  grabLabel,
  grabDoneLabel,
}: InspectorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!selection) return;
    const text = serializeForLLM(selection);
    try {
      // The clipboard stays the default: an app that passes no `onGrab` behaves
      // exactly as it did, and nobody has to learn a prop to keep working.
      await (onGrab ? onGrab(text, selection) : copyToClipboard(text));
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // A custom destination fails in ways the clipboard never could: no network,
      // a server that refuses, a session that expired. Flashing "Copied!" over a
      // selection that went nowhere would be worse than the failure itself.
      console.warn('[react-native-grab] onGrab failed', error);
      setCopied(false);
      setFailed(true);
      setTimeout(() => setFailed(false), 2000);
    }
  }, [selection, onGrab]);

  const actionTitle = failed
    ? 'Failed'
    : copied
      ? (grabDoneLabel ?? (onGrab ? 'Sent!' : 'Copied!'))
      : (grabLabel ?? 'Copy for LLM');

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
          title={actionTitle}
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
