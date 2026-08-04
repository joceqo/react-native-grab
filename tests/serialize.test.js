const test = require('node:test');
const assert = require('node:assert');

const { serializeForLLMCore } = require('../lib/serialize-core');

function selection(overrides = {}) {
  return {
    name: 'Pressable',
    frame: { left: 16, top: 320, width: 343, height: 48 },
    props: { accessibilityRole: 'button', disabled: false, onPress: () => {} },
    hierarchy: ['HomeScreen', 'Card', 'Pressable'],
    index: 2,
    stack: [
      { name: 'Pressable', fileName: 'src/Card.tsx', lineNumber: 42, columnNumber: 7 },
      { name: 'Card', fileName: 'src/Card.tsx', lineNumber: 12, columnNumber: 3 },
      { name: 'HomeScreen', fileName: null, lineNumber: null, columnNumber: null },
    ],
    source: { name: 'Pressable', fileName: 'src/Card.tsx', lineNumber: 42, columnNumber: 7 },
    raw: {},
    ...overrides,
  };
}

test('leads with the source location and the measured frame', () => {
  const out = serializeForLLMCore(selection()).split('\n');

  assert.strictEqual(out[0], '// src/Card.tsx:42');
  assert.strictEqual(out[1], '// 343×48 at (16, 320)');
});

test('renders props as JSX, skipping children and nullish values', () => {
  const out = serializeForLLMCore(
    selection({ props: { title: 'Save', count: 3, active: true, disabled: false, children: 'x', ref: null } }),
  );

  assert.match(out, /<Pressable\n/);
  assert.match(out, /^ {2}title="Save"$/m);
  assert.match(out, /^ {2}count=\{3\}$/m);
  assert.match(out, /^ {2}active$/m);
  assert.match(out, /^ {2}disabled=\{false\}$/m);
  assert.doesNotMatch(out, /children/);
  assert.doesNotMatch(out, /\bref\b/);
  assert.match(out, /\n\/>/);
});

test('self-closes on a single line when there are no props', () => {
  const out = serializeForLLMCore(selection({ props: {} }));
  assert.match(out, /^<Pressable \/>$/m);
});

test('marks functions instead of stringifying them', () => {
  const out = serializeForLLMCore(selection({ props: { onPress: () => {} } }));
  assert.match(out, /onPress=\{\[Function\]\}/);
});

test('flattens styles when a flatten function is provided', () => {
  const out = serializeForLLMCore(selection({ props: { style: [{ flex: 1 }, { padding: 8 }] } }), {
    flattenStyle: (s) => Object.assign({}, ...s),
  });
  assert.match(out, /style=\{\{"flex":1,"padding":8\}\}/);
});

test('keeps only the app frames and says how many were dropped', () => {
  const out = serializeForLLMCore(
    selection({
      stack: [
        { name: 'Pressable', fileName: 'src/Card.tsx', lineNumber: 42, columnNumber: 7 },
        { name: 'View', fileName: 'node_modules/react-native/View.js', lineNumber: 26, columnNumber: 0 },
        { name: 'Card', fileName: 'src/Card.tsx', lineNumber: 12, columnNumber: 3 },
        { name: 'HomeScreen', fileName: null, lineNumber: null, columnNumber: null },
      ],
    }),
  ).split('\n');

  assert.strictEqual(out[out.length - 3], 'in Pressable (at src/Card.tsx:42:7)');
  assert.strictEqual(out[out.length - 2], 'in Card (at src/Card.tsx:12:3)');
  assert.strictEqual(out[out.length - 1], '// … 2 library frames omitted');
});

test('falls back to the raw stack when nothing is app code', () => {
  const out = serializeForLLMCore(
    selection({
      stack: [
        { name: 'View', fileName: 'node_modules/react-native/View.js', lineNumber: 26, columnNumber: 0 },
      ],
    }),
  );

  assert.match(out, /in View \(at node_modules\/react-native\/View\.js:26:0\)/);
});

test('omits the source comment when the location is unknown', () => {
  const out = serializeForLLMCore(selection({ source: null }));
  assert.strictEqual(out.split('\n')[0], '// 343×48 at (16, 320)');
});

test('survives values that cannot be stringified', () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const out = serializeForLLMCore(selection({ props: { data: cyclic } }));
  assert.match(out, /data=\{/);
});
