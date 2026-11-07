/** Optional macOS development bridge for Grab's host clipboard. */
const { spawn } = require('node:child_process');

const PATH = '/__react-native-grab/clipboard';
const MAX_BYTES = 256 * 1024;

function isLocalAddress(address) {
  const ip = address?.replace(/^::ffff:/, '');
  return ip === '::1' || ip === '127.0.0.1' ||
    /^10\./.test(ip) || /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

function copyOnMac(text) {
  return new Promise((resolve, reject) => {
    const child = spawn('pbcopy', [], { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.on('error', reject);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdin.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr || `pbcopy exited ${code}`)));
    child.stdin.end(text);
  });
}

function createGrabClipboardMiddleware(next, { write = copyOnMac, platform = process.platform } = {}) {
  return async (req, res, fallback) => {
    if (req.url?.split('?')[0] !== PATH) return next(req, res, fallback);
    if (!isLocalAddress(req.socket.remoteAddress)) return res.writeHead(403).end();
    if (req.method !== 'POST') return res.writeHead(405).end();
    // A native fetch may send this header; browsers cannot send it cross-origin
    // without a preflight, which this endpoint deliberately does not answer.
    if (req.headers['x-react-native-grab'] !== '1') return res.writeHead(403).end();
    if (platform !== 'darwin') return res.writeHead(501).end();

    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BYTES) return res.writeHead(413).end();
        chunks.push(chunk);
      }
      await write(Buffer.concat(chunks).toString('utf8'));
      res.writeHead(204).end();
    } catch (error) {
      console.warn('[react-native-grab] host clipboard failed:', error);
      if (!res.headersSent) res.writeHead(500).end();
    }
  };
}

function withGrabMetro(config) {
  const enhance = config.server?.enhanceMiddleware;
  return {
    ...config,
    server: {
      ...config.server,
      enhanceMiddleware: (middleware, server) =>
        createGrabClipboardMiddleware(enhance?.(middleware, server) ?? middleware),
    },
  };
}

module.exports = { withGrabMetro, createGrabClipboardMiddleware };
