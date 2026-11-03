import {test} from 'node:test';
import assert from 'node:assert/strict';
import {insertStarter,normalizeComfort,readComfort,saveComfort} from '../src/comfortPreferences.ts';
import {notebookContext,notebookSearch} from '../src/notebookLabels.ts';

test('comfort is opt-in and accepts only supported text sizes',()=>{
 assert.deepEqual(normalizeComfort(null),{neutral:false,hideCounts:false,iconLabels:false,showMinutes:false,textSize:'standard'});
 assert.deepEqual(normalizeComfort({neutral:true,hideCounts:true,iconLabels:true,textSize:'larger'}),{neutral:true,hideCounts:true,iconLabels:true,showMinutes:false,textSize:'larger'});
 assert.equal(normalizeComfort({textSize:'huge',neutral:'yes'}).textSize,'standard');
 assert.equal(normalizeComfort({neutral:'yes'}).neutral,false);
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 saveComfort(normalizeComfort({neutral:true,textSize:'large'}),storage);
 assert.equal(readComfort(storage).neutral,true);
 assert.equal(readComfort(storage).textSize,'large');
 assert.throws(()=>saveComfort(normalizeComfort(null),{setItem(){throw Error('Storage full');}}),/Storage full/);
});
test('English and Spanish starters preserve every word including a selection',()=>{
 for(const starter of ['I noticed…','El texto bíblico me ayuda a...']){
  const draft='My original words';
  const result=insertStarter(draft,starter,3,11);
  assert.ok(result.text.startsWith('My '));
  assert.ok(result.text.endsWith('original words'));
  assert.ok(result.text.includes(starter.replace(/[…\.]+$/,'')));
  assert.ok(result.cursor<=result.text.length);
  assert.equal(insertStarter('',starter,0,0).text,starter.replace(/[…\.]+$/,'')+' ');
 }
});
test('starter at the length limit fails without truncating or changing the draft',()=>{
 const original='x'.repeat(10000);
 assert.throws(()=>insertStarter(original,'I noticed…',10000,10000),/words have not changed/);
 assert.equal(original.length,10000);
 const nearLimit='x'.repeat(9980),next=insertStarter(nearLimit,'I noticed…',9980,9980);
 assert.ok(next.text.startsWith(nearLimit));assert.ok(next.text.length<=10000);
});
test('historical labels resolve page, activity, title and reference without old programme downloads',()=>{
 const storage={getItem:key=>key==='mj-notebook-labels:meeting-2026-11-02'?JSON.stringify({parts:[{id:'part-1',title:'A hopeful thought',textReference:'John 3:16'}]}):null};
 const drawing=notebookContext('meeting-2026-11-02','part-1::page::2',storage);
 assert.match(drawing.label,/2026-11-02/);assert.match(drawing.label,/A hopeful thought/);assert.match(drawing.label,/Page 3/);
 assert.equal(drawing.reference,'John 3:16');
 assert.match(notebookContext('meeting-2026-11-02','part-1:connections',storage).label,/Connect/);
 assert.match(notebookContext('weekend-2026-11-02','old-part',{getItem:()=>null}).label,/old part/);
 assert.equal(notebookSearch('Ánimo y ESPERANZA'),'animo y esperanza');
});
