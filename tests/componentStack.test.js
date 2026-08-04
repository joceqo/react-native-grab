const test = require('node:test');
const assert = require('node:assert');

const {
  parseComponentStack,
  shortPath,
  formatStackFrame,
  findSourceFrame,
} = require('../lib/inspector/componentStack');

test('parses the "in Foo (at file:line:col)" shape', () => {
  const frames = parseComponentStack(
    '    in RCTView (at View.js:32)\n' +
      '    in View (at app/(tabs)/index.tsx:12:5)\n' +
      '    in HomeScreen\n',
  );

  assert.deepStrictEqual(frames, [
    { name: 'RCTView', fileName: 'View.js', lineNumber: 32, columnNumber: null },
    { name: 'View', fileName: 'app/(tabs)/index.tsx', lineNumber: 12, columnNumber: 5 },
    { name: 'HomeScreen', fileName: null, lineNumber: null, columnNumber: null },
  ]);
});

test('reads the location from the last parenthesis, not the first', () => {
  const frames = parseComponentStack(
    '    in Animated (at ScrollView) (http://192.168.1.41:8081/index.bundle//&dev=true:70179:29)',
  );

  assert.deepStrictEqual(frames, [
    {
      name: 'Animated',
      fileName: 'http://192.168.1.41:8081/index.bundle//&dev=true',
      lineNumber: 70179,
      columnNumber: 29,
    },
  ]);
});

test('parses the "at Foo (file:line:col)" shape', () => {
  const frames = parseComponentStack('    at Text (src/Title.tsx:8:3)');

  assert.deepStrictEqual(frames, [
    { name: 'Text', fileName: 'src/Title.tsx', lineNumber: 8, columnNumber: 3 },
  ]);
});

test('tolerates an empty or missing stack', () => {
  assert.deepStrictEqual(parseComponentStack(''), []);
  assert.deepStrictEqual(parseComponentStack(null), []);
  assert.deepStrictEqual(parseComponentStack(undefined), []);
});

test('shortPath keeps the last two segments', () => {
  assert.strictEqual(shortPath('/Users/x/proj/src/screens/Home.tsx'), 'screens/Home.tsx');
  assert.strictEqual(shortPath('Home.tsx'), 'Home.tsx');
  assert.strictEqual(shortPath('C:\\proj\\src\\Home.tsx'), 'src/Home.tsx');
});

test('formatStackFrame falls back when there is no location', () => {
  assert.strictEqual(
    formatStackFrame({ name: 'View', fileName: 'src/App.tsx', lineNumber: 4, columnNumber: 2 }),
    'in View (at src/App.tsx:4:2)',
  );
  assert.strictEqual(
    formatStackFrame({ name: 'View', fileName: null, lineNumber: null, columnNumber: null }),
    'in View',
  );
});

test('findSourceFrame skips dependencies in favour of app code', () => {
  const stack = [
    { name: 'View', fileName: 'node_modules/react-native/View.js', lineNumber: 26, columnNumber: 0 },
    { name: 'Card', fileName: 'src/Card.tsx', lineNumber: 20, columnNumber: 3 },
  ];

  assert.strictEqual(findSourceFrame(stack, ['Card', 'View'], 1).name, 'Card');
});

test('findSourceFrame prefers a name match over position', () => {
  const stack = [
    { name: 'RCTView', fileName: 'View.js', lineNumber: 1, columnNumber: null },
    { name: 'Card', fileName: 'src/Card.tsx', lineNumber: 20, columnNumber: 3 },
    { name: 'Screen', fileName: 'src/Screen.tsx', lineNumber: 5, columnNumber: 1 },
  ];
  const hierarchy = ['Screen', 'Card', 'RCTView'];

  assert.strictEqual(findSourceFrame(stack, hierarchy, 1).name, 'Card');
  assert.strictEqual(findSourceFrame(stack, hierarchy, 0).name, 'Screen');
});

test('findSourceFrame falls back to the innermost app frame', () => {
  const stack = [
    { name: 'A', fileName: 'a.tsx', lineNumber: 1, columnNumber: null },
    { name: 'B', fileName: 'b.tsx', lineNumber: 2, columnNumber: null },
  ];

  assert.strictEqual(findSourceFrame(stack, ['X', 'Y'], 0).name, 'A');
  assert.strictEqual(findSourceFrame(stack, [], 0).name, 'A');
});

test('findSourceFrame mirrors the index when only dependencies are left', () => {
  const stack = [
    { name: 'A', fileName: 'node_modules/a/a.js', lineNumber: 1, columnNumber: null },
    { name: 'B', fileName: 'node_modules/b/b.js', lineNumber: 2, columnNumber: null },
  ];

  assert.strictEqual(findSourceFrame(stack, ['X', 'Y'], 0).name, 'B');
});

test('findSourceFrame returns null on an empty stack', () => {
  assert.strictEqual(findSourceFrame([], ['A'], 0), null);
});
