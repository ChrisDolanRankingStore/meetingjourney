import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneAssetsForWeek,sceneSeasonForWeek,sceneSetForWeek,readSceneHemisphere} from '../src/sceneSets.ts';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

test('four seasons reverse in the Southern hemisphere',()=>{
 for(const [date,north,south] of [['2026-01-05','winter','summer'],['2026-04-06','spring','autumn'],['2026-07-06','summer','winter'],['2026-10-05','autumn','spring']]){
  assert.equal(sceneSeasonForWeek(date,'north'),north);
  assert.equal(sceneSeasonForWeek(date,'south'),south);
 }
 assert.equal(readSceneHemisphere({getItem:()=>null}),'north');
 assert.equal(readSceneHemisphere({getItem:()=>'south'}),'south');
});
test('every week uses the completed London scene until other worlds are finished',()=>{
 const maps=new Set();
 for(let week=0;week<6;week++){
  const date=new Date(Date.UTC(2026,11,14+week*7)).toISOString().slice(0,10);
  const pack=sceneSetForWeek(date,'north');
  maps.add(pack.discoveryImage.replace(/-(winter|spring|summer|autumn)-/,'-'));
  assert.equal(pack.available,true);
  assert.equal(pack.label,'City riverside');
  assert.equal(sceneAssetsForWeek(date).length,6);
  for(const moment of Object.values(pack.moments))assert.match(moment.image,new RegExp(`/assets/scene-1-${pack.season}-`));
 }
 assert.equal(maps.size,1);
 assert.equal(sceneSetForWeek('2026-12-14').id,sceneSetForWeek('2027-01-25').id);
 assert.deepEqual(sceneSetForWeek('2026-10-19'),sceneSetForWeek('2026-10-25'));
 assert.equal(sceneSetForWeek('2026-10-19').discoveryImage,sceneSetForWeek('2026-10-26').discoveryImage);
 for(const invalid of ['invalid','2026-02-30','2026-13-01'])assert.throws(()=>sceneSetForWeek(invalid),/valid date/);
});
test('hemisphere selects seasonal art without changing the numbered world',()=>{
 const north=sceneSetForWeek('2026-10-19','north'),south=sceneSetForWeek('2026-10-19','south');
 assert.equal(north.label,south.label);
 assert.match(north.discoveryImage,/-autumn-/);
 assert.match(south.discoveryImage,/-spring-/);
});
test('all six worlds have four complete seasons with compressed maps and five location views',async()=>{
 for(let world=1;world<=6;world++)for(const season of ['winter','spring','summer','autumn'])for(const view of ['map','gate','river','bridge','village','garden'])for(const width of [480,960,1600])for(const format of ['webp','jpg']){
  const path=fileURLToPath(new URL(`../public/assets/compact-v1/scene-${world}-${season}-${view}-v2-${width}.${format}`,import.meta.url));
  const image=await sharp(path).metadata();
  assert.ok(image.width>0&&image.width<=width);
  assert.ok(Math.abs(image.height/image.width-1.5)<.01);
 }
});
test('Scene 1 standalone views retain full source framing and resolution in all four seasons',async()=>{
 for(const season of ['winter','spring','summer','autumn'])for(const view of ['map','gate','river','bridge','village','garden'])for(const width of [480,960,1600])for(const format of ['webp','jpg']){
  const image=await sharp(fileURLToPath(new URL(`../public/assets/compact-v1/scene-1-${season}-${view}-v2-${width}.${format}`,import.meta.url))).metadata();
  assert.equal(image.width,Math.min(width,1024));
  assert.equal(image.height,image.width*1.5);
 }
});
