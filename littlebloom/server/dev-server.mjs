/**
 * Serves the Little Bloom site for local development.
 *   npm run dev
 *
 * Voice in the browser uses Replicate (see app.js); no server-side TTS here.
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

async function handleStatic(req, res, pathname) {
  let rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  rel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.resolve(ROOT, rel);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const st = await fs.stat(filePath);
    if (!st.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' || req.method === 'HEAD') {
    await handleStatic(req, res, url.pathname);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Little Bloom → http://127.0.0.1:${PORT}/`);
});
