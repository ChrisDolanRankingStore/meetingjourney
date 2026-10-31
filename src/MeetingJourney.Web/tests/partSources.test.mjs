import {test} from 'node:test';
import assert from 'node:assert/strict';
import {partSources} from '../src/partSources.ts';
import {localizeMeeting} from '../src/meetingLocale.ts';
import {getMeeting} from '../../../node-app/meeting-catalog.js';

test('individual midweek scriptures are recovered from prompts and section references without changing notebook IDs',()=>{
 for(const language of ['en','es']){
  const meeting=localizeMeeting(getMeeting('midweek','2026-10-19'),language);
  const sources=id=>partSources(meeting.parts.find(part=>part.id===id),meeting.material);
  assert.ok(sources('part-1').scriptures.some(link=>link.url.includes('24045003')));
  assert.ok(sources('part-1').scriptures.some(link=>link.url.includes('24045005')));
  assert.equal(sources('part-2').scriptures.length,1);
  assert.ok(sources('part-2').scriptures[0].url.includes('24046022'));
  assert.ok(sources('part-3').scriptures[0].url.includes('24046013-24046024'));
  assert.ok(sources('part-8').scriptures.some(link=>link.url.includes('58013016')));
  assert.equal(sources('part-9').scriptures.length,0);
  assert.equal(sources('living-song').scriptures.length,0);
  assert.equal(sources('living-song').primary.url,meeting.parts.find(part=>part.id==='living-song').appUrl);
  assert.notEqual(sources('living-song').primary.url,meeting.material.appUrl);
 }
});

test('exact publications, research links and scripture passages stay distinct and duplicate sources are removed',()=>{
 const meeting=getMeeting('midweek','2026-10-19');
 const url='https://www.jw.org/finder?docid=123456';
 const research='https://www.jw.org/finder?docid=987654';
 const part={...meeting.parts[2],appUrl:url,sourceUrl:url,researchUrl:research,references:[
  {label:'Publication',url,note:'Paragraphs 5-7'},{label:'Research',url:research},{label:'Duplicate',url:research},
  {label:'A verse',url:'https://www.jw.org/finder?bible=43003016'}
 ]};
 const sources=partSources(part,meeting.material);
 assert.equal(sources.primary.url,url);
 assert.equal(sources.primary.label,'Publication');
 assert.equal(sources.primary.note,'Paragraphs 5-7');
 assert.equal(sources.publications.filter(link=>link.url===research).length,1);
 assert.ok(sources.publications.some(link=>link.url.includes('bible=43003016')));
 assert.ok(!sources.publications.some(link=>link.url===url));
 const researchOnly=partSources({...part,appUrl:undefined,sourceUrl:undefined},meeting.material);
 assert.equal(researchOnly.primary.url,research);
});

test('locally chosen weekend talks and unnumbered songs do not masquerade as Watchtower sources',()=>{
 const meeting=localizeMeeting(getMeeting('weekend','2026-10-19'),'en');
 for(const part of meeting.parts.filter(part=>part.type==='PublicTalk'||part.id==='opening-song')){
  assert.equal(partSources(part,meeting.material).primary.url,undefined);
  const explicit='https://www.jw.org/finder?docid=123456';
  assert.equal(partSources({...part,appUrl:explicit,sourceUrl:explicit},meeting.material).primary.url,explicit);
 }
 assert.equal(partSources(meeting.parts.find(part=>part.type==='WatchtowerStudy'),meeting.material).primary.url,meeting.material.appUrl);
});
