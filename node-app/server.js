import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentMeeting } from './meeting.js';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const publicDir = join(root, 'public');
const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
};

const notFound = (res) => json(res, 404, { error: 'Not found' });

const findMeeting = (id) => id === currentMeeting.id ? currentMeeting : undefined;
const findPart = (id) => currentMeeting.parts.find((part) => part.id === id);

function contentType(path) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
    '.ico': 'image/x-icon'
  }[extname(path).toLowerCase()] || 'application/octet-stream';
}

function safePublicPath(pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const candidate = resolve(publicDir, `.${requested}`);
  const relativePath = relative(publicDir, candidate);
  return relativePath.startsWith('..') || relativePath.includes('..\\') || relativePath.includes('../')
    ? undefined
    : candidate;
}

async function handle(request, response) {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(response, 405, { error: 'Method not allowed' });
  }

  if (pathname === '/health') {
    return json(response, 200, { service: 'meeting-journey-node', status: 'ok' });
  }

  if (pathname === '/api/v1') {
    return json(response, 200, { name: 'Meeting Journey API', version: 'v1', status: 'phase-1' });
  }

  if (pathname === '/api/meetings/current') {
    return json(response, 200, currentMeeting);
  }

  let match = pathname.match(/^\/api\/meetings\/([^/]+)\/journey$/);
  if (match) {
    const meeting = findMeeting(match[1]);
    return meeting
      ? json(response, 200, {
          meetingId: meeting.id,
          theme: meeting.theme,
          stops: meeting.parts.map((part, index) => ({
            partId: part.id,
            number: part.number,
            title: part.title,
            section: part.section,
            order: index + 1,
            durationMinutes: part.durationMinutes
          }))
        })
      : notFound(response);
  }

  match = pathname.match(/^\/api\/meetings\/([^/]+)\/parts$/);
  if (match) {
    const meeting = findMeeting(match[1]);
    return meeting ? json(response, 200, meeting.parts) : notFound(response);
  }

  match = pathname.match(/^\/api\/meetings\/([^/]+)$/);
  if (match) {
    const meeting = findMeeting(match[1]);
    return meeting ? json(response, 200, meeting) : notFound(response);
  }

  match = pathname.match(/^\/api\/parts\/([^/]+)\/activities$/);
  if (match) {
    const part = findPart(match[1]);
    return part ? json(response, 200, part.activities) : notFound(response);
  }

  match = pathname.match(/^\/api\/parts\/([^/]+)$/);
  if (match) {
    const part = findPart(match[1]);
    return part ? json(response, 200, part) : notFound(response);
  }

  if (pathname.startsWith('/api/')) {
    return notFound(response);
  }

  const requestedPath = safePublicPath(pathname);
  const filePath = requestedPath && existsSync(requestedPath) && statSync(requestedPath).isFile()
    ? requestedPath
    : join(publicDir, 'index.html');

  if (!existsSync(filePath)) {
    return json(response, 503, { error: 'Web client has not been built yet' });
  }

  response.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  });

  if (request.method === 'HEAD') {
    return response.end();
  }

  return new Promise((resolveResponse, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('end', resolveResponse);
    stream.pipe(response);
  });
}

const server = createServer(async (request, response) => {
  const started = Date.now();
  try {
    await handle(request, response);
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Unhandled request error',
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.stack : String(error)
    }));
    if (!response.headersSent) json(response, 500, { error: 'Unexpected server error' });
    else response.destroy();
  } finally {
    console.log(JSON.stringify({
      level: 'info',
      method: request.method,
      url: request.url,
      status: response.statusCode || 500,
      durationMs: Date.now() - started
    }));
  }
});

server.on('error', (error) => {
  console.error(JSON.stringify({ level: 'error', message: 'Server failed to start', error: error.stack || String(error) }));
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ level: 'info', message: 'Meeting Journey Node server started', host, port }));
});
