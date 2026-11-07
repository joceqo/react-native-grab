const test = require('node:test');
const assert = require('node:assert/strict');
const { createScopeRegistry } = require('../lib/inspector/scopes');

function scope(depth, active = true, bounds = [0, 0, 390, 700, 0, 100], parent) {
  return { depth, active, parent, view: { measure: cb => cb(...bounds) } };
}

test('retained directory cannot beat focused feed at the same coordinates', async () => {
  const registry = createScopeRegistry();
  const feed = scope(1);
  const directory = scope(2, false);
  registry.register(feed);
  registry.register(directory);
  assert.equal((await registry.resolve(120, 400)).view, feed.view);
});

test('frozen child is excluded when its parent tab loses focus', async () => {
  const registry = createScopeRegistry();
  const shortcuts = scope(1);
  const directory = scope(2, true, undefined, shortcuts);
  const feed = scope(1);
  registry.register(shortcuts);
  registry.register(directory);
  registry.register(feed);
  registry.update(shortcuts, false);
  assert.equal(directory.active, true); // frozen subtree did not render
  assert.equal((await registry.resolve(120, 400)).view, feed.view);
});

test('deepest focused scope wins and translates window to host parent coordinates', async () => {
  const registry = createScopeRegistry();
  const root = scope(1);
  const screen = scope(2, true, [5, 12, 300, 400, 20, 100], root);
  registry.register(root);
  registry.register(screen);
  const hit = await registry.resolve(120, 200);
  assert.deepEqual(hit, { view: screen.view, x: 105, y: 112 });
  assert.equal((await registry.resolve(350, 500)).view, root.view);
  assert.equal(await registry.resolve(120, 850), null); // tab bar outside scopes
});

test('unmounted or zero size scopes cannot remain selectable', async () => {
  const registry = createScopeRegistry();
  const hidden = scope(2, true, [0, 0, 0, 0, 0, 0]);
  registry.register(hidden);
  const screen = scope(1);
  const remove = registry.register(screen);
  remove();
  assert.equal(await registry.resolve(0, 0), null);
});

test('native measure timeout does not hang inspection', async () => {
  const registry = createScopeRegistry();
  registry.register({ depth: 1, active: true, view: { measure() {} } });
  assert.equal(await registry.resolve(20, 20), null);
});

test('focus change during native measurement invalidates the candidate', async () => {
  const registry = createScopeRegistry();
  let answer;
  const screen = { depth: 1, active: true, view: { measure(cb) { answer = cb; } } };
  registry.register(screen);
  const pending = registry.resolve(20, 20);
  registry.update(screen, false);
  answer(0, 0, 100, 100, 0, 0);
  assert.equal(await pending, null);
});

test('root hit from a retained inactive screen falls back to the focused scope', () => {
  const registry = createScopeRegistry();
  const hidden = { ...scope(2, false), id: '__react_native_grab_scope_42' };
  registry.register(hidden);
  const hierarchy = [{ getInspectorData: () => ({ props: { testID: hidden.id } }) }];
  assert.equal(registry.isInactiveHit(hierarchy), true);
  registry.update(hidden, true);
  assert.equal(registry.isInactiveHit(hierarchy), false);
});

test('floating content outside screen scopes keeps the root hit', () => {
  const registry = createScopeRegistry();
  registry.register({ ...scope(1), id: '__react_native_grab_scope_1' });
  const floating = [{ getInspectorData: () => ({ props: { testID: 'floating-button' } }) }];
  assert.equal(registry.isInactiveHit(floating), false);
});
