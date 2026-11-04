import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {refreshAppFiles} from '../public/app-refresh.js';
import {refreshedPortrait} from '../src/companions.ts';

test('phone chrome and installed launch backgrounds share the parchment colour',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8').replace(/^\uFEFF/,''));
 const colour=html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1];
 assert.equal(colour,'#fff5df');
 assert.equal(manifest.theme_color,colour);
 assert.equal(manifest.background_color,colour);
 assert.match(html,/viewport-fit=cover/);
 assert.match(html,/<meta name="apple-mobile-web-app-status-bar-style" content="default"/);
 assert.equal(manifest.display,'standalone');
});

test('older default selections move to refreshed artwork and later explicit choices remain unchanged',()=>{
 assert.equal(refreshedPortrait({style:'classic-boy'}),'prepared');
 assert.equal(refreshedPortrait({style:'classic-girl',portrait:'original'}),'prepared');
 assert.equal(refreshedPortrait({style:'wheelchair-girl'}),'prepared');
 assert.equal(refreshedPortrait({style:'classic-boy',portrait:'original',portraitRevision:1}),'original');
 assert.equal(refreshedPortrait({style:'classic-boy',portrait:'prepared',portraitRevision:1}),'prepared');
 assert.equal(refreshedPortrait({style:'african-girl'}),'original');
});

test('refresh removes only Meeting Journey public caches and replaces only its own root worker',async()=>{
 const removed=[],workers=[],registered=[];
 await refreshAppFiles({origin:'https://meetingjourney.test',fetch:async()=>new Response(JSON.stringify({service:'meeting-journey-node',status:'ok'})),
  caches:{keys:async()=>['meeting-journey-050-companions','unrelated-app-cache','meeting-journey-review-20261025'],delete:async name=>{removed.push(name);return true;}},
  serviceWorker:{getRegistrations:async()=>[
   {scope:'https://meetingjourney.test/',active:{scriptURL:'https://meetingjourney.test/sw.js?v=old'},unregister:async()=>workers.push('ours')},
   {scope:'https://meetingjourney.test/other/',active:{scriptURL:'https://meetingjourney.test/other/sw.js'},unregister:async()=>workers.push('other')}
  ],register:async(...args)=>{registered.push(args);return {active:{state:'activated'}};}}
 });
 assert.deepEqual(removed,['meeting-journey-050-companions','meeting-journey-review-20261025']);
 assert.deepEqual(workers,['ours']);
 assert.deepEqual(registered,[['/sw.js',{scope:'/',updateViaCache:'none'}]]);
});

test('an unavailable server never clears offline caches or unregisters the current worker',async()=>{
 let touched=false;
 await assert.rejects(()=>refreshAppFiles({origin:'https://meetingjourney.test',fetch:async()=>new Response('Unavailable',{status:503}),
  caches:{keys:async()=>{touched=true;return [];},delete:async()=>{touched=true;}},
  serviceWorker:{getRegistrations:async()=>{touched=true;return [];}}
 }));
 assert.equal(touched,false);
});
