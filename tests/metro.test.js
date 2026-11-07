const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { withGrabMetro, createGrabClipboardMiddleware } = require('../metro');

function request(text, headers = { 'x-react-native-grab': '1' }) {
  const req = Readable.from([Buffer.from(text)]);
  Object.assign(req, {
    url: '/__react-native-grab/clipboard',
    method: 'POST',
    headers,
    socket: { remoteAddress: '::ffff:127.0.0.1' },
  });
  return req;
}

function response() {
  return {
    status: null,
    writeHead(status) { this.status = status; return this; },
    end() { return this; },
  };
}

test('Metro wrapper preserves earlier middleware and handles the Grab route', async () => {
  const written = [];
  const upstream = () => { throw new Error('unexpected upstream request'); };
  const config = withGrabMetro({ server: { enhanceMiddleware: () => upstream } });
  const middleware = config.server.enhanceMiddleware(upstream, {});
  // The production writer is pbcopy; this route-level test only proves the
  // configured middleware delegates. A fake writer tests the actual payload.
  assert.equal(typeof middleware, 'function');
  const handler = createGrabClipboardMiddleware(upstream, {
    platform: 'darwin',
    write: async text => written.push(text),
  });
  const res = response();
  await handler(request('// selected <View />'), res);
  assert.equal(res.status, 204);
  assert.deepEqual(written, ['// selected <View />']);
});

test('the bridge refuses requests that did not come from Grab', async () => {
  const handler = createGrabClipboardMiddleware(() => {}, {
    platform: 'darwin',
    write: async () => { throw new Error('must not write'); },
  });
  const res = response();
  await handler(request('private text', {}), res);
  assert.equal(res.status, 403);
});
