import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getMeeting} from '../../../node-app/meeting-catalog.js';
import {applyCircuitVisit, emptyVisit, readCircuitVisit, resolveVisitSelection, savedVisitWeeks, saveCircuitVisit, suggestVisitMeeting, visitDates} from '../src/circuitVisit.ts';
import {personalizeMeeting, saveLocalTitle} from '../src/localMeetingDetails.ts';
import {buildDiscoveryTreasures} from '../src/discoveryBook.ts';

const makeStorage = () => {
  const entries = new Map();
  return {get length() {return entries.size;}, key: index => [...entries.keys()][index] ?? null, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value)};
};
const visit = {...emptyVisit, enabled: true};

test('an optional overseer name appears on all visit talks without leaking into other weeks or the study', () => {
  const storage = makeStorage();
  storage.setItem('mj-circuit-visit:2026-10-26', JSON.stringify({enabled:true,midweekTitle:'An older visit'}));
  assert.equal(readCircuitVisit('2026-10-26', storage).overseerName, '');
  saveCircuitVisit('2026-10-28', {...visit, overseerName:'  Visiting Overseer  '}, storage);
  for (const kind of ['midweek', 'weekend']) for (const language of ['en', 'es']) {
    const source = getMeeting(kind, '2026-10-26');
    const result = personalizeMeeting(source, storage, language);
    for (const part of result.parts.filter(part => part.id.startsWith('co-'))) assert.equal(part.speakerName, 'Visiting Overseer');
    for (const part of result.parts.filter(part => !part.id.startsWith('co-'))) assert.equal(part.speakerName, undefined);
    assert.equal(personalizeMeeting(getMeeting(kind, '2026-11-02'), storage, language).parts.some(part => part.speakerName), false);
  }
  saveCircuitVisit('2026-10-26', {...visit,overseerName:''}, storage);
  assert.equal(personalizeMeeting(getMeeting('weekend', '2026-10-26'),storage).parts.some(part => part.speakerName), false);
});

test('a visit is saved for one Monday-based week spanning Tuesday through Sunday', () => {
  const storage = makeStorage();
  saveCircuitVisit('2026-10-28', {...visit, midweekTitle: '  A personal title  '}, storage);
  assert.equal(readCircuitVisit('2026-11-01', storage).midweekTitle, 'A personal title');
  assert.equal(readCircuitVisit('2026-10-25', storage).enabled, false);
  assert.equal(readCircuitVisit('2026-11-02', storage).enabled, false);
  assert.deepEqual(visitDates('2026-11-01'), {tuesday: '2026-10-27', sunday: '2026-11-01'});
  assert.deepEqual(visitDates('2027-01-01'), {tuesday: '2026-12-29', sunday: '2027-01-03'});
});

test('visits use Tuesday and Sunday without changing usual Wednesday/Thursday or Saturday meetings', () => {
  const storage = makeStorage();
  saveCircuitVisit('2026-10-26', visit, storage);
  for (const midweek of [3, 4]) {
    const days = {midweek, weekend: 6};
    assert.deepEqual(suggestVisitMeeting('2026-10-26', days, storage), {type: 'midweek', date: '2026-10-27'});
    assert.deepEqual(suggestVisitMeeting('2026-10-27', days, storage), {type: 'midweek', date: '2026-10-27'});
    assert.deepEqual(suggestVisitMeeting('2026-10-28', days, storage), {type: 'weekend', date: '2026-11-01'});
    assert.deepEqual(suggestVisitMeeting('2026-11-01', days, storage), {type: 'weekend', date: '2026-11-01'});
    assert.deepEqual(suggestVisitMeeting('2026-11-02', days, storage), {type: 'midweek', date: midweek === 3 ? '2026-11-04' : '2026-11-05'});
  }
  saveCircuitVisit('2026-10-26', emptyVisit, storage);
  assert.deepEqual(suggestVisitMeeting('2026-10-26', {midweek: 4, weekend: 6}, storage), {type: 'midweek', date: '2026-10-29'});
});

test('future dates are listed, apply only to selected visit weeks, and can be disabled independently', () => {
  const storage = makeStorage();
  saveCircuitVisit('2027-01-15', {...visit, midweekTitle: 'January visit'}, storage);
  saveCircuitVisit('2026-11-18', {...visit, concludingTitle: 'November visit'}, storage);
  assert.deepEqual(savedVisitWeeks(storage), ['2026-11-16', '2027-01-11']);
  const current = getMeeting('midweek', '2026-10-28');
  assert.deepEqual(applyCircuitVisit(current, storage, 'en'), current);
  assert.deepEqual(suggestVisitMeeting('2026-10-26', {midweek: 4, weekend: 6}, storage), {type: 'midweek', date: '2026-10-29'});
  const future = getMeeting('midweek', '2027-01-14');
  assert.equal(applyCircuitVisit(future, storage, 'en').parts.find(part => part.id === 'co-midweek-talk').title, 'January visit');
  const manual = {type: 'midweek', date: '2027-01-14', chosenOn: '2026-10-26'};
  assert.deepEqual(resolveVisitSelection('2026-10-26', undefined, manual, storage), {type: 'midweek', date: '2027-01-12'});
  saveCircuitVisit('2026-11-17', {...visit, enabled: false}, storage);
  assert.deepEqual(savedVisitWeeks(storage), ['2027-01-11']);
  assert.equal(readCircuitVisit('2027-01-17', storage).enabled, true);
});

test('manual preparation maps to visit dates while expired or invalid choices use automatic selection', () => {
  const storage = makeStorage();
  saveCircuitVisit('2026-10-26', visit, storage);
  const days = {midweek: 4, weekend: 6};
  const choice = {type: 'midweek', date: '2026-10-29', chosenOn: '2026-10-28'};
  assert.deepEqual(resolveVisitSelection('2026-10-28', days, choice, storage), {type: 'midweek', date: '2026-10-27'});
  assert.deepEqual(resolveVisitSelection('2026-10-28', days, {...choice, type: 'weekend'}, storage), {type: 'weekend', date: '2026-11-01'});
  for (const override of [null, {...choice, date: '2026-02-30'}, {...choice, chosenOn: '2026-10-27'}]) {
    assert.deepEqual(resolveVisitSelection('2026-10-28', days, override, storage), {type: 'weekend', date: '2026-11-01'});
  }
});

test('midweek replaces only the Bible study and weekend adds a separate concluding talk after the shortened study', () => {
  const storage = makeStorage();
  saveCircuitVisit('2026-10-26', {...visit, publicTitle: 'Our visiting speaker'}, storage);
  for (const kind of ['midweek', 'weekend']) {
    const source = getMeeting(kind, '2026-10-26'), snapshot = structuredClone(source);
    const result = applyCircuitVisit(source, storage, 'en');
    assert.equal(result.id, source.id);
    assert.equal(result.weekOf, source.weekOf);
    assert.deepEqual(source, snapshot);
    assert.deepEqual(applyCircuitVisit(result, storage, 'en'), result);
    assert.equal(new Set(result.parts.map(part => part.id)).size, result.parts.length);
    if (kind === 'midweek') {
      assert.equal(result.parts.some(part => part.type === 'CongregationBibleStudy'), false);
      assert.equal(result.parts.find(part => part.id === 'co-midweek-talk').durationMinutes, 30);
      assert.deepEqual(result.parts.filter(part => part.id !== 'co-midweek-talk'), source.parts.filter(part => part.type !== 'CongregationBibleStudy'));
    } else {
      const study = result.parts.findIndex(part => part.type === 'WatchtowerStudy');
      assert.equal(result.parts[study].durationMinutes, 30);
      assert.equal(result.parts[study + 1].id, 'co-concluding-talk');
      assert.equal(result.parts[study + 1].durationMinutes, 30);
      assert.equal(result.parts.find(part => part.id === 'co-public-talk').title, 'Our visiting speaker');
      assert.deepEqual(result.parts[study].studyGuide, source.parts.find(part => part.type === 'WatchtowerStudy').studyGuide);
      assert.deepEqual(result.parts.at(-1), source.parts.at(-1));
    }
    for (const part of result.parts.filter(part => part.id.startsWith('co-'))) {
      assert.equal(part.type, 'PublicTalk');
      assert.deepEqual(part.activities, []);
      assert.deepEqual(part.references, []);
    }
  }
});

test('visit titles stay personal, defaults translate, and other weeks remain unchanged', () => {
  const storage = makeStorage(), source = getMeeting('weekend', '2026-10-26');
  saveLocalTitle(source.id, 'public-talk', 'Normal local talk', storage);
  saveCircuitVisit('2026-10-26', {...visit, publicTitle: 'My title'}, storage);
  const result = personalizeMeeting(source, storage, 'es');
  assert.equal(result.parts.find(part => part.id === 'co-public-talk').title, 'My title');
  assert.equal(result.parts.find(part => part.id === 'co-concluding-talk').title, 'Discurso final del superintendente de circuito');
  assert.match(result.parts.find(part => part.id === 'co-public-talk').summary, /Escucha el discurso/);
  assert.deepEqual(applyCircuitVisit(getMeeting('weekend', '2026-11-02'), storage, 'en'), getMeeting('weekend', '2026-11-02'));
  saveCircuitVisit('2026-10-26', emptyVisit, storage);
  assert.equal(personalizeMeeting(source, storage).parts.find(part => part.type === 'PublicTalk').title, 'Normal local talk');
});

test('each visit talk has independent discovery notes and drawings that return after reenabling the visit', () => {
  const storage = makeStorage(), source = getMeeting('weekend', '2026-10-26');
  saveCircuitVisit(source.weekOf, visit, storage);
  const note = {meetingId: source.id, partId: 'co-public-talk', text: 'Public talk thought'};
  const drawing = {key: `${source.id}:co-concluding-talk`, value: [{mode: 'pen', points: [1, 2, 3, 4]}]};
  const treasures = () => buildDiscoveryTreasures(personalizeMeeting(source, storage), [note], [drawing]);
  assert.deepEqual(treasures().map(item => item.part.id), ['co-public-talk', 'co-concluding-talk']);
  saveCircuitVisit(source.weekOf, emptyVisit, storage);
  assert.deepEqual(treasures(), []);
  saveCircuitVisit(source.weekOf, visit, storage);
  assert.equal(treasures()[0].note.text, 'Public talk thought');
  assert.equal(treasures()[1].drawings.length, 1);
});

test('corrupt visit storage is reported, and failed saves propagate without claiming success', () => {
  const storage = makeStorage(), warnings = [], previous = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    for (const value of ['{broken', '[]', '"not a visit"']) {
      storage.setItem('mj-circuit-visit:2026-10-26', value);
      assert.deepEqual(readCircuitVisit('2026-10-26', storage), emptyVisit);
    }
  } finally {console.warn = previous;}
  assert.equal(warnings.length, 3);
  assert.throws(() => saveCircuitVisit('2026-10-26', visit, {getItem() {return null;}, setItem() {throw Error('Storage full');}}), /Storage full/);
});
