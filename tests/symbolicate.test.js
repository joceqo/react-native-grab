const test = require('node:test');
const assert = require('node:assert/strict');

const { symbolicateStack } = require('../lib/inspector/symbolicate');

const BUNDLE =
  'http://127.0.0.1:8082/index.ts.bundle//&platform=ios&dev=true&transform.engine=hermes';

const frame = (name, lineNumber, columnNumber = 3) => ({
  name,
  fileName: BUNDLE,
  lineNumber,
  columnNumber,
});

function withFetch(impl, run) {
  const original = global.fetch;
  global.fetch = impl;
  return run().finally(() => { global.fetch = original; });
}

const answer = stack => async () => ({
  ok: true,
  status: 200,
  json: async () => ({ stack }),
});

test('maps bundle offsets onto the files Metro reports', async () => {
  const calls = [];
  const result = await withFetch(
    async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          stack: [
            { file: '/app/src/Card.tsx', methodName: 'Card', lineNumber: 42, column: 7 },
          ],
        }),
      };
    },
    () => symbolicateStack([frame('Card', 549003, 37)]),
  );

  assert.equal(calls[0].url, 'http://127.0.0.1:8082/symbolicate');
  assert.deepEqual(result.frames[0], {
    name: 'Card',
    fileName: '/app/src/Card.tsx',
    lineNumber: 42,
    columnNumber: 7,
  });
  assert.deepEqual(result.info, {
    server: 'http://127.0.0.1:8082/',
    requested: 1,
    mapped: 1,
    error: null,
  });
});

test('asks Metro once per distinct offset, and applies the answer to every copy', async () => {
  let asked;
  const result = await withFetch(
    async (_url, init) => {
      asked = JSON.parse(init.body).stack;
      return (await answer([
        { file: '/app/View.js', methodName: 'View', lineNumber: 1, column: 0 },
        { file: '/app/Card.tsx', methodName: 'Card', lineNumber: 42, column: 7 },
      ])());
    },
    () => symbolicateStack([frame('View', 15392), frame('View', 15392), frame('Card', 549003)]),
  );

  assert.equal(asked.length, 2, 'the repeated offset is asked about once');
  assert.equal(result.frames[0].fileName, '/app/View.js');
  assert.equal(result.frames[1].fileName, '/app/View.js');
  assert.equal(result.frames[2].fileName, '/app/Card.tsx');
  assert.equal(result.info.mapped, 2);
});

test('keeps the frames and says so when Metro cannot be reached', async () => {
  const result = await withFetch(
    async () => { throw new Error('Network request failed'); },
    () => symbolicateStack([frame('Card', 549003)]),
  );

  assert.equal(result.frames[0].fileName, BUNDLE);
  assert.equal(result.info.mapped, 0);
  assert.match(result.info.error, /cannot reach Metro at http:\/\/127\.0\.0\.1:8082\//);
  assert.match(result.info.error, /Network request failed/);
});

test('reports the status when Metro refuses the request', async () => {
  const result = await withFetch(
    async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }),
    () => symbolicateStack([frame('Card', 549003)]),
  );

  assert.match(result.info.error, /answered HTTP 500/);
});

test('an answer that maps nothing is a failure, not a success', async () => {
  // What Metro returns for an offset it cannot place: the bundle URL back, no line.
  const result = await withFetch(
    answer([{ file: BUNDLE, methodName: 'View', lineNumber: null, column: null }]),
    () => symbolicateStack([frame('View', 15392)]),
  );

  assert.equal(result.info.mapped, 0);
  assert.match(result.info.error, /mapped none of the 1 bundle offsets/);
  assert.equal(result.frames[0].fileName, BUNDLE);
});

test('frames that already name a file need no round-trip', async () => {
  const result = await withFetch(
    async () => assert.fail('Metro must not be called'),
    () => symbolicateStack([
      { name: 'Card', fileName: 'src/Card.tsx', lineNumber: 42, columnNumber: 7 },
      { name: 'Host', fileName: null, lineNumber: null, columnNumber: null },
    ]),
  );

  assert.deepEqual(result.info, { server: null, requested: 0, mapped: 0, error: null });
});

test('a truncated answer is rejected rather than applied to the wrong frames', async () => {
  const result = await withFetch(
    answer([{ file: '/app/Card.tsx', methodName: 'Card', lineNumber: 42, column: 7 }]),
    () => symbolicateStack([frame('View', 15392), frame('Card', 549003)]),
  );

  assert.equal(result.frames[0].fileName, BUNDLE);
  assert.equal(result.frames[1].fileName, BUNDLE);
  assert.match(result.info.error, /answered 1 frames for 2/);
});
