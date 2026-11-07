const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { act, create } = require('react-test-renderer');
const Module = require('node:module');
const { createScopeRegistry } = require('../lib/inspector/scopes');
global.IS_REACT_ACT_ENVIRONMENT = true;
const requests = [];
const symbolications = [];
const originalLoad = Module._load;
Module._load = function(id, ...args) {
  if (id === '../inspector/inspect') return {
    isInspectorAvailable: () => true,
    inspectAtPoint: (x, y, view) => new Promise(resolve => requests.push({ x, y, view, resolve })),
    selectHierarchyIndex: () => new Promise(resolve => requests.push({ resolve })),
    withRealSources: base => new Promise(resolve => symbolications.push({ base, resolve })),
  };
  return originalLoad.call(this, id, ...args);
};
const { useInspector } = require('../lib/hooks/useInspector');
Module._load = originalLoad;
const selection = (name, symbolication = null, raw = { hierarchy: [] }) => ({
  name,
  frame: { left: 0, top: 0, width: 100, height: 100 },
  hierarchy: ['View', name],
  index: 1,
  symbolication,
  raw,
});
const located = { server: 'http://localhost:8081/', requested: 3, mapped: 3, error: null };

async function mount(scopes) {
  requests.length = 0;
  symbolications.length = 0;
  let inspector;
  const ref = { current: {} };
  function Probe() { inspector = useInspector(ref, scopes); return null; }
  let root;
  await act(async () => { root = create(React.createElement(Probe)); });
  return { get inspector() { return inspector; }, close: () => act(() => root.unmount()) };
}

test('older tap cannot overwrite a more recent tap', async () => {
  const app = await mount();
  await act(async () => app.inspector.select(10, 10));
  await act(async () => app.inspector.select(20, 20));
  await act(async () => requests[1].resolve(selection('new')));
  await act(async () => requests[0].resolve(selection('old')));
  assert.equal(app.inspector.selection.name, 'new');
  await app.close();
});

test('closing inspector cancels pending selection and hover', async () => {
  const app = await mount();
  await act(async () => { app.inspector.select(10, 10); app.inspector.hover(20, 20); });
  await act(async () => app.inspector.deactivate());
  await act(async () => requests.forEach(r => r.resolve(selection('late'))));
  assert.equal(app.inspector.selection, null);
  assert.equal(app.inspector.hoveredFrame, null);
  await app.close();
});

test('empty hit clears previous selection', async () => {
  const app = await mount();
  await act(async () => app.inspector.select(10, 10));
  await act(async () => requests[0].resolve(selection('old')));
  await act(async () => app.inspector.select(20, 20));
  await act(async () => requests[1].resolve(null));
  assert.equal(app.inspector.selection, null);
  await app.close();
});

test('inactive root hit falls back to the focused screen; navigation cancels its result', async () => {
  const scopes = createScopeRegistry();
  const hidden = { id: 'hidden', depth: 1, active: false, view: { measure: cb => cb(0, 0, 300, 600, 0, 100) } };
  const screen = { id: 'focused', depth: 1, active: true, view: { measure: cb => cb(0, 0, 300, 600, 0, 100) } };
  scopes.register(hidden);
  scopes.register(screen);
  const app = await mount(scopes);
  await act(async () => app.inspector.select(20, 150));
  assert.notEqual(requests[0].view, screen.view);
  await act(async () => requests[0].resolve(selection('old screen', null, {
    hierarchy: [{ getInspectorData: () => ({ props: { testID: hidden.id } }) }],
  })));
  assert.equal(requests[1].view, screen.view);
  assert.equal(requests[1].y, 50);
  await act(async () => scopes.update(screen, false));
  await act(async () => requests[1].resolve(selection('focused screen')));
  assert.equal(app.inspector.selection, null);
  await app.close();
});

test('floating content outside the focused scope keeps the root hit', async () => {
  const scopes = createScopeRegistry();
  scopes.register({ id: 'focused', depth: 1, active: true, view: { measure: cb => cb(0, 0, 300, 600, 0, 100) } });
  const app = await mount(scopes);
  await act(async () => app.inspector.select(20, 150));
  await act(async () => requests[0].resolve(selection('floating button')));
  assert.equal(app.inspector.selection.name, 'floating button');
  assert.equal(requests.length, 1);
  await app.close();
});

test('the selection shows before Metro answers, then gains its sources', async () => {
  const app = await mount();
  await act(async () => app.inspector.select(10, 10));
  await act(async () => requests[0].resolve(selection('Card')));

  // On screen immediately, still holding bundle offsets.
  assert.equal(app.inspector.selection.name, 'Card');
  assert.equal(app.inspector.selection.symbolication, null);

  await act(async () => symbolications[0].resolve(selection('Card', located)));
  assert.deepEqual(app.inspector.selection.symbolication, located);
  await app.close();
});

test('a late symbolication cannot resurrect a selection that moved on', async () => {
  const app = await mount();
  await act(async () => app.inspector.select(10, 10));
  await act(async () => requests[0].resolve(selection('old')));
  await act(async () => app.inspector.select(20, 20));
  await act(async () => requests[1].resolve(selection('new')));
  await act(async () => symbolications[0].resolve(selection('old', located)));
  assert.equal(app.inspector.selection.name, 'new');
  await app.close();
});

test('ensureSources waits for Metro and hands back the located selection', async () => {
  const app = await mount();
  await act(async () => app.inspector.select(10, 10));
  await act(async () => requests[0].resolve(selection('Card')));
  symbolications.length = 0;

  let grabbed;
  await act(async () => {
    const pending = app.inspector.ensureSources().then(value => { grabbed = value; });
    await Promise.resolve();
    symbolications[0].resolve(selection('Card', located));
    await pending;
  });

  assert.deepEqual(grabbed.symbolication, located);
  assert.deepEqual(app.inspector.selection.symbolication, located);
  await app.close();
});

test('ensureSources retries a failed round-trip but not a successful one', async () => {
  const app = await mount();
  await act(async () => app.inspector.select(10, 10));
  await act(async () => requests[0].resolve(selection('Card')));
  await act(async () => symbolications[0].resolve(
    selection('Card', { server: 'http://localhost:8081/', requested: 3, mapped: 0, error: 'no answer from Metro' }),
  ));

  symbolications.length = 0;
  await act(async () => {
    app.inspector.ensureSources();
    await Promise.resolve();
  });
  assert.equal(symbolications.length, 1, 'a failure is worth asking again');

  await act(async () => symbolications[0].resolve(selection('Card', located)));
  symbolications.length = 0;
  await act(async () => { await app.inspector.ensureSources(); });
  assert.equal(symbolications.length, 0, 'a located selection is never re-asked');
  await app.close();
});

test('ensureSources is a no-op without a selection', async () => {
  const app = await mount();
  assert.equal(await app.inspector.ensureSources(), null);
  assert.equal(symbolications.length, 0);
  await app.close();
});
