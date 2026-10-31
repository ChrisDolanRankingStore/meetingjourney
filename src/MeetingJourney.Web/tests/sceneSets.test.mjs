import { test } from 'node:test';
import assert from 'node:assert/strict';
import {sceneAssetsForWeek, sceneSeasonForWeek, sceneSetForWeek} from '../src/sceneSets.ts';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

test('scene seasons follow the current three-month quarter', () => {
  assert.equal(sceneSeasonForWeek('2026-01-05'), 'winter');
  assert.equal(sceneSeasonForWeek('2026-04-06'), 'spring');
  assert.equal(sceneSeasonForWeek('2026-07-06'), 'summer');
  assert.equal(sceneSeasonForWeek('2026-10-05'), 'autumn');
});

test('weekly scene selection is stable for a week and varies for the next week', () => {
  const first = sceneSetForWeek('2026-10-19');
  assert.deepEqual(sceneSetForWeek('2026-10-19'), first);
  assert.notEqual(sceneSetForWeek('2026-10-26').id, first.id);
  assert.ok(sceneAssetsForWeek('2026-10-19').every(asset => asset.endsWith('.png')));
  assert.deepEqual(sceneSetForWeek('2026-10-25'),first);
  assert.deepEqual(sceneSetForWeek('2026-11-01'),sceneSetForWeek('2026-10-26'));
});

test('five painted viewpoints rotate across years without changing the section landmarks', () => {
  const found = new Set();
  for(let week=0;week<5;week++){
    const date=new Date(Date.UTC(2026,11,14+week*7)),key=date.toISOString().slice(0,10);
    const pack=sceneSetForWeek(key);found.add(pack.homeImage);
    assert.equal(pack.available,true);
    assert.equal(sceneAssetsForWeek(key).length,6);
    for(const moment of Object.values(pack.moments)){
      assert.match(moment.image,/\/assets\/journey-[a-z]+-v1\.png$/);
      assert.ok(moment.place);assert.ok(moment.focus);
    }
  }
  assert.equal(found.size,5);
  assert.throws(()=>sceneSetForWeek('invalid'),/valid date/);
});

test('only painted scenery is selected, including when a legacy vector preference remains', () => {
  const previous=globalThis.localStorage;
  try {
  globalThis.localStorage={getItem:()=>'vector'};
  const painted=sceneSetForWeek('2026-10-19');
  assert.equal(painted.label,'Painted valley');
  assert.match(painted.discoveryImage,/journey-discovery-map-v1.png$/);
  assert.equal(painted.moments.Treasures.image,'/assets/journey-river-v1.png');
  assert.equal(painted.moments.FieldMinistry.image,'/assets/journey-bridge-v1.png');
  assert.equal(painted.moments.Living.image,'/assets/journey-village-v1.png');
  assert.equal(painted.moments.Closing.image,'/assets/journey-garden-v1.png');
  assert.equal(sceneAssetsForWeek('2026-10-19').length,6);
  } finally {globalThis.localStorage=previous;}
});

test('all painted offline scenery has compressed derivatives at each delivered size',async()=>{
  const assets=sceneAssetsForWeek('2026-10-19');
  for(const source of assets) for(const width of [480,960,1600]){
    const name=source.split('/').pop().replace('.png','');
    const url=new URL(`../public/assets/compact-v1/${name}-${width}.webp`,import.meta.url);
    const image=await sharp(fileURLToPath(url)).metadata();
    assert.ok(image.width>0);assert.ok(image.width<=width);
  }
});
