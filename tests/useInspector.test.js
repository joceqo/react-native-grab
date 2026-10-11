const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { act, create } = require('react-test-renderer');
const Module = require('node:module');
const { createScopeRegistry } = require('../lib/inspector/scopes');
global.IS_REACT_ACT_ENVIRONMENT = true;
const requests = [];
const originalLoad = Module._load;
Module._load = function(id, ...args) {
  if (id === '../inspector/inspect') return {
    isInspectorAvailable: () => true,
    inspectAtPoint: (x, y, view) => new Promise(resolve => requests.push({ x, y, view, resolve })),
    selectHierarchyIndex: () => new Promise(resolve => requests.push({ resolve })),
  };
  return originalLoad.call(this, id, ...args);
};
const { useInspector } = require('../lib/hooks/useInspector');
Module._load = originalLoad;
const selection = name => ({ name, frame: { left: 0, top: 0, width: 100, height: 100 }, hierarchy: ['View', name], index: 1 });

async function mount(scopes) {
  requests.length = 0;
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

test('focus scopes drive the actual renderer query and navigation cancels its result', async () => {
  const scopes = createScopeRegistry();
  const screen = { depth: 1, active: true, view: { measure: cb => cb(0, 0, 300, 600, 0, 100) } };
  scopes.register(screen);
  const app = await mount(scopes);
  await act(async () => app.inspector.select(20, 150));
  assert.equal(requests[0].view, screen.view);
  assert.equal(requests[0].y, 50);
  await act(async () => scopes.update(screen, false));
  await act(async () => requests[0].resolve(selection('old screen')));
  assert.equal(app.inspector.selection, null);
  await app.close();
});
