import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreMeetingPart, storyMoment } from '../src/journeyExperience.ts';

const meeting = { id: 'week-a', parts: [{ id: 'opening' }, { id: 'reading' }, { id: 'closing' }] };
test('returning or refreshing restores the exact meeting part', () => {
  const saved = new Map([['mj-place:week-a', 'reading']]);
  assert.equal(restoreMeetingPart(meeting, { getItem: key => saved.get(key) ?? null }), 1);
});
test('another meeting never inherits the previous meeting position', () => {
  const saved = new Map([['mj-place:week-b', 'closing']]);
  assert.equal(restoreMeetingPart(meeting, { getItem: key => saved.get(key) ?? null }), 0);
});
test('removed parts and unavailable browser storage safely start at the opening', () => {
  assert.equal(restoreMeetingPart(meeting, { getItem: () => 'deleted-part' }), 0);
  assert.equal(restoreMeetingPart(meeting, { getItem() { throw new Error('unavailable'); } }), 0);
});
test('each meeting section has its own place and songs use a listening question', () => {
  const sections = ['Opening', 'Treasures', 'FieldMinistry', 'Living', 'Closing'];
  const places = sections.map(section => storyMoment({ section, type: 'Talk' }).place);
  assert.equal(new Set(places).size, sections.length);
  const images = sections.map(section => storyMoment({ section, type: 'Talk' }).image);
  assert.equal(new Set(images).size, sections.length);
  assert.match(images[0], /gate/);
  assert.match(images[2], /bridge/);
  assert.match(images[4], /garden/);
  assert.match(storyMoment({ section: 'Closing', type: 'Song' }).focus, /words.*song/);
});
