import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionActivityFor,generalConnections,hasConnectIdeas,validConnectionChoice} from '../src/connectionActivity.ts';
import {readPublishedMeeting} from '../../../node-app/published-content.js';
import {t} from '../src/i18n.ts';
import {validatePublishedWeek} from '../../../node-app/published-content.js';

test('prepared connections correspond to reviewed parts and have Spanish translations',()=>{
 for(const [meetingId,kind,date,partId] of [
  ['meeting-2026-10-19','midweek','2026-10-19','part-8'],
  ['meeting-2026-10-26','midweek','2026-10-26','part-1'],
  ['weekend-2026-10-26','weekend','2026-10-26','watchtower-study']
 ]) {
  const meeting=readPublishedMeeting(kind,date);
  const part=meeting.parts.find(part=>part.id===partId);
  assert.ok(part);
  assert.ok(hasConnectIdeas(meetingId,part));
  const activity=connectionActivityFor(meetingId,partId);
  assert.equal(activity.sources.length,4);assert.equal(activity.targets.length,4);
  for(const text of [activity.title,...activity.sources,...activity.targets]) assert.notEqual(t(text,undefined,'es'),text);
  assert.ok(validConnectionChoice(meetingId,`${partId}:connections`,activity.sources[0],activity.targets[0]));
  assert.ok(validConnectionChoice(meetingId,`${partId}:connections`,activity.sources[0],''));
  assert.equal(validConnectionChoice(meetingId,`${partId}:connections`,'unreviewed','unreviewed'),false);
 }
 assert.equal(connectionActivityFor('weekend-2026-11-02','watchtower-study'),generalConnections);
 assert.equal(connectionActivityFor('weekend-2026-10-26','public-talk'),generalConnections);
 for(const type of ['PublicTalk','Song','Talk','WatchtowerStudy','CongregationBibleStudy','Demonstration']){
   assert.ok(hasConnectIdeas('future-week',{id:type,type}));
 }
 for(const text of [generalConnections.title,...generalConnections.sources,...generalConnections.targets]) assert.notEqual(t(text,undefined,'es'),text);
 assert.ok(validConnectionChoice('future-week','talk:connections',generalConnections.sources[0],generalConnections.targets[0]));
});

test('future reviewed bilingual connections use content metadata rather than date-specific code',()=>{
 const meeting=structuredClone(readPublishedMeeting('midweek','2026-10-26'));
 meeting.id='meeting-2026-11-02';meeting.weekOf='2026-11-02';
 const part=meeting.parts.find(part=>part.id==='part-1');
 part.connections={reviewedAt:'2026-11-01',en:{title:'Prepared title',sources:['A','B','C','D'],targets:['One','Two','Three','Four']},es:{title:'Título preparado',sources:['A','B','C','D'],targets:['Uno','Dos','Tres','Cuatro']}};
 assert.ok(validatePublishedWeek({approved:true,reviewedAt:'2026-11-01',meeting}));
 assert.ok(hasConnectIdeas(meeting.id,part));
 assert.equal(connectionActivityFor(meeting.id,part.id,part).title,'Prepared title');
 const invalid=structuredClone(meeting);invalid.parts.find(part=>part.id==='part-1').connections.es.targets.pop();
 assert.throws(()=>validatePublishedWeek({approved:true,reviewedAt:'2026-11-01',meeting:invalid}),/bilingual/);
 assert.equal(hasConnectIdeas(meeting.id,{...part,type:'PublicTalk'}),true);
});
