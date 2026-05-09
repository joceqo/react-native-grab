import { StyleSheet } from 'react-native';
import { FiberAdapter } from './FiberAdapter';
import type { FiberNode, MeasuredElement } from './types';

function shortPath(fileName: string): string {
  const parts = fileName.replace(/\\/g, '/').split('/');
  return parts.slice(-2).join('/');
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

function formatPropValue(value: unknown): string {
  if (typeof value === 'function') return '[Function]';
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);

  try {
    const flat = StyleSheet.flatten(value as Parameters<typeof StyleSheet.flatten>[0]);
    if (flat !== undefined) {
      const json = JSON.stringify(flat);
      return json.length > 80 ? json.slice(0, 77) + '...' : json;
    }
  } catch {}

  const json = JSON.stringify(value);
  return json.length > 80 ? json.slice(0, 77) + '...' : json;
}

function formatProps(props: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') continue;
    if (value === undefined || value === null) continue;

    if (typeof value === 'boolean') {
      lines.push(value ? `  ${key}` : `  ${key}={false}`);
    } else if (typeof value === 'string') {
      lines.push(`  ${key}="${value}"`);
    } else {
      lines.push(`  ${key}={${formatPropValue(value)}}`);
    }
  }

  return lines.join('\n');
}

export function serializeForLLM(element: MeasuredElement): string {
  const { fiber } = element;
  const name = element.componentName;
  const source = FiberAdapter.getSource(fiber);
  const props = fiber.memoizedProps;
  const stack = getComponentStack(fiber);
  const lines: string[] = [];

  if (source) {
    lines.push(`// ${shortPath(source.fileName)}:${source.lineNumber}`);
    lines.push('');
  }

  const formattedProps = formatProps(props);
  if (formattedProps) {
    lines.push(`<${name}`);
    lines.push(formattedProps);
    lines.push('/>');
  } else {
    lines.push(`<${name} />`);
  }

  if (stack.length > 0) {
    lines.push('');
    lines.push('Component stack:');
    for (const { name: sName, source: sSource } of stack) {
      if (sSource) {
        lines.push(`  in ${sName} (${shortPath(sSource.fileName)}:${sSource.lineNumber})`);
      } else {
        lines.push(`  in ${sName}`);
      }
    }
  }

  return lines.join('\n');
}
