import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blendSmudgePixels} from '../src/drawingInk.ts';

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
