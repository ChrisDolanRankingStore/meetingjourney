import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentMeeting } from './meeting.js';
import { getMeeting } from './meeting-catalog.js';
import { readPublishedMeeting } from './published-content.js';
import {cachedWolMeeting,loadWolMeeting} from './wol-metadata.js';
const meetingFor = (kind, date) => { try { return readPublishedMeeting(kind, date) ?? cachedWolMeeting(kind,date) ?? getMeeting(kind, date); } catch (error) { if (error instanceof RangeError) throw error; console.error(JSON.stringify({ level: 'error', message: 'Published outline could not be loaded', error: error.message })); return getMeeting(kind, date); } };
async function onlineMeetingFor(kind,date){
  try { const published=readPublishedMeeting(kind,date);if(published)return published; }
  catch(error){if(error instanceof RangeError)throw error;console.error('Published outline could not be loaded.',error);}
  return loadWolMeeting(kind,date);
}
import { localDateKey, suggestedMeeting, monthWeeks } from './meeting-schedule.js';

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

const findMeeting = async (id) => {
  const match = /^(meeting|weekend)-(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!match) return undefined;
  try { const meeting = await onlineMeetingFor(match[1] === 'weekend' ? 'weekend' : 'midweek', match[2]); return meeting.id === id ? meeting : undefined; } catch (error) { if(error instanceof RangeError)return undefined;throw error; }
};
const findPart = (id) => currentMeeting.parts.find((part) => part.id === id);

function contentType(path) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
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
    return json(response, 200, { service: 'meeting-journey-node', version: '0.5.3', status: 'ok' });
  }

  if (pathname === '/api/v1') {
    return json(response, 200, { name: 'Meeting Journey API', version: 'v1', status: 'phase-1' });
  }

  if (pathname === '/api/meetings/month') {
    try {
      const date = url.searchParams.get('date') ?? localDateKey();
      const meetings = monthWeeks(date).flatMap(week => ['midweek', 'weekend'].map(kind => meetingFor(kind, week)));
      return json(response, 200, { month: date.slice(0, 7), meetings });
    } catch (error) {
      return json(response, 400, { error: error instanceof Error ? error.message : 'Invalid month' });
    }
  }

  if (pathname === '/api/meetings/current') {
    const suggestion = suggestedMeeting(localDateKey());
    try {
      return json(response, 200, await onlineMeetingFor(url.searchParams.get('type') ?? suggestion.type, url.searchParams.get('date') ?? suggestion.date));
    } catch (error) {
      return json(response, 400, { error: error instanceof Error ? error.message : 'Invalid meeting selection' });
    }
  }

  let match = pathname.match(/^\/api\/meetings\/([^/]+)\/journey$/);
  if (match) {
    const meeting = await findMeeting(match[1]);
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
    const meeting = await findMeeting(match[1]);
    return meeting ? json(response, 200, meeting.parts) : notFound(response);
  }

  match = pathname.match(/^\/api\/meetings\/([^/]+)$/);
  if (match) {
    const meeting = await findMeeting(match[1]);
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

  const route = ({ '/about': '/about.html', '/privacy': '/privacy.html', '/welcome': '/welcome.html', '/refresh': '/refresh.html' })[pathname] ?? pathname;
  const requestedPath = safePublicPath(route);
  if (!requestedPath || (extname(route) && !existsSync(requestedPath))) return notFound(response);
  const filePath = requestedPath && existsSync(requestedPath) && statSync(requestedPath).isFile()
    ? requestedPath
    : join(publicDir, 'index.html');

  if (!existsSync(filePath)) {
    return json(response, 503, { error: 'Web client has not been built yet' });
  }

  const details = statSync(filePath);
  const etag = 'W/' + JSON.stringify(details.size + '-' + details.mtimeMs);
  response.setHeader('ETag', etag);
  if (request.headers['if-none-match'] === etag) { response.writeHead(304); return response.end(); }
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
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('X-Frame-Options', 'DENY');
  if (request.headers['x-forwarded-proto'] === 'https') response.setHeader('Strict-Transport-Security', 'max-age=31536000');
  try {
    await handle(request, response);
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Unhandled request error',
      method: request.method,
      url: (request.url || '/').split('?')[0],
      error: error instanceof Error ? error.stack : String(error)
    }));
    if (!response.headersSent) json(response, 500, { error: 'Unexpected server error' });
    else response.destroy();
  } finally {
    console.log(JSON.stringify({
      level: 'info',
      method: request.method,
      url: (request.url || '/').split('?')[0],
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
  console.log(JSON.stringify({ level: 'info', message: 'Meeting Journey Node server started', host, port: server.address().port }));
});
