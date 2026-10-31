import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, parseCalendarDate, weekOfDate, suggestedMeeting, resolveMeetingSelection, normaliseMeetingDays } from '../../../node-app/meeting-schedule.js';
import { getMeeting } from '../../../node-app/meeting-catalog.js';
import { restoreMeetingPart, storyMoment } from '../src/journeyExperience.ts';
import { buildDiscoveryTreasures } from '../src/discoveryBook.ts';

test('suggestions choose the next congregation meeting, including its actual week', () => {
  assert.deepEqual(suggestedMeeting('2026-10-25'), { type: 'weekend', date: '2026-10-25' });
  assert.deepEqual(suggestedMeeting('2026-10-26'), { type: 'midweek', date: '2026-10-28' });
  assert.deepEqual(suggestedMeeting('2026-10-28'), { type: 'midweek', date: '2026-10-28' });
  assert.deepEqual(suggestedMeeting('2026-10-29'), { type: 'weekend', date: '2026-11-01' });
  assert.equal(weekOfDate('2026-11-01'), '2026-10-26');
  assert.equal(weekOfDate('2027-01-01'), '2026-12-28');
});

test('custom meeting days work even when neither meeting is at the default day', () => {
  const days = { midweek: 2, weekend: 5 };
  assert.deepEqual(suggestedMeeting('2026-10-25', days), { type: 'midweek', date: '2026-10-27' });
  assert.deepEqual(suggestedMeeting('2026-10-28', days), { type: 'weekend', date: '2026-10-30' });
  assert.deepEqual(normaliseMeetingDays({ midweek: 12, weekend: -1 }), { midweek: 3, weekend: 0 });
});

test('manual preparation/review survives reopening today and expires on the next local day', () => {
  const choice = { type: 'midweek', date: '2026-10-19', chosenOn: '2026-10-25' };
  assert.deepEqual(resolveMeetingSelection('2026-10-25', undefined, choice), { type: 'midweek', date: '2026-10-19' });
  assert.deepEqual(resolveMeetingSelection('2026-10-26', undefined, choice), { type: 'midweek', date: '2026-10-28' });
  assert.deepEqual(resolveMeetingSelection('2026-10-25', undefined, { ...choice, date: '2026-02-30' }), { type: 'weekend', date: '2026-10-25' });
});

test('calendar handling rejects invalid dates and preserves local dates across clock changes', () => {
  assert.throws(() => parseCalendarDate('2026-02-30'), RangeError);
  assert.throws(() => parseCalendarDate('25/10/2026'), RangeError);
  assert.equal(localDateKey(new Date(2026, 9, 25, 0, 5)), '2026-10-25');
  assert.equal(weekOfDate('2026-10-25'), '2026-10-19');
  assert.equal(weekOfDate('2026-03-29'), '2026-03-23');
});

test('weekend journey has its own correct study link and no midweek ministry stops', () => {
  const weekend = getMeeting('weekend', '2026-10-25');
  assert.equal(weekend.id, 'weekend-2026-10-19');
  assert.equal(weekend.contentNotice, undefined);
  assert.equal(getMeeting('weekend', '2026-11-01').contentNotice, undefined);
  assert.ok(weekend.parts.some(part => part.type === 'PublicTalk'));
  assert.ok(weekend.parts.some(part => part.type === 'WatchtowerStudy'));
  assert.ok(!weekend.parts.some(part => part.section === 'FieldMinistry'));
  assert.match(weekend.parts.find(part => part.type === 'WatchtowerStudy').appUrl, /docid=2026522/);
  assert.match(getMeeting('weekend', '2026-11-01').material.appUrl, /docid=2026523/);
  for (const part of weekend.parts) assert.ok(storyMoment(part).image);
});

test('changing meeting types cannot inherit another meeting place, notes or drawings', () => {
  const midweek = getMeeting('midweek', '2026-10-25');
  const weekend = getMeeting('weekend', '2026-10-25');
  assert.equal(midweek.id, 'meeting-2026-10-19'); // existing data preserved
  const storage = { getItem: key => key === `mj-place:${midweek.id}` ? 'closing-song' : null };
  assert.equal(restoreMeetingPart(midweek, storage), midweek.parts.length - 1);
  assert.equal(restoreMeetingPart(weekend, storage), 0);
  const oldNote = { meetingId: midweek.id, partId: 'closing-song', text: 'My thought' };
  const drawing = { key: `${midweek.id}:closing-song`, value: [{ mode: 'pen', points: [1, 1, 2, 2] }] };
  assert.equal(buildDiscoveryTreasures(weekend, [oldNote], [drawing]).length, 0);
  assert.equal(buildDiscoveryTreasures(midweek, [oldNote], [drawing]).length, 1);
});

test('unavailable weekly details use an explicit general outline instead of a stale week', () => {
  for (const kind of ['midweek', 'weekend']) {
    const meeting = getMeeting(kind, '2027-01-03');
    assert.equal(meeting.weekOf, '2026-12-28');
    assert.equal(meeting.contentStatus, 'general');
    assert.match(meeting.contentNotice, /not been added/);
    assert.doesNotMatch(JSON.stringify(meeting), /2026522|202026258|Jeremiah 45/);
    assert.ok(meeting.parts.length > 0);
    assert.equal(new Set(meeting.parts.map(part => part.id)).size, meeting.parts.length);
  }
  assert.throws(() => getMeeting('invalid', '2026-10-25'), RangeError);
});
