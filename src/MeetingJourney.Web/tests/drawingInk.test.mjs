import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blendSmudgePixels,pointerSamples,smoothStrokePoints} from '../src/drawingInk.ts';

test('fast strokes keep coalesced curve samples and the final pointer position',()=>{
 const samples=[{clientX:10,clientY:20},{clientX:20,clientY:60},{clientX:40,clientY:20}];
 const event={clientX:50,clientY:10,getCoalescedEvents:()=>samples};
 assert.deepEqual(pointerSamples(event),[...samples,event]);
 assert.deepEqual(pointerSamples({...event,clientX:40,clientY:20}),samples);
 assert.deepEqual(pointerSamples({clientX:5,clientY:6}),[{clientX:5,clientY:6}]);
 assert.equal(smoothStrokePoints([0,0,20,60,40,0]).length,12);
 const curve=smoothStrokePoints([0,0,20,60,40,0]);
 assert.deepEqual(curve.slice(0,2),[0,0]);assert.deepEqual(curve.slice(-2),[40,0]);
 assert.ok(curve.some((value,index)=>index%2&&value>20));
 assert.ok(curve.every(Number.isFinite));
 assert.deepEqual(smoothStrokePoints([0,0,10,10]),[0,0,10,10]);
 assert.deepEqual(smoothStrokePoints([5,6]),[5,6]);
});

test('smudge blends existing colours rather than painting an opaque trail',()=>{
 const pixels=new Uint8ClampedArray(4*4*4),brush=new Uint8ClampedArray(pixels.length);
 for(let i=0;i<pixels.length;i+=4){pixels.set([0,0,255,255],i);brush.set([255,0,0,255],i);}
 blendSmudgePixels(pixels,brush,4);
 const centre=20;
 assert.ok(pixels[centre]>80&&pixels[centre]<170);
 assert.ok(pixels[centre+2]>80&&pixels[centre+2]<170);
 assert.equal(pixels[centre+3],255);
 assert.ok(brush[centre+2]>0);
 assert.deepEqual([...pixels.slice(0,4)],[0,0,255,255]);
});

test('smudge carries transparency and leaves an empty page empty',()=>{
 const pixels=new Uint8ClampedArray(4*4*4),brush=new Uint8ClampedArray(pixels.length);
 blendSmudgePixels(pixels,brush,4);
 assert.ok(pixels.every(value=>value===0));
 for(let i=0;i<pixels.length;i+=4)brush.set([255,0,0,128],i);
 blendSmudgePixels(pixels,brush,4);
 assert.equal(pixels[20],255);
 assert.ok(pixels[23]>0&&pixels[23]<128);
 assert.ok(brush[23]<128);
});
