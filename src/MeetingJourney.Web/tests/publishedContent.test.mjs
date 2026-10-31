import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {getMeeting} from '../../../node-app/meeting-catalog.js';import {validatePublishedWeek,readPublishedMeeting} from '../../../node-app/published-content.js';
const entry=()=>({approved:true,reviewedAt:'2026-10-25',meeting:getMeeting('weekend','2026-10-25')});
test('reviewed weekly content can change without rebuilding the client or restarting the server',()=>{const folder=mkdtempSync(join(tmpdir(),'mj-week-test-'));try{const data=entry();writeFileSync(join(folder,'weekend-2026-10-19.json'),JSON.stringify(data));assert.equal(readPublishedMeeting('weekend','2026-10-25',folder).kind,'weekend');data.meeting.theme='New reviewed title';writeFileSync(join(folder,'weekend-2026-10-19.json'),JSON.stringify(data));assert.equal(readPublishedMeeting('weekend','2026-10-25',folder).theme,'New reviewed title');assert.equal(readPublishedMeeting('midweek','2026-10-25',folder),undefined);}finally{rmSync(folder,{recursive:true,force:true});}});
test('unreviewed content, mismatched dates, unsafe links and invalid paragraph ranges are rejected',()=>{const data=entry();data.approved=false;assert.throws(()=>validatePublishedWeek(data));data.approved=true;data.meeting.weekOf='2026-10-20';assert.throws(()=>validatePublishedWeek(data));data.meeting.weekOf='2026-10-19';data.meeting.material.appUrl='javascript:alert(1)';assert.throws(()=>validatePublishedWeek(data));data.meeting.material.appUrl='https://www.jw.org/finder?docid=2026522';data.meeting.parts[0].studyGuide={paragraphCount:18,cues:[{from:19,to:20,prompt:'Outside the study'}]};assert.throws(()=>validatePublishedWeek(data));});
test('dated study guides have the checked paragraph counts and every cue stays within its study',()=>{for(const[date,count]of[['2026-10-25',18],['2026-11-01',16]]){const part=getMeeting('weekend',date).parts.find(p=>p.type==='WatchtowerStudy');assert.equal(part.studyGuide.paragraphCount,count);for(const cue of part.studyGuide.cues){assert.ok(cue.from>=1&&cue.to<=count);assert.ok(cue.prompt.length<180);}}});

test('reviewed midweek programmes retain individual assignments and exact gems research sources',()=>{
 for(const [date,count,verse,research,chapter] of [
  ['2026-10-19',14,'Jeremiah 46:22','1200004566','1102025913'],
  ['2026-10-26',13,'Jeremiah 48:6','1200002555','1102025914']
 ]){
  const meeting=readPublishedMeeting('midweek',date);
  assert.deepEqual(getMeeting('midweek',date),meeting);
  assert.equal(meeting.parts.length,count);
  assert.equal(new Set(meeting.parts.map(part=>part.id)).size,count);
  const gems=meeting.parts.find(part=>part.id==='part-2');
  assert.equal(gems.textReference,verse);
  assert.ok(gems.question.length>30);
  assert.match(gems.researchUrl,new RegExp(`docid=${research}`));
  for(const part of meeting.parts.filter(part=>part.type==='Demonstration'||part.type==='BibleReading'))assert.ok(part.references.length>0,`${date} ${part.id} assignment source`);
  const study=meeting.parts.find(part=>part.type==='CongregationBibleStudy');
  assert.match(study.appUrl,new RegExp(`docid=${chapter}`));
  assert.notEqual(study.summary,'Keep one personal discovery from the discussion.');
 }
 const published=readPublishedMeeting('midweek','2026-10-26');
 const bundled=getMeeting('midweek','2026-10-26');
 assert.deepEqual(bundled,published);
 assert.deepEqual(bundled.parts.map(part=>part.id),['opening-song','opening-comments','part-1','part-2','part-3','part-4','part-5','part-6','living-song','part-7','part-8','closing-comments','closing-song']);
 assert.equal(bundled.parts.find(part=>part.id==='part-1').title,'Jehovah Is a Righteous and Merciful Judge');
});
