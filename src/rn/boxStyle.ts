/**
 * Ported from React Native's element inspector.
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of the React Native source tree:
 * packages/react-native/src/private/devsupport/devmenu/elementinspector/
 *   resolveBoxStyle.js
 *
 * Changes: ported to TypeScript.
 */
import { I18nManager } from 'react-native';

export interface BoxEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

type Style = Record<string, unknown>;

function swapsInRTL(): boolean {
  const constants = I18nManager.getConstants();
  return Boolean(constants.isRTL && constants.doLeftAndRightSwapInRTL);
}

/**
 * Resolve a style property into its component parts.
 *
 *   resolveBoxStyle('margin', {margin: 5, marginBottom: 10})
 *   → {top: 5, right: 5, bottom: 10, left: 5}
 *
 * Returns null when no part of the property is set.
 */
export function resolveBoxStyle(prefix: string, style: Style): BoxEdges | null {
  let hasParts = false;
  const result: BoxEdges = { bottom: 0, left: 0, right: 0, top: 0 };

  const read = (key: string): number | null => {
    const value = style[prefix + key];
    return typeof value === 'number' || typeof value === 'string'
      ? (value as unknown as number)
      : null;
  };

  const all = style[prefix];
  if (all != null) {
    result.top = result.right = result.bottom = result.left = all as number;
    hasParts = true;
  }

  const horizontal = read('Horizontal');
  if (horizontal != null) {
    result.left = horizontal;
    result.right = horizontal;
    hasParts = true;
  } else {
    const left = read('Left');
    if (left != null) {
      result.left = left;
      hasParts = true;
    }

    const right = read('Right');
    if (right != null) {
      result.right = right;
      hasParts = true;
    }

    const end = read('End');
    if (end != null) {
      if (swapsInRTL()) result.left = end;
      else result.right = end;
      hasParts = true;
    }

    const start = read('Start');
    if (start != null) {
      if (swapsInRTL()) result.right = start;
      else result.left = start;
      hasParts = true;
    }
  }

  const vertical = read('Vertical');
  if (vertical != null) {
    result.top = vertical;
    result.bottom = vertical;
    hasParts = true;
  } else {
    const bottom = read('Bottom');
    if (bottom != null) {
      result.bottom = bottom;
      hasParts = true;
    }

    const top = read('Top');
    if (top != null) {
      result.top = top;
      hasParts = true;
    }
  }

  return hasParts ? result : null;
}
