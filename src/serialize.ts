import { StyleSheet } from 'react-native';
import type { GrabSelection } from './inspector/types';
import { serializeForLLMCore } from './serialize-core';

export function serializeForLLM(selection: GrabSelection): string {
  return serializeForLLMCore(selection, {
    flattenStyle: (s) => StyleSheet.flatten(s as Parameters<typeof StyleSheet.flatten>[0]),
  });
}
