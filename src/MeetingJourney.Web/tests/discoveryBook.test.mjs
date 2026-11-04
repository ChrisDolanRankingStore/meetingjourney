import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiscoveryTreasures, hasSavedDiscovery, discoverySummary } from '../src/discoveryBook.ts';

const parts = [
  { id: 'opening', title: 'Opening song', section: 'Opening' },
  { id: 'part-1', title: 'First thought', section: 'Treasures' },
  { id: 'part-10', title: 'Another thought', section: 'Treasures' },
  { id: 'closing', title: 'Closing song', section: 'Closing' }
];
const meeting = { id: 'week-a', parts };
const stroke = { points: [20, 30, 40, 50], color: '#123456', size: 5, mode: 'pen' };
const note = (partId, text = '') => ({ meetingId: meeting.id, partId, text, updatedAt: '2026-10-25T00:00:00Z' });

test('an empty journal has no invented or completion-based treasures', () => {
  assert.deepEqual(buildDiscoveryTreasures(meeting, [], []), []);
  assert.equal(hasSavedDiscovery({ ...note('opening'), sourceConfirmations: ['I listened'] }), false);
  assert.equal(hasSavedDiscovery({ ...note('opening', '   '), feedbackChoices: [''] }), false);
});
test('a saved thought belongs to its original meeting stop', () => {
  const result = buildDiscoveryTreasures(meeting, [note('part-1', 'An idea to keep')], []);
  assert.equal(result.length, 1);
  assert.equal(result[0].partIndex, 1);
  assert.equal(result[0].note.text, 'An idea to keep');
  assert.equal(discoverySummary(result[0]), 'a thought');
});
test('all drawing pages appear in numeric order and a page is not counted as its strokes', () => {
  const result = buildDiscoveryTreasures(meeting, [], [
    { key: 'week-a:part-1::page::2', value: [stroke] },
    { key: 'week-a:part-1', value: [stroke, stroke, stroke] },
    { key: 'week-a:part-1::page::1', value: [stroke], paper: { width: 760, height: 900 } }
  ]);
  assert.deepEqual(result[0].drawings.map(page => page.page), [0, 1, 2]);
  assert.equal(result[0].drawings[1].paper.height, 900);
  assert.equal(discoverySummary(result[0]), '3 drawing pages');
});
test('similar part IDs and other meetings never share drawing contents', () => {
  const result = buildDiscoveryTreasures(meeting, [{ ...note('part-1', 'Wrong meeting'), meetingId: 'week-b' }], [
    { key: 'week-b:part-1', value: [stroke] },
    { key: 'week-a:part-10', value: [stroke] }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].part.id, 'part-10');
  assert.equal(result[0].note, undefined);
});
test('empty or eraser-only pages do not create a treasure chest', () => {
  const result = buildDiscoveryTreasures(meeting, [], [
    { key: 'week-a:opening', value: [] },
    { key: 'week-a:closing', value: [{ ...stroke, mode: 'eraser' }] }
  ]);
  assert.deepEqual(result, []);
});
test('a fill-only page is kept as a drawing discovery',()=>{
 const fill={...stroke,mode:'fill',points:[20,30],fillBounds:{width:760,height:900}};
 const result=buildDiscoveryTreasures(meeting,[],[{key:'week-a:part-1',value:[fill]}]);
 assert.equal(result.length,1);
 assert.deepEqual(result[0].drawings[0].strokes,[fill]);
});
test('a stop keeps the same terrain position when earlier stops have no saved notes', () => {
  const single = buildDiscoveryTreasures(meeting, [note('part-10', 'Later thought')], []);
  const both = buildDiscoveryTreasures(meeting, [note('part-1', 'Earlier thought'), note('part-10', 'Later thought')], []);
  assert.deepEqual(single[0].position, both[1].position);
});
