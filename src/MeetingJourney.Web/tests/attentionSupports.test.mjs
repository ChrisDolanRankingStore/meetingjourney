import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from '../node_modules/vite/dist/node/index.js';
import React from '../node_modules/react/index.js';
import {renderToStaticMarkup} from '../node_modules/react-dom/server.node.js';
import {getMeeting} from '../../../node-app/meeting-catalog.js';

test('elapsed time pauses, clamps and respects hidden controls; stamps fill only kept parts',async()=>{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false},logLevel:'error'});
 const previousStorage=globalThis.localStorage;
 const data=new Map();globalThis.localStorage={getItem:key=>data.get(key)??null};
 try {
  const {elapsedStep,minutesToSong,ElapsedPart}=await server.ssrLoadModule('/src/ElapsedPart.tsx');
  const duration=30*60000;
  assert.equal(elapsedStep(0,0,15*60000,true,duration),duration/2);
  assert.equal(elapsedStep(duration/2,15*60000,20*60000,false,duration),duration/2);
  assert.equal(elapsedStep(duration-1000,0,999999,true,duration),duration);
  assert.equal(minutesToSong([{durationMinutes:10},{durationMinutes:5},{durationMinutes:3}],0,2),15);
  const {stampGroups,MeetingStamps}=await server.ssrLoadModule('/src/MeetingStamps.tsx');
  const key='meeting-2026-11-02:part-5';
  const groups=stampGroups([{key,value:{text:'One thought'}},{key:key+'::page::1',value:[{mode:'pen',points:[1,2]}]},{key:'meeting-2026-11-02:part-6',value:{text:''}}]);
  assert.deepEqual([...groups.get('meeting-2026-11-02')],['part-5']);
  const meeting=getMeeting('midweek','2026-11-02');
  assert.equal((renderToStaticMarkup(React.createElement(MeetingStamps,{meeting})).match(/role="img"/g)??[]).length,meeting.parts.length);
  data.set('mj-comfort',JSON.stringify({hideCounts:true}));
  assert.equal(renderToStaticMarkup(React.createElement(MeetingStamps,{meeting})),'');
  assert.equal(renderToStaticMarkup(React.createElement(ElapsedPart,{minutes:30})),'');
 }finally{await server.close();if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;}
});
