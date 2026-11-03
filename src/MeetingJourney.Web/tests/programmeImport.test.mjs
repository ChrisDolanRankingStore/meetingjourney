import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../node_modules/vite/dist/node/index.js';
import {fileURLToPath} from 'node:url';
import React from '../node_modules/react/index.js';
import {renderToStaticMarkup} from '../node_modules/react-dom/server.node.js';

test('import requires an explicit current-device confirmation and requests carry the choice',async t=>{
 const data=new Map(),urls=[];
 const previousStorage=globalThis.localStorage;
 globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 t.mock.method(globalThis,'fetch',async url=>{urls.push(url);return new Response(JSON.stringify({month:'2026-11',meetings:[]}));});
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false},logLevel:'error'});
 try{
  const {ProgrammeImport,programmeImportEnabled}=await server.ssrLoadModule('/src/ProgrammeImport.tsx');
  const {loadMeeting,loadMeetingMonth}=await server.ssrLoadModule('/src/api.ts');
  assert.equal(programmeImportEnabled(),false);
  let html=renderToStaticMarkup(React.createElement(ProgrammeImport));
  assert.match(html,/Confirm and enable import/);assert.match(html,/disabled=""/);
  assert.match(html,/not replace JW.org, JW Library/);assert.match(html,/neurodivergent/);
  await loadMeeting(undefined,'midweek','2026-11-02');await loadMeetingMonth('2026-11-01');
  assert.ok(urls.every(url=>!url.includes('import=')));
  data.set('mj-programme-import-choice','true');
  assert.equal(programmeImportEnabled(),false);
  data.set('mj-programme-import-choice','personal-v1');
  assert.equal(programmeImportEnabled(),true);
  await loadMeeting(undefined,'midweek','2026-11-02');await loadMeetingMonth('2026-11-01');
  assert.ok(urls.slice(2).every(url=>url.includes('import=personal')));
  html=renderToStaticMarkup(React.createElement(ProgrammeImport));
  assert.match(html,/Stop future programme imports/);assert.doesNotMatch(html,/<details open/);
  data.set('mj-programme-import-choice','disabled');
  assert.equal(programmeImportEnabled(),false);
  data.set('mj-language','es');
  html=renderToStaticMarkup(React.createElement(ProgrammeImport));
  assert.match(html,/Confirmar y activar la importación/);assert.match(html,/usuarios neurodivergentes/);
  assert.doesNotMatch(html,/Meeting Journey is an independent/);
 }finally{await server.close();if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;}
});
