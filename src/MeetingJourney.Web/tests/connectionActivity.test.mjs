import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionActivityFor,hasConnectIdeas,validConnectionChoice} from '../src/connectionActivity.ts';
import {readPublishedMeeting} from '../../../node-app/published-content.js';
import {t} from '../src/i18n.ts';

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
 assert.equal(connectionActivityFor('weekend-2026-11-02','watchtower-study'),undefined);
 assert.equal(connectionActivityFor('weekend-2026-10-26','public-talk'),undefined);
});
