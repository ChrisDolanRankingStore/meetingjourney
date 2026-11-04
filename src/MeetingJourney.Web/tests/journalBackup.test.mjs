import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {saveNote,readNote,saveDrawing,readDrawingPage,openDb} from '../src/storage.ts';
import {exportJournal,importJournal,validateBackup} from '../src/journalBackup.ts';
import {saveStudy,readStudy,emptyStudy} from '../src/studyStorage.ts';
import {emptyVisit,readCircuitVisit,saveCircuitVisit} from '../src/circuitVisit.ts';
import {personalizeMeeting,saveLocalTalkDetails} from '../src/localMeetingDetails.ts';
import {getMeeting} from '../../../node-app/meeting-catalog.js';
import {assemblyMeeting,readCircuitAssembly,saveCircuitAssembly} from '../src/circuitAssembly.ts';
import {conventionDates,conventionMeeting,readConvention,saveConvention} from '../src/convention.ts';
class MemoryStorage{data=new Map();get length(){return this.data.size;}key(i){return [...this.data.keys()][i]??null;}getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}}
beforeEach(()=>{globalThis.indexedDB=new IDBFactory();});
test('backup round-trip preserves editable strokes, paper, notes, study comments and preferences',async()=>{
 const storage=new MemoryStorage();storage.setItem('mj-character','{"name":"Test"}');storage.setItem('unrelated','keep');storage.setItem('mj-programme-import-choice','personal-v1');
 storage.setItem('mj-comfort','{"neutral":true,"hideCounts":true,"iconLabels":true,"textSize":"larger"}');
 storage.setItem('mj-notebook-labels:week-a','{"parts":[{"id":"reading","title":"A saved title","textReference":"John 3:16"}]}');
 await saveNote({meetingId:'week-a',partId:'reading',text:'My thought',updatedAt:'2026-10-25'});
 const stroke={points:[1,2,30,40],color:'#123456',size:4,mode:'pen',smooth:true};await saveDrawing('week-a','reading',[stroke],{width:760,height:900});
 const study={...emptyStudy('week-a','reading'),paragraph:7,comments:[{id:'c1',paragraph:7,text:'My comment',ready:true,given:false}]};await saveStudy(study);
 const backup=validateBackup(await exportJournal(storage));assert.equal(backup.formatVersion,2);assert.equal(backup.preferences.unrelated,undefined);assert.equal(backup.preferences['mj-programme-import-choice'],undefined);assert.equal(backup.preferences['mj-parent-pin'],undefined);assert.ok(backup.notes.every(entry=>/^[0-9a-f-]{36}$/i.test(entry.id)&&Number.isFinite(Date.parse(entry.modifiedAt))));assert.ok(backup.preferenceRecords.every(entry=>/^[0-9a-f-]{36}$/i.test(entry.id)&&Number.isFinite(Date.parse(entry.modifiedAt))));
 globalThis.indexedDB=new IDBFactory();const restored=new MemoryStorage();assert.deepEqual(await importJournal(backup,true,restored),{added:3,updated:3,kept:0});
 assert.equal((await readNote('week-a','reading')).text,'My thought');assert.deepEqual((await readDrawingPage('week-a','reading')).strokes,[stroke]);assert.equal((await readDrawingPage('week-a','reading')).paper.height,900);assert.equal((await readStudy('week-a','reading')).paragraph,7);assert.equal(restored.getItem('mj-character'),'{"name":"Test"}');
 assert.equal(JSON.parse(restored.getItem('mj-comfort')).hideCounts,true);
 assert.equal(JSON.parse(restored.getItem('mj-notebook-labels:week-a')).parts[0].title,'A saved title');
});
test('restore keeps newer device entries instead of overwriting them',async()=>{await saveNote({meetingId:'week-a',partId:'reading',text:'Old',updatedAt:'2026-10-25'});const backup=await exportJournal(new MemoryStorage());await saveNote({meetingId:'week-a',partId:'reading',text:'Keep this',updatedAt:'2026-10-26'});assert.deepEqual(await importJournal(backup,false,new MemoryStorage()),{added:0,updated:0,kept:1});assert.equal((await readNote('week-a','reading')).text,'Keep this');});
test('merge adds different device entries and is idempotent',async()=>{
 await saveNote({meetingId:'week-a',partId:'device-a',text:'A',updatedAt:'2026-10-25'});
 const backup=await exportJournal(new MemoryStorage());
 globalThis.indexedDB=new IDBFactory();
 await saveNote({meetingId:'week-b',partId:'device-b',text:'B',updatedAt:'2026-10-26'});
 const storage=new MemoryStorage();
 const first=await importJournal(backup,false,storage),second=await importJournal(backup,false,storage);
 assert.equal(first.added,1);assert.equal(second.added,0);assert.equal((await readNote('week-a','device-a')).text,'A');assert.equal((await readNote('week-b','device-b')).text,'B');
});
test('merge keeps comments created independently on two devices',async()=>{
 const progressA={...emptyStudy('week-a','study'),updatedAt:'2026-10-25T10:00:00Z',comments:[{id:'comment-a',paragraph:1,text:'A',ready:false,given:false}]};
 await saveStudy(progressA);const backup=await exportJournal(new MemoryStorage());
 globalThis.indexedDB=new IDBFactory();
 const progressB={...emptyStudy('week-a','study'),updatedAt:'2026-10-26T10:00:00Z',draft:'B',comments:[{id:'comment-b',paragraph:2,text:'B',ready:false,given:false}]};
 await saveStudy(progressB);
 const first=await importJournal(backup,false,new MemoryStorage()),second=await importJournal(backup,false,new MemoryStorage()),merged=await readStudy('week-a','study');
 assert.equal(first.updated,1);assert.equal(second.kept,1);assert.equal(merged.draft,'B');assert.deepEqual(merged.comments.map(comment=>comment.id).sort(),['comment-a','comment-b']);
});
test('replace mode removes local entries that are absent from the chosen backup',async()=>{
 await saveNote({meetingId:'week-a',partId:'kept',text:'Backup entry',updatedAt:'2026-10-25'});
 const exportedSettings=new MemoryStorage();exportedSettings.setItem('mj-character','{"name":"From backup"}');
 const backup=await exportJournal(exportedSettings);
 await saveNote({meetingId:'week-b',partId:'removed',text:'Local only',updatedAt:'2026-10-26'});
 const localSettings=new MemoryStorage();localSettings.setItem('mj-character','{"name":"Local"}');localSettings.setItem('mj-comfort','{}');localSettings.setItem('mj-parent-pin','device-only');
 await importJournal(backup,false,localSettings,'replace');
 assert.equal((await readNote('week-a','kept')).text,'Backup entry');assert.equal(await readNote('week-b','removed'),undefined);
 assert.equal(localSettings.getItem('mj-character'),'{"name":"From backup"}');assert.equal(localSettings.getItem('mj-comfort'),null);assert.equal(localSettings.getItem('mj-parent-pin'),'device-only');
});

test('smudge strokes and new prepared connections survive a backup round-trip',async()=>{
 const strokes=[{points:[10,20,40,50],color:'#163b5c',size:5,mode:'pen'},{points:[20,30,70,80],color:'#163b5c',size:12,mode:'smudge'}];
 await saveDrawing('weekend-2026-10-26','watchtower-study',strokes,{width:760,height:900});
 const progress={...emptyStudy('weekend-2026-10-26','watchtower-study:connections'),pointChoices:{Gratitude:'Value the opportunity to serve'}};
 await saveStudy(progress);
 const backup=validateBackup(await exportJournal(new MemoryStorage()));
 globalThis.indexedDB=new IDBFactory();await importJournal(backup,false,new MemoryStorage());
 assert.deepEqual((await readDrawingPage('weekend-2026-10-26','watchtower-study')).strokes,strokes);
 assert.deepEqual((await readStudy(progress.meetingId,progress.partId)).pointChoices,progress.pointChoices);
 backup.engagement[0].value.pointChoices={Gratitude:'Visit someone who is unwell'};
 assert.throws(()=>validateBackup(backup),/Invalid listening points/);
});

test('colour fills preserve their original paper extent through backup and reject malformed operations',async()=>{
 const strokes=[{points:[20,30],color:'#163b5c',size:5,mode:'fill',fillBounds:{width:760,height:900}}];
 await saveDrawing('week-a','reading',strokes,{width:3040,height:3600});
 const backup=validateBackup(await exportJournal(new MemoryStorage()));
 globalThis.indexedDB=new IDBFactory();await importJournal(backup,false,new MemoryStorage());
 assert.deepEqual((await readDrawingPage('week-a','reading')).strokes,strokes);
 for(const invalid of [{width:0,height:900},{width:Infinity,height:900},{width:10,height:900},undefined]){
   const changed=structuredClone(backup);changed.drawings[0].value[0].fillBounds=invalid;
   assert.throws(()=>validateBackup(changed),/Invalid colour fill/);
 }
});

test('bingo grid size and marked words survive backup without accepting invalid sizes',async()=>{
 const progress={...emptyStudy('week-a','talk:bingo:en'),bingoSize:3,bingoWords:['hope','love']};
 await saveStudy(progress);
 const backup=validateBackup(await exportJournal(new MemoryStorage()));
 globalThis.indexedDB=new IDBFactory();await importJournal(backup,true,new MemoryStorage());
 assert.equal((await readStudy(progress.meetingId,progress.partId)).bingoSize,3);
 assert.deepEqual((await readStudy(progress.meetingId,progress.partId)).bingoWords,['hope','love']);
 backup.engagement[0].value.bingoSize=5;
 assert.throws(()=>validateBackup(backup),/Invalid bingo size/);
});

test('Connect the ideas links and personal examples survive backup and reject unsupported connections',async()=>{
 const progress={...emptyStudy('meeting-2026-10-19','part-8:connections'),pointChoices:{Time:'Visit someone who is unwell',Encouragement:''},draft:'My own example',connectionExamples:{Time:'Make time for a visit'}};
 await saveStudy(progress);
 const backup=validateBackup(await exportJournal(new MemoryStorage()));
 globalThis.indexedDB=new IDBFactory();await importJournal(backup,true,new MemoryStorage());
 const restored=await readStudy(progress.meetingId,progress.partId);
 assert.deepEqual(restored.pointChoices,progress.pointChoices);assert.equal(restored.draft,progress.draft);
 assert.deepEqual(restored.connectionExamples,progress.connectionExamples);
 const invalid=structuredClone(backup);invalid.engagement[0].value.connectionExamples={Time:'x'.repeat(1001)};
 assert.throws(()=>validateBackup(invalid),/Invalid connection examples/);
 invalid.engagement[0].value.connectionExamples={Unsupported:'Words'};
 assert.throws(()=>validateBackup(invalid),/Invalid connection examples/);
 backup.engagement[0].value.pointChoices={Unknown:'Share a scripture'};
 assert.throws(()=>validateBackup(backup),/Invalid listening points/);
 backup.engagement[0].value.pointChoices={Time:'Unsupported example'};
 assert.throws(()=>validateBackup(backup),/Invalid listening points/);
});

test('visit programmes and all three talk notebooks survive backup and restore',async()=>{
 const storage=new MemoryStorage(),visit={...emptyVisit,enabled:true,overseerName:'Visiting Overseer',midweekTitle:'Tuesday topic',publicTitle:'Sunday topic',concludingTitle:'Concluding topic'};
 saveCircuitVisit('2026-10-26',visit,storage);
 for(const [kind,partId] of [['midweek','co-midweek-talk'],['weekend','co-public-talk'],['weekend','co-concluding-talk']]){
  const meetingId=`${kind}-2026-10-26`;
  await saveNote({meetingId,partId,text:partId,updatedAt:'2026-10-27'});
  await saveDrawing(meetingId,partId,[{points:[1,2,3,4],color:'#123456',size:4,mode:'pen'}]);
 }
 const backup=await exportJournal(storage);
 globalThis.indexedDB=new IDBFactory();const restored=new MemoryStorage();
 await importJournal(backup,true,restored);
 assert.deepEqual(readCircuitVisit('2026-11-01',restored),visit);
 for(const [kind,partId] of [['midweek','co-midweek-talk'],['weekend','co-public-talk'],['weekend','co-concluding-talk']]){
  assert.equal((await readNote(`${kind}-2026-10-26`,partId)).text,partId);
  assert.equal((await readDrawingPage(`${kind}-2026-10-26`,partId)).strokes.length,1);
 }
});

test('talk speaker names and titles survive local backup without changing notebook keys',async()=>{
 const storage=new MemoryStorage(),meeting=getMeeting('weekend','2026-10-19'),part=meeting.parts.find(part=>part.type==='PublicTalk');
 saveLocalTalkDetails(meeting.id,part.id,'Local title','Local Speaker',storage);
 await saveNote({meetingId:meeting.id,partId:part.id,text:'My original notes',updatedAt:'2026-10-29'});
 const backup=await exportJournal(storage);
 globalThis.indexedDB=new IDBFactory();const restored=new MemoryStorage();await importJournal(backup,true,restored);
 const talk=personalizeMeeting(meeting,restored,'es').parts.find(item=>item.id===part.id);
 assert.equal(talk.title,'Local title');assert.equal(talk.speakerName,'Local Speaker');
 assert.equal((await readNote(meeting.id,part.id)).text,'My original notes');
});

test('both assembly programmes and all convention days retain separate notebooks through backup and restore',async()=>{
 const storage=new MemoryStorage();
 const assemblies=[{date:'2026-11-21',type:'circuit-overseer',programme:'2026-2027'},{date:'2027-03-14',type:'branch-representative',programme:'2026-2027'}];
 const convention={date:'2026-07-24',programme:'2026'};
 for(const record of assemblies)saveCircuitAssembly(record,storage);
 saveConvention(convention,storage);
 const meetings=[...assemblies.map(assemblyMeeting),...conventionDates(convention.date).map(date=>conventionMeeting(convention,date))];
 for(const meeting of meetings){
  await saveNote({meetingId:meeting.id,partId:'opening-song',text:meeting.id,updatedAt:'2026-10-27'});
  await saveDrawing(meeting.id,'opening-song',[{points:[1,2,3,4],color:'#123456',size:4,mode:'pen'}]);
 }
 const backup=await exportJournal(storage);
 globalThis.indexedDB=new IDBFactory();const restored=new MemoryStorage();await importJournal(backup,true,restored);
 for(const record of assemblies)assert.deepEqual(readCircuitAssembly(record.date,restored),record);
 assert.deepEqual(readConvention(convention.date,restored),convention);
 for(const meeting of meetings){
  assert.equal((await readNote(meeting.id,'opening-song')).text,meeting.id);
  assert.equal((await readDrawingPage(meeting.id,'opening-song')).strokes.length,1);
 }
});

test('listening choices, ready signals and interest settings survive a local backup',async()=>{
 const storage=new MemoryStorage();storage.setItem('mj-listening-preferences',JSON.stringify({lenses:['Maps','People'],pauseEvery:3,haptics:false}));
 const study={...emptyStudy('week-a','study'),pointChoices:{'1':'Showing kindness'},comments:[{id:'ready',paragraph:1,text:'My own words',ready:true,given:false}]};
 const reading={...emptyStudy('week-a','reading:listening'),prediction:'A person',predictionChecked:'I noticed that'};
 await saveStudy(study);await saveStudy(reading);
 const backup=validateBackup(await exportJournal(storage));
 globalThis.indexedDB=new IDBFactory();const restored=new MemoryStorage();await importJournal(backup,true,restored);
 assert.deepEqual((await readStudy('week-a','study')).pointChoices,{'1':'Showing kindness'});
 assert.equal((await readStudy('week-a','study')).comments[0].ready,true);
 assert.equal((await readStudy('week-a','reading:listening')).predictionChecked,'I noticed that');
 assert.equal(JSON.parse(restored.getItem('mj-listening-preferences')).pauseEvery,3);
 backup.engagement[0].value.pointChoices={'bad':'choice'};assert.throws(()=>validateBackup(backup),/listening points/);
});
test('invalid files are rejected before altering storage',async()=>{const storage=new MemoryStorage();storage.setItem('mj-character','original');const backup=await exportJournal(storage);backup.notes=[{key:'other:part',value:{meetingId:'week',partId:'part',text:'invalid'}}];await assert.rejects(importJournal(backup,true,storage));assert.equal(storage.getItem('mj-character'),'original');backup.notes=[];backup.preferences['unrelated']='bad';assert.throws(()=>validateBackup(backup));});
test('database upgrade retains existing version-one drawings',async()=>{await new Promise((resolve,reject)=>{const request=indexedDB.open('meeting-journey-local',1);request.onupgradeneeded=()=>{request.result.createObjectStore('notes',{keyPath:'key'});request.result.createObjectStore('drawings',{keyPath:'key'});};request.onsuccess=()=>{const db=request.result,tx=db.transaction('drawings','readwrite');tx.objectStore('drawings').put({key:'old:part',value:[]});tx.oncomplete=()=>{db.close();resolve();};};request.onerror=()=>reject(request.error);});const db=await openDb();assert.ok(db.objectStoreNames.contains('engagement'));db.close();assert.deepEqual((await readDrawingPage('old','part')).strokes,[]);});
