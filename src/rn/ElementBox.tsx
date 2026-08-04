/**
 * Ported from React Native's element inspector.
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of the React Native source tree:
 * packages/react-native/src/private/devsupport/devmenu/elementinspector/
 *   {ElementBox,BorderBox}.js
 *
 * Changes: ported to TypeScript, merged into one file.
 */
import React, { type ReactNode } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import type { InspectorFrame } from '../inspector/types';
import { resolveBoxStyle, type BoxEdges } from './boxStyle';

interface BorderBoxProps {
  children: ReactNode;
  box: BoxEdges | null;
  style?: object;
}

function BorderBox({ children, box, style }: BorderBoxProps) {
  if (!box) return <>{children}</>;

  return (
    <View
      style={[
        {
          borderTopWidth: box.top,
          borderBottomWidth: box.bottom,
          borderLeftWidth: box.left,
          borderRightWidth: box.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Percentages and `auto` cannot be drawn as-is: resolve or drop them. */
function resolveRelativeSizes(edges: BoxEdges): BoxEdges {
  const out = { ...edges } as Record<string, number | string>;
  const resolve = (direction: string, dimension: 'width' | 'height') => {
    const value = out[direction];
    if (typeof value !== 'string') return;
    if (value.includes('%')) {
      out[direction] = (parseFloat(value) / 100) * Dimensions.get('window')[dimension];
    }
    // `auto` is too complex to draw faithfully; treat it as zero.
    if (value === 'auto') out[direction] = 0;
  };

  resolve('top', 'height');
  resolve('right', 'width');
  resolve('bottom', 'height');
  resolve('left', 'width');
  return out as unknown as BoxEdges;
}

interface ElementBoxProps {
  frame: InspectorFrame;
  style?: unknown;
}

/** The blue/green/orange highlight: content, padding and margin. */
export function ElementBox({ frame, style }: ElementBoxProps) {
  const flat = (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
  let margin = resolveBoxStyle('margin', flat);
  let padding = resolveBoxStyle('padding', flat);

  const frameStyle = { ...frame };
  const contentStyle = { width: frame.width, height: frame.height };

  if (margin != null) {
    margin = resolveRelativeSizes(margin);

    frameStyle.top -= margin.top;
    frameStyle.left -= margin.left;
    frameStyle.height += margin.top + margin.bottom;
    frameStyle.width += margin.left + margin.right;

    if (margin.top < 0) contentStyle.height += margin.top;
    if (margin.bottom < 0) contentStyle.height += margin.bottom;
    if (margin.left < 0) contentStyle.width += margin.left;
    if (margin.right < 0) contentStyle.width += margin.right;
  }

  if (padding != null) {
    padding = resolveRelativeSizes(padding);
    contentStyle.width -= padding.left + padding.right;
    contentStyle.height -= padding.top + padding.bottom;
  }

  return (
    <View style={[styles.frame, frameStyle]} pointerEvents="none">
      <BorderBox box={margin} style={styles.margin}>
        <BorderBox box={padding} style={styles.padding}>
          <View style={[styles.content, contentStyle]} />
        </BorderBox>
      </BorderBox>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
  },
  content: {
    backgroundColor: 'rgba(200, 230, 255, 0.8)',
  },
  padding: {
    borderColor: 'rgba(77, 255, 0, 0.3)',
  },
  margin: {
    borderColor: 'rgba(255, 132, 0, 0.3)',
  },
});
