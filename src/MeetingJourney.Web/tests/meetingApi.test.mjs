import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {readFileSync} from 'node:fs';

test('Node API serves the selected type/week and rejects bad calendar inputs', async () => {
  const process = spawn(globalThis.process.execPath, [new URL('../../../node-app/server.js', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]):)/, '$1:')], {
    env: { ...globalThis.process.env, PORT: '0', MJ_ADMIN_ENABLED:'false' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      process.on('error', error => { clearTimeout(timer); reject(error); });
      process.on('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
      process.stdout.on('data', data => {
        buffer += String(data);
        for (const line of buffer.split('\n')) {
          try { const event = JSON.parse(line); if (event.port > 0) { clearTimeout(timer); resolve(event.port); return; } } catch { /* incomplete log line */ }
        }
      });
    });
    const base = `http://127.0.0.1:${port}`;
    for(const path of ['/admin','/admin/app.js','/api/admin/session','/api/%61dmin/artwork']){
      const response=await fetch(base+path);
      assert.equal(response.status,503,path);
      assert.match(response.headers.get('cache-control'),/no-store/);
    }
    assert.equal((await fetch(base+'/api/admin/artwork',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
    for(const path of ['/api/meetings/current?type=midweek&date=2026-11-02','/api/meetings/meeting-2026-11-02','/api/meetings/current?type=midweek&date=2026-11-02&import=false']){
      const general=await fetch(base+path).then(response=>response.json());
      assert.equal(general.contentStatus,'general');
      assert.equal(general.programmeMetadata,undefined);
    }
    const month = await fetch(`${base}/api/meetings/month?date=2026-11-15`).then(response => response.json());
    assert.equal(month.month, '2026-11');
    assert.equal(month.meetings.length, 12);
    for (const kind of ['midweek', 'weekend']) {
      assert.ok(month.meetings.some(meeting => meeting.kind === kind && meeting.weekOf === '2026-10-26'));
      assert.ok(month.meetings.some(meeting => meeting.kind === kind && meeting.weekOf === '2026-11-30'));
    }
    assert.equal((await fetch(`${base}/api/meetings/month?date=2026-02-30`)).status, 400);
    const weekend = await fetch(`${base}/api/meetings/current?type=weekend&date=2026-10-25`).then(response => response.json());
    assert.equal(weekend.kind, 'weekend');
    assert.equal(weekend.id, 'weekend-2026-10-19');
    const midweek = await fetch(`${base}/api/meetings/current?type=midweek&date=2026-10-28`).then(response => response.json());
    assert.equal(midweek.weekOf, '2026-10-26');
    assert.match(midweek.material.appUrl, /docid=202026259/);
    assert.equal(midweek.parts.find(part=>part.id==='part-2').textReference,'Jeremiah 48:6');
    assert.match(midweek.parts.find(part=>part.type==='CongregationBibleStudy').appUrl,/docid=1102025914/);
    assert.notEqual(midweek.parts.find(part=>part.id==='part-1').title,'Bible talk');
    const parts = await fetch(`${base}/api/meetings/${weekend.id}/parts`).then(response => response.json());
    assert.ok(parts.some(part => part.type === 'WatchtowerStudy'));
    assert.equal((await fetch(`${base}/api/meetings/current?type=weekend&date=2026-02-30`)).status, 400);
    assert.equal((await fetch(`${base}/api/meetings/current?type=other&date=2026-10-25`)).status, 400);
    const health = await fetch(base + '/health'); assert.equal(health.status, 200); assert.equal((await health.json()).version, JSON.parse(readFileSync(new URL('../../../node-app/package.json',import.meta.url),'utf8')).version);
    const privacy = await fetch(base + '/privacy'); assert.equal(privacy.status, 200); assert.match(await privacy.text(), /Your drawings stay with you/);
    assert.match(privacy.headers.get('content-security-policy'), /frame-ancestors 'none'/); assert.equal(privacy.headers.get('x-frame-options'), 'DENY'); assert.equal(privacy.headers.get('referrer-policy'), 'no-referrer');
    assert.equal((await fetch(base + '/assets/does-not-exist.webp')).status, 404);
    const home = await fetch(base + '/'); const etag = home.headers.get('etag'); assert.ok(etag); assert.equal((await fetch(base + '/', {headers: {'if-none-match': etag}})).status, 304);
    const icon = await fetch(base + '/icon-192.png'); assert.equal(icon.status, 200); assert.match(icon.headers.get('content-type'), /image\/png/);
    const manifest=await fetch(base+'/manifest.webmanifest').then(response=>response.json());
    assert.ok(manifest.icons.every(icon=>icon.src.startsWith('/journey-route-')));
    for(const path of ['/journey-route-180.png','/journey-route-192.png','/journey-route-512.png','/apple-touch-icon.png','/apple-touch-icon-precomposed.png']){
      const response=await fetch(base+path);assert.equal(response.status,200,path);assert.match(response.headers.get('content-type'),/image\/png/);
    }
    assert.match(await fetch(base+'/').then(response=>response.text()),/rel="apple-touch-icon" sizes="180x180" href="\/journey-route-180.png"/);

  } finally { process.kill(); }
});
