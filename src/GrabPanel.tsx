import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { FiberAdapter } from './fiber/FiberAdapter';
import { serializeForLLM } from './fiber/serialize';
import type { FiberNode, MeasuredElement } from './fiber/types';
import { copyToClipboard } from './utils/clipboard';

interface GrabPanelProps {
  element: MeasuredElement | null;
  onClose: () => void;
}

export function GrabPanel({ element, onClose }: GrabPanelProps) {
  const { width, height } = useWindowDimensions();
  // Hidden offset = the sheet's own measured height, so it fully clears the bottom edge
  // regardless of content length (a fixed 400 left tall panels peeking — the sheet can be
  // up to 65% of the screen). Start hidden with a generous fallback until onLayout runs.
  const [sheetH, setSheetH] = useState(600);
  const translateY = useRef(new Animated.Value(600)).current;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Animated.spring(translateY, {
      // +80 clears the home indicator + any measurement slack so nothing peeks when hidden.
      toValue: element ? 0 : sheetH + 80,
      // JS-driven on purpose: inside FullWindowOverlay (a separate native window) a
      // native-driven transform never reaches the shadow node, leaving the sheet stuck at
      // its initial off-screen value. JS driver updates the style each frame and works.
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
    if (!element) setCopied(false);
  }, [element, sheetH, translateY]);

  const handleCopy = useCallback(async () => {
    if (!element) return;
    await copyToClipboard(serializeForLLM(element));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [element]);

  const source = element ? FiberAdapter.getSource(element.fiber) : null;

  return (
    // box-none lets touches in the empty area above the panel pass to the tap overlay
    <Animated.View
      style={[styles.container, { width, height }, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <View
        style={styles.panel}
        onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
      >
        {/* Drag handle visual */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Text style={styles.componentName} numberOfLines={1}>
              {element?.componentName ?? ''}
            </Text>
            {source && (
              <Text style={styles.sourcePath} numberOfLines={1}>
                {shortPath(source.fileName)}:{source.lineNumber}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={HIT_SLOP}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable content */}
        {element && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <PropsSection fiber={element.fiber} />
            <StackSection fiber={element.fiber} />
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

function PropsSection({ fiber }: { fiber: FiberNode }) {
  const props = fiber.memoizedProps ?? {};
  const entries = Object.entries(props).filter(
    ([k, v]) => k !== 'children' && v !== undefined && v !== null,
  );

  if (entries.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Props</Text>
      {entries.map(([key, value]) => (
        <View key={key} style={styles.propRow}>
          <Text style={styles.propKey}>{key}</Text>
          <Text style={styles.propValue} numberOfLines={2}>
            {formatValue(value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StackSection({ fiber }: { fiber: FiberNode }) {
  const stack = getComponentStack(fiber);
  if (stack.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Stack</Text>
      {stack.map(({ name, source }, i) => (
        <View key={i} style={styles.stackRow}>
          <Text style={styles.stackIn}>in </Text>
          <Text style={styles.stackName}>{name}</Text>
          {source && (
            <Text style={styles.stackSource}>
              {'  '}
              {shortPath(source.fileName)}:{source.lineNumber}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function getComponentStack(
  fiber: FiberNode,
): Array<{ name: string; source: { fileName: string; lineNumber: number } | null }> {
  const stack: Array<{ name: string; source: ReturnType<typeof FiberAdapter.getSource> }> = [];
  const seen = new Set<FiberNode>();
  let current: FiberNode | null = fiber._debugOwner ?? fiber.return;

  while (current && !seen.has(current)) {
    seen.add(current);
    const name = FiberAdapter.getComponentName(current);
    if (name && name !== 'Unknown' && name !== 'Anonymous') {
      stack.push({ name, source: FiberAdapter.getSource(current) });
    }
    current = current._debugOwner ?? current.return;
  }

  return stack;
}

function shortPath(fileName: string): string {
  const parts = fileName.replace(/\\/g, '/').split('/');
  return parts.slice(-2).join('/');
}

function formatValue(value: unknown): string {
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  try {
    const json = JSON.stringify(value);
    return json.length > 60 ? json.slice(0, 57) + '...' : json;
  } catch {
    return String(value);
  }
}

const HIT_SLOP = { top: 12, right: 12, bottom: 12, left: 12 };

const styles = StyleSheet.create({
  container: {
    // top-anchored with an explicit width/height (set inline) + flex-end: bottom-anchoring
    // via `bottom: 0` does not resolve inside FullWindowOverlay's native window, so we lay
    // out a full-window box and push the sheet to its bottom edge instead.
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  panel: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: '65%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#222222',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerMeta: {
    flex: 1,
    marginRight: 12,
  },
  componentName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sourcePath: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  copyBtnSuccess: {
    backgroundColor: '#22c55e',
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#6b7280',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '300',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionTitle: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  propRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
  },
  propKey: {
    color: '#9ca3af',
    fontSize: 13,
    fontFamily: 'monospace',
    width: 110,
    flexShrink: 0,
  },
  propValue: {
    color: '#e5e7eb',
    fontSize: 13,
    fontFamily: 'monospace',
    flex: 1,
  },
  stackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  stackIn: {
    color: '#4b5563',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  stackName: {
    color: '#93c5fd',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  stackSource: {
    color: '#4b5563',
    fontSize: 12,
    fontFamily: 'monospace',
    alignSelf: 'center',
  },
});
