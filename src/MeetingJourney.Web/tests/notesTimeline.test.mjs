import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../node_modules/vite/dist/node/index.js';
import {fileURLToPath} from 'node:url';
import {saveNote,saveDrawing} from '../src/storage.ts';
import {saveStudy,emptyStudy} from '../src/studyStorage.ts';
import React from '../node_modules/react/index.js';
import {renderToStaticMarkup} from '../node_modules/react-dom/server.node.js';

test('timeline includes saved meeting and assembly notes and study drafts, newest first',async()=>{
 await saveNote({meetingId:'meeting-2026-11-02',partId:'part-1',text:'John 3:16',updatedAt:'2026-11-02T20:00:00Z'});
 await saveNote({meetingId:'assembly-co-2026-11-07',partId:'talk',text:'Assembly thought',updatedAt:'2026-11-07T10:00:00Z'});
 await saveNote({meetingId:'meeting-2026-11-02',partId:'empty',text:' ',updatedAt:'2026-11-02T20:00:00Z'});
 await saveStudy({...emptyStudy('meeting-2026-11-02','part-1'),draft:'Study draft',updatedAt:'2026-11-03T20:00:00Z'});
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false},logLevel:'error'});
 try{
  const {readNotesTimeline}=await server.ssrLoadModule('/src/NotesTimeline.tsx');
  const notes=await readNotesTimeline();
  assert.deepEqual(notes.map(note=>note.text),['Assembly thought','Study draft','John 3:16']);
  assert.equal(new Set(notes.map(note=>note.key)).size,notes.length);
  await saveDrawing('meeting-2026-10-19','old-part::page::2',[{mode:'pen',size:5,color:'#123456',points:[0,0,20,20],smooth:true}],{width:760,height:900});
  const withDrawing=await readNotesTimeline(),drawing=withDrawing.find(note=>note.kind==='drawing');
  assert.equal(drawing.meetingId,'meeting-2026-10-19');assert.equal(drawing.partId,'old-part::page::2');
  assert.equal(notes.find(note=>note.text==='Study draft').kind,'study');
  assert.equal(notes.find(note=>note.text==='John 3:16').kind,'note');
  const {ScriptureLookup}=await server.ssrLoadModule('/src/ScriptureLookup.tsx');
  const html=renderToStaticMarkup(React.createElement(ScriptureLookup,{text:'My thought: John 3:16 and Salmos 37:4'}));
  assert.match(html,/bible=43003016/);assert.match(html,/bible=19037004/);
  assert.doesNotMatch(html,/biblesupersearch|bible-api|King James|Reina-Valera/);
  assert.equal(renderToStaticMarkup(React.createElement(ScriptureLookup,{text:'Just a personal thought'})),'');
 }finally{await server.close();}
});
