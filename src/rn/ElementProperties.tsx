/**
 * Ported from React Native's element inspector.
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of the React Native source tree:
 * packages/react-native/src/private/devsupport/devmenu/elementinspector/
 *   {ElementProperties,BoxInspector,StyleInspector}.js
 *
 * Changes: ported to TypeScript, merged into one file, and the source
 * location (`file:line`) added — React Native shows nothing of the sort.
 */
import React from 'react';
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { shortPath } from '../inspector/componentStack';
import type { GrabSelection, InspectorFrame } from '../inspector/types';
import { resolveBoxStyle, type BoxEdges } from './boxStyle';

const BLANK: BoxEdges = { top: 0, left: 0, right: 0, bottom: 0 };

function StyleInspector({ style }: { style: Record<string, unknown> | null }) {
  if (!style) return <Text style={styles.noStyle}>No style</Text>;

  const names = Object.keys(style);

  return (
    <View style={styles.styleContainer}>
      <View>
        {names.map((name) => (
          <Text key={name} style={styles.attr}>
            {name}:
          </Text>
        ))}
      </View>
      <View>
        {names.map((name) => {
          const value = style[name];
          return (
            <Text key={name} style={styles.value}>
              {typeof value !== 'string' && typeof value !== 'number'
                ? JSON.stringify(value)
                : value}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

interface BoxContainerProps {
  title: string;
  titleStyle?: object;
  box: BoxEdges;
  children: React.ReactNode;
}

function BoxContainer({ title, titleStyle, box, children }: BoxContainerProps) {
  return (
    <View style={styles.box}>
      <View style={styles.boxRow}>
        <Text style={[titleStyle, styles.boxLabel]}>{title}</Text>
        <Text style={styles.boxText}>{box.top}</Text>
      </View>
      <View style={styles.boxRow}>
        <Text style={styles.boxText}>{box.left}</Text>
        {children}
        <Text style={styles.boxText}>{box.right}</Text>
      </View>
      <Text style={styles.boxText}>{box.bottom}</Text>
    </View>
  );
}

function BoxInspector({
  style,
  frame,
}: {
  style: Record<string, unknown> | null;
  frame: InspectorFrame | null;
}) {
  const margin = (style && resolveBoxStyle('margin', style)) || BLANK;
  const padding = (style && resolveBoxStyle('padding', style)) || BLANK;

  return (
    <BoxContainer title="margin" titleStyle={styles.marginLabel} box={margin}>
      <BoxContainer title="padding" box={padding}>
        <View>
          <Text style={styles.innerText}>
            ({(frame?.left ?? 0).toFixed(1)}, {(frame?.top ?? 0).toFixed(1)})
          </Text>
          <Text style={styles.innerText}>
            {(frame?.width ?? 0).toFixed(1)} × {(frame?.height ?? 0).toFixed(1)}
          </Text>
        </View>
      </BoxContainer>
    </BoxContainer>
  );
}

interface ElementPropertiesProps {
  selection: GrabSelection;
  onSelectIndex: (index: number) => void;
}

export function ElementProperties({ selection, onSelectIndex }: ElementPropertiesProps) {
  const style = (StyleSheet.flatten(selection.props.style as never) ??
    null) as Record<string, unknown> | null;
  const source = selection.source;

  return (
    <View style={styles.info}>
      <View style={styles.breadcrumb}>
        {selection.hierarchy.map((name, i) => (
          <React.Fragment key={`item-${i}`}>
            {i > 0 && <Text style={styles.breadSep}>&#9656;</Text>}
            <TouchableHighlight
              style={[styles.breadItem, i === selection.index && styles.selected]}
              onPress={() => onSelectIndex(i)}
            >
              <Text style={styles.breadItemText}>{name}</Text>
            </TouchableHighlight>
          </React.Fragment>
        ))}
      </View>

      {source?.fileName && (
        <Text style={styles.source} numberOfLines={1}>
          {shortPath(source.fileName)}:{source.lineNumber ?? 0}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.col}>
          <StyleInspector style={style} />
        </View>
        <BoxInspector style={style} frame={selection.frame} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  info: {
    padding: 10,
  },
  breadcrumb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  breadSep: {
    fontSize: 8,
    color: 'white',
    alignSelf: 'center',
  },
  selected: {
    borderColor: 'white',
    borderRadius: 5,
  },
  breadItem: {
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 2,
  },
  breadItemText: {
    fontSize: 10,
    color: 'white',
    marginHorizontal: 5,
  },
  source: {
    fontSize: 11,
    color: '#93c5fd',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  styleContainer: {
    flexDirection: 'row',
  },
  attr: {
    fontSize: 10,
    color: '#ccc',
  },
  value: {
    fontSize: 10,
    color: 'white',
    marginLeft: 10,
  },
  noStyle: {
    color: 'white',
    fontSize: 10,
  },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  marginLabel: {
    width: 60,
  },
  boxLabel: {
    fontSize: 10,
    color: 'rgb(255,100,0)',
    marginLeft: 5,
    flex: 1,
    textAlign: 'left',
    top: -3,
  },
  innerText: {
    color: 'yellow',
    fontSize: 12,
    textAlign: 'center',
    width: 70,
  },
  box: {
    borderWidth: 1,
    borderColor: 'grey',
  },
  boxText: {
    color: 'white',
    fontSize: 12,
    marginHorizontal: 3,
    marginVertical: 2,
    textAlign: 'center',
  },
});
