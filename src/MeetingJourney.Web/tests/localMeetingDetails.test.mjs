import {test} from 'node:test';
import assert from 'node:assert/strict';
import {personalizeMeeting, readMeetingDetails, saveLocalTalkDetails, saveLocalTitle, saveSongDetails, songDraft} from '../src/localMeetingDetails.ts';
import {buildDiscoveryTreasures} from '../src/discoveryBook.ts';

const meeting = {id: 'weekend-2026-10-19', weekOf: '2026-10-19', kind: 'weekend', theme: 'Weekend meeting', bibleReading: '', material: {title: 'Weekend companion outline', introduction: '', sections: []}, parts: [
  {id: 'opening-song', type: 'Song', title: 'Opening song and prayer', section: 'Opening'},
  {id: 'public-talk', type: 'PublicTalk', title: 'Public talk', section: 'PublicTalk'},
  {id: 'study-song', type: 'Song', title: 'Song 106', section: 'Watchtower'},
  {id: 'closing-song', type: 'Song', title: 'Closing song and prayer', section: 'Closing'}
].map(part => ({...part, summary: '', references: [], activities: []}))};
const makeStorage = () => {
  const entries = new Map();
  return {getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value)};
};

test('speaker names are optional, local to the meeting, verbatim in both languages and independent of title resets', () => {
  const storage = makeStorage(), original = structuredClone(meeting);
  saveLocalTalkDetails(meeting.id, 'public-talk', '  A local title  ', '  Visiting Speaker  ', storage);
  for (const language of ['en', 'es']) {
    const result = personalizeMeeting(meeting, storage, language);
    assert.equal(result.parts[1].title, 'A local title');
    assert.equal(result.parts[1].speakerName, 'Visiting Speaker');
    assert.deepEqual(result.parts.map(part => part.id), meeting.parts.map(part => part.id));
  }
  assert.deepEqual(meeting, original);
  assert.equal(personalizeMeeting({...meeting, id:'weekend-2026-10-26'}, storage).parts[1].speakerName, undefined);
  saveLocalTitle(meeting.id, 'public-talk', '', storage);
  assert.equal(personalizeMeeting(meeting, storage).parts[1].speakerName, 'Visiting Speaker');
  assert.equal(personalizeMeeting(meeting, storage).parts[1].title, 'Public talk');
  saveLocalTalkDetails(meeting.id, 'public-talk', '', '', storage);
  assert.equal(personalizeMeeting(meeting, storage).parts[1].speakerName, undefined);
});

test('speaker details preserve legacy titles and songs, limit input and propagate failed writes', () => {
  const storage = makeStorage();
  saveLocalTitle(meeting.id, 'public-talk', 'Legacy title', storage);
  assert.equal(personalizeMeeting(meeting, storage).parts[1].title, 'Legacy title');
  saveSongDetails(meeting.id, 'opening-song', '21', 'Local song', storage);
  saveLocalTalkDetails(meeting.id, 'public-talk', 'A'.repeat(130), 'B'.repeat(130), storage);
  assert.equal(personalizeMeeting(meeting, storage).parts[1].speakerName.length, 120);
  assert.equal(personalizeMeeting(meeting, storage).parts[1].title.length, 120);
  assert.equal(songDraft(meeting.parts[0], meeting.id, storage).songNumber, 21);
  const before = storage.getItem(`mj-part-titles:${meeting.id}`);
  assert.throws(() => saveLocalTalkDetails(meeting.id, 'public-talk', '', 'New name', {...storage,setItem(){throw Error('Storage full');}}), /Storage full/);
  assert.equal(storage.getItem(`mj-part-titles:${meeting.id}`), before);
});

test('assembly and convention speakers never override published programme titles', () => {
  const storage = makeStorage();
  for (const kind of ['assembly', 'convention']) {
    const programme = {...meeting, kind, id:kind+'-2026-10-19'};
    saveLocalTalkDetails(programme.id, 'public-talk', 'Ignore this title', 'Local Speaker', storage);
    const result = personalizeMeeting(programme, storage);
    assert.equal(result.parts[1].title, 'Public talk');
    assert.equal(result.parts[1].speakerName, 'Local Speaker');
    assert.equal(result.parts[0].speakerName, undefined);
  }
});

test('weekend song details update titles without changing programme IDs or source data', () => {
  const storage = makeStorage();
  saveSongDetails(meeting.id, 'opening-song', '021', 'Kingdom', storage);
  const result = personalizeMeeting(meeting, storage);
  assert.equal(result.parts[0].title, 'Song 21 - Kingdom');
  assert.equal(result.parts[0].songNumber, 21);
  assert.equal(result.parts[0].songTitle, 'Kingdom');
  assert.deepEqual(result.parts.map(part => part.id), meeting.parts.map(part => part.id));
  assert.equal(meeting.parts[0].title, 'Opening song and prayer');
});

test('each week and each song retain their own details after reloading storage', () => {
  const storage = makeStorage();
  saveSongDetails(meeting.id, 'opening-song', '21', 'Opening title', storage);
  saveSongDetails(meeting.id, 'closing-song', '87', 'Closing title', storage);
  const next = {...meeting, id: 'weekend-2026-10-26'};
  assert.equal(personalizeMeeting(next, storage).parts[0].title, meeting.parts[0].title);
  assert.equal(personalizeMeeting(meeting, storage).parts[3].title, 'Song 87 - Closing title');
  assert.deepEqual(songDraft(meeting.parts[0], meeting.id, storage), {songNumber: 21, songTitle: 'Opening title'});
  assert.equal(songDraft(meeting.parts[2], meeting.id, storage).songNumber, 106);
});

test('saved discoveries and drawing pages keep their original stop and adopt its personal title', () => {
  const storage = makeStorage();
  saveSongDetails(meeting.id, 'opening-song', '21', 'My song title', storage);
  const note = {meetingId: meeting.id, partId: 'opening-song', text: 'A thought to remember'};
  const drawing = {key: `${meeting.id}:opening-song`, value: [{points: [1, 2, 3, 4], mode: 'pen', size: 4, color: '#123456'}]};
  const treasures = buildDiscoveryTreasures(personalizeMeeting(meeting, storage), [note], [drawing]);
  assert.equal(treasures.length, 1);
  assert.equal(treasures[0].part.title, 'Song 21 - My song title');
  assert.equal(treasures[0].note, note);
  assert.equal(treasures[0].drawings.length, 1);
  assert.deepEqual(buildDiscoveryTreasures(personalizeMeeting(meeting, storage), [], []), []);
});

test('resetting a song restores the programme and preserves other local part titles', () => {
  const storage = makeStorage();
  saveLocalTitle(meeting.id, 'public-talk', 'Our local talk topic', storage);
  saveSongDetails(meeting.id, 'study-song', '62', 'Another song', storage);
  saveLocalTitle(meeting.id, 'study-song', '', storage);
  const restored = personalizeMeeting(meeting, storage);
  assert.match(restored.parts[2].title, /^Song 106 - /);
  assert.equal(restored.parts[2].songNumber, 106);
  assert.equal(restored.parts[1].title, 'Our local talk topic');
});

test('invalid or empty song numbers cannot overwrite a previously saved song', () => {
  const storage = makeStorage();
  saveSongDetails(meeting.id, 'opening-song', '21', '', storage);
  for (const number of ['0', '-1', '1.5', '1e2', '1000', 'NaN']) {
    assert.throws(() => saveSongDetails(meeting.id, 'opening-song', number, 'Title', storage));
  }
  assert.throws(() => saveSongDetails(meeting.id, 'opening-song', '', '  ', storage));
  assert.equal(personalizeMeeting(meeting, storage).parts[0].songNumber, 21);
  saveSongDetails(meeting.id, 'closing-song', '', 'Title only', storage);
  assert.equal(personalizeMeeting(meeting, storage).parts[3].title, 'Song - Title only');
});

test('malformed stored metadata is ignored and midweek schedules do not adopt weekend song objects', () => {
  const storage = makeStorage();
  storage.setItem(`mj-part-titles:${meeting.id}`, JSON.stringify({'opening-song': {songNumber: -8, songTitle: 'Bad'}}));
  assert.equal(personalizeMeeting(meeting, storage).parts[0].title, meeting.parts[0].title);
  storage.setItem(`mj-part-titles:${meeting.id}`, '{broken JSON');
  assert.equal(Object.keys(readMeetingDetails(meeting.id, storage)).length, 0);
  assert.equal(Object.keys(readMeetingDetails(meeting.id, {getItem() {throw Error('Storage blocked');}})).length, 0);
  saveSongDetails(meeting.id, 'opening-song', '21', 'A title', storage);
  assert.equal(personalizeMeeting({...meeting, kind: 'midweek'}, storage).parts[0].title, meeting.parts[0].title);
});
