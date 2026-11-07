const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('host clipboard writes on device and to the same Metro server as symbolication', async () => {
  const writes = [];
  const originalLoad = Module._load;
  Module._load = function (id, ...args) {
    if (id === 'react-native') return { NativeModules: { SourceCode: {} } };
    if (id === './clipboard') return { copyToClipboard: async text => writes.push(text) };
    return originalLoad.call(this, id, ...args);
  };
  const { copyToHostClipboard } = require('../lib/utils/hostClipboard');
  Module._load = originalLoad;

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8083/__react-native-grab/clipboard');
    assert.equal(options.headers['X-React-Native-Grab'], '1');
    writes.push(options.body);
    return { ok: true };
  };
  try {
    await copyToHostClipboard('selected view', {
      symbolication: { server: 'http://127.0.0.1:8083/', requested: 1, mapped: 1, error: null },
      stack: [],
    });
    assert.deepEqual(writes, ['selected view', 'selected view']);
  } finally {
    global.fetch = originalFetch;
  }
});
