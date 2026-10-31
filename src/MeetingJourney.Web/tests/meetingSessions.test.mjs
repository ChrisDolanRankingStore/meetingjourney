import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assemblyMeeting} from '../src/circuitAssembly.ts';
import {conventionMeeting, conventionDates} from '../src/convention.ts';
import {hasDaySessions, sessionForPart, sessionMapPoint, sessionPartIndices} from '../src/meetingSessions.ts';
import {getMeeting} from '../../../node-app/meeting-catalog.js';

const convention={date:'2026-07-24',programme:'2026'};
const meetings=[
  assemblyMeeting({date:'2026-11-28',type:'circuit-overseer',programme:'2026-2027'}),
  assemblyMeeting({date:'2027-03-14',type:'branch-representative',programme:'2026-2027'}),
  ...conventionDates(convention.date).map(date=>conventionMeeting(convention,date))
];
test('each full day splits exactly at afternoon music without changing notebook IDs or global stop numbers',()=>{
  meetings.forEach((meeting,index)=>{
    assert.equal(hasDaySessions(meeting),true);
    const morning=sessionPartIndices(meeting,'morning'),afternoon=sessionPartIndices(meeting,'afternoon');
    assert.deepEqual([morning.length,afternoon.length],[[10,10],[9,10],[9,8],[11,15],[11,7]][index]);
    assert.deepEqual([...morning,...afternoon],meeting.parts.map((_,i)=>i));
    assert.equal(meeting.parts[afternoon[0]].id,'afternoon-music');
    assert.equal(sessionForPart(meeting,morning.at(-1)),'morning');
    assert.equal(sessionForPart(meeting,afternoon[0]),'afternoon');
    for(const indices of [morning,afternoon]){
      const points=indices.map((_,i)=>sessionMapPoint(i,indices.length));
      assert.equal(new Set(points.map(point=>`${point.x}:${point.y}`)).size,indices.length);
      assert.ok(points.every(point=>point.x>=25&&point.x<=75&&point.y>=8&&point.y<=92));
    }
  });
});
test('ordinary meetings keep their complete unsplit routes',()=>{
  for(const kind of ['midweek','weekend']){
    const meeting=getMeeting(kind,'2026-10-25');
    assert.equal(hasDaySessions(meeting),false);
    assert.deepEqual(sessionPartIndices(meeting,'morning'),meeting.parts.map((_,i)=>i));
  }
});
