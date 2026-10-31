import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeListeningPreferences,pauseBoundary,allowsComments,appendListeningPoint,localRehearsalVoices} from '../src/listeningPreferences.ts';
import {getMeeting} from '../../../node-app/meeting-catalog.js';
import {validatePublishedWeek} from '../../../node-app/published-content.js';
import {localizeMeeting} from '../src/meetingLocale.ts';

test('public talks have no audience comments while both discussion studies do',()=>{
 assert.equal(allowsComments('PublicTalk'),false);
 assert.equal(allowsComments('BibleReading'),false);
 assert.equal(allowsComments('WatchtowerStudy'),true);
 assert.equal(allowsComments('CongregationBibleStudy'),true);
});
test('spoken rehearsal only offers offline voices in the chosen language',()=>{
 const localEn={localService:true,lang:'en-GB'},localEs={localService:true,lang:'es-ES'},remote={localService:false,lang:'en-US'};
 assert.deepEqual(localRehearsalVoices([remote,localEs,localEn],'en'),[localEn]);
 assert.deepEqual(localRehearsalVoices([remote,localEs,localEn],'es'),[localEs]);
 assert.deepEqual(localRehearsalVoices([remote],'en'),[]);
});
test('listening settings allow two unique interests and safe optional pauses',()=>{
 assert.deepEqual(normalizeListeningPreferences(null),{lenses:[],pauseEvery:0,haptics:false});
 assert.deepEqual(normalizeListeningPreferences({lenses:['Maps','Maps','Animals','Food','invalid'],pauseEvery:5,haptics:true}),{lenses:['Maps','Animals'],pauseEvery:5,haptics:true});
 assert.deepEqual(normalizeListeningPreferences({lenses:'People',pauseEvery:-1,haptics:'yes'}),{lenses:[],pauseEvery:0,haptics:false});
 assert.equal(pauseBoundary(1,4,0),false);
 assert.equal(pauseBoundary(2,3,3),false);
 assert.equal(pauseBoundary(3,4,3),true);
 assert.equal(pauseBoundary(6,7,3),true);
 assert.equal(pauseBoundary(7,6,3),false);
 assert.equal(pauseBoundary(4,4,3),false);
});
test('a point adds to a personal draft without erasing it or duplicating the choice',()=>{
 assert.equal(appendListeningPoint(undefined,'Showing kindness'),'Showing kindness');
 assert.equal(appendListeningPoint('My thought','Showing kindness'),'My thought\nShowing kindness');
 assert.equal(appendListeningPoint('My thought\nShowing kindness','Showing kindness'),'My thought\nShowing kindness');
 assert.ok(appendListeningPoint('x'.repeat(10000),'Showing kindness').length<=10000);
});
test('dated listening point choices accompany paragraph cues and translate into Spanish',()=>{
 for(const date of ['2026-10-25','2026-11-01']){
  const meeting=getMeeting('weekend',date), spanish=localizeMeeting(meeting,'es');
  const guide=meeting.parts.find(part=>part.type==='WatchtowerStudy').studyGuide;
  const localized=spanish.parts.find(part=>part.type==='WatchtowerStudy').studyGuide;
  guide.cues.forEach((cue,index)=>{
   assert.equal(cue.pointChoices.length,3);
   cue.pointChoices.forEach((choice,n)=>assert.notEqual(localized.cues[index].pointChoices[n],choice));
  });
  const entry={approved:true,reviewedAt:'2026-10-27',meeting};
  assert.ok(validatePublishedWeek(entry));
  guide.cues[0].pointChoices=['Only one'];
  assert.throws(()=>validatePublishedWeek(entry),/listening point/);
 }
});
