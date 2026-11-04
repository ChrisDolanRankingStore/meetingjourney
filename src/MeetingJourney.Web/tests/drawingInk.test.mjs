import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blendSmudgePixels,floodFillPixels,pointerSamples,smoothStrokePoints} from '../src/drawingInk.ts';

test('fill colours only the connected region and recolours it without crossing a line',()=>{
 const pixels=new Uint8ClampedArray(5*5*4);
 for(let y=0;y<5;y++)pixels.set([0,0,0,255],(y*5+2)*4);
 const red=[255,0,0,255],blue=[0,0,255,255];
 floodFillPixels(pixels,5,5,0,2,red);
 for(let y=0;y<5;y++)for(let x=0;x<5;x++)assert.deepEqual([...pixels.slice((y*5+x)*4,(y*5+x+1)*4)],x<2?red:x===2?[0,0,0,255]:[0,0,0,0]);
 floodFillPixels(pixels,5,5,1,1,blue);
 assert.deepEqual([...pixels.slice(0,4)],blue);
 floodFillPixels(pixels,5,5,4,0,red);
 assert.deepEqual([...pixels.slice(-4)],red);
});

test('fill cannot cross diagonals or wrap a row and handles same-colour and edge taps',()=>{
 const pixels=new Uint8ClampedArray(3*3*4);
 for(let i=0;i<9;i++)pixels.set([0,0,0,255],i*4);
 for(const i of [2,3,7])pixels.fill(0,i*4,i*4+4);
 const colour=[0,100,200,255];
 floodFillPixels(pixels,3,3,2,0,colour);
 assert.deepEqual([...pixels.slice(8,12)],colour);
 assert.equal(pixels[3*4+3],0);
 assert.equal(pixels[7*4+3],0);
 const before=pixels.slice();
 floodFillPixels(pixels,3,3,2,0,colour);
 floodFillPixels(pixels,3,3,-1,0,colour);
 assert.deepEqual(pixels,before);
});

test('fill is iterative on large empty paper and leaves opaque boundaries intact',()=>{
 const pixels=new Uint8ClampedArray(1024*1024*4);
 floodFillPixels(pixels,1024,1024,1023,1023,[10,20,30,255]);
 assert.deepEqual([...pixels.slice(0,4)],[10,20,30,255]);
 assert.deepEqual([...pixels.slice(-4)],[10,20,30,255]);
});

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
