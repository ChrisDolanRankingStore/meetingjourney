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
test('outline boundaries guide a fill without copying the outline into the removable ink layer',()=>{
 const mask=new Uint8ClampedArray(5*5*4),ink=new Uint8ClampedArray(mask.length);
 for(let y=0;y<5;y++)for(let x=0;x<5;x++)mask.set(x===2?[0,0,0,255]:[255,255,255,255],(y*5+x)*4);
 ink.set([0,0,255,255],4*4);
 floodFillPixels(mask,5,5,0,2,[255,0,0,255],ink);
 assert.deepEqual([...ink.slice(0,4)],[255,0,0,255]);
 assert.deepEqual([...ink.slice(2*4,3*4)],[0,0,0,0],'No outline pixels belong to the colouring layer.');
 assert.deepEqual([...ink.slice(4*4,5*4)],[0,0,255,255],'Existing ink outside the filled region stays intact.');
 assert.deepEqual([...ink.slice((2*5+4)*4,(2*5+5)*4)],[0,0,0,0],'Fill cannot leak after hiding the original outline.');
});

test('fill is iterative on large empty paper and leaves opaque boundaries intact',()=>{
 const pixels=new Uint8ClampedArray(1024*1024*4);
 floodFillPixels(pixels,1024,1024,1023,1023,[10,20,30,255]);
 assert.deepEqual([...pixels.slice(0,4)],[10,20,30,255]);
 assert.deepEqual([...pixels.slice(-4)],[10,20,30,255]);
});

test('outline fill blends the antialiased fringe without crossing or blurring a dark line',()=>{
 const values=[255,255,255,245,200,120,0,120,200,245,255],width=values.length;
 const source=new Uint8ClampedArray(width*3*4),ink=new Uint8ClampedArray(source.length);
 for(let y=0;y<3;y++)for(let x=0;x<width;x++)source.set([values[x],values[x],values[x],255],(y*width+x)*4);
 const original=source.slice(),colour=[197,77,67,255];
 const composite=()=>{
  const mask=source.slice();
  for(let offset=0;offset<mask.length;offset+=4)for(let channel=0;channel<3;channel++)mask[offset+channel]=ink[offset+channel]*ink[offset+3]/255+source[offset+channel]*(1-ink[offset+3]/255);
  return mask;
 };
 for(const fill of [colour,[0,0,0,255],[22,59,92,255],colour]){
  floodFillPixels(composite(),width,3,1,1,fill,ink,{pixels:source,hidden:false});
  for(let x=0;x<6;x++){
   const offset=(width+x)*4;
   assert.deepEqual([...ink.slice(offset,offset+4)],[...fill.slice(0,3).map(value=>Math.round(value*values[x]/255)),255]);
  }
  assert.ok(ink.slice((width+6)*4,(width+11)*4).every(value=>value===0),'Neither the black line nor its far side is painted.');
 }
 assert.deepEqual(source,original,'Smoothing never rewrites the saved outline.');
});

test('removed outlines keep smooth fill coverage without copying grey lines or building up on recolouring',()=>{
 const values=[255,255,245,200,120,0,120,200,245,255],width=values.length;
 const source=Uint8ClampedArray.from(values.flatMap(value=>[value,value,value,255]));
 const ink=new Uint8ClampedArray(source.length);
 for(const fill of [[197,77,67,255],[0,0,0,255],[22,59,92,255],[197,77,67,255]]){
  const mask=source.slice();
  for(let offset=0;offset<mask.length;offset+=4)for(let channel=0;channel<3;channel++)mask[offset+channel]=ink[offset+channel]*ink[offset+3]/255+source[offset+channel]*(1-ink[offset+3]/255);
  floodFillPixels(mask,width,1,0,0,fill,ink,{pixels:source,hidden:true});
  for(let x=0;x<5;x++)assert.deepEqual([...ink.slice(x*4,x*4+4)],[...fill.slice(0,3),values[x]]);
  assert.ok(ink.slice(5*4).every(value=>value===0),'The removed line cannot leak into the colouring.');
 }
});

test('outline edge smoothing leaves unrelated pen ink intact and does not jump diagonals',()=>{
 const source=Uint8ClampedArray.from([255,200,0,0,0,255,0,255,255].flatMap(value=>[value,value,value,255]));
 const mask=source.slice(),ink=new Uint8ClampedArray(source.length),green=[20,180,90,255];
 ink.set(green,4);mask.set(green,4);
 floodFillPixels(mask,3,3,0,0,[197,77,67,255],ink,{pixels:source,hidden:false});
 assert.deepEqual([...ink.slice(4,8)],green);
 assert.ok(ink.slice(8).every(value=>value===0),'Neither diagonal paper nor the other side of a pen boundary is coloured.');
});

test('hidden fill recolouring tolerates canvas premultiplication rounding at faint edges',()=>{
 const source=Uint8ClampedArray.from([255,3,0,3,255].flatMap(value=>[value,value,value,255]));
 const ink=new Uint8ClampedArray(source.length);
 ink.set([197,77,67,255]);ink.set([170,85,85,3],4);
 const mask=source.slice();
 mask.set(ink.slice(0,4));mask.set([5,4,4,255],4);
 floodFillPixels(mask,5,1,0,0,[22,59,92,255],ink,{pixels:source,hidden:true});
 assert.deepEqual([...ink.slice(4,8)],[22,59,92,3]);
 assert.ok(ink.slice(8).every(value=>value===0));
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
