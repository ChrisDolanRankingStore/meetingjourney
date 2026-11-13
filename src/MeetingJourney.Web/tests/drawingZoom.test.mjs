import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialDrawingZoom,zoomDrawing,drawingSurface} from '../src/drawingViewport.ts';

test('pinch anchors the same paper point and limits zoom to 25–400 percent',()=>{
 const centre={x:200,y:150};
 const zoom=zoomDrawing(initialDrawingZoom,centre,centre,2,400,300);
 assert.deepEqual(zoom,{scale:2,x:-200,y:-150});
 assert.equal((centre.x-zoom.x)/zoom.scale,centre.x);
 assert.equal((centre.y-zoom.y)/zoom.scale,centre.y);
 assert.equal(zoomDrawing(zoom,centre,centre,20,400,300).scale,4);
 assert.deepEqual(zoomDrawing(zoom,centre,centre,.01,400,300),{scale:.25,x:0,y:0});
});
test('new pages can zoom out immediately to four times the width and height',()=>{
 const zoom=zoomDrawing(initialDrawingZoom,{x:200,y:150},{x:200,y:150},.25,400,300);
 assert.deepEqual(zoom,{scale:.25,x:0,y:0});
 assert.equal((400-zoom.x)/zoom.scale,1600);
 assert.equal((300-zoom.y)/zoom.scale,1200);
 assert.deepEqual(zoomDrawing(zoom,{x:200,y:150},{x:900,y:900},1,400,300),zoom);
});
test('two-finger pan is bounded by the visible paper',()=>{
 const centre={x:200,y:150},view={scale:2,x:-200,y:-150};
 assert.deepEqual(zoomDrawing(view,centre,{x:250,y:190},1,400,300),{scale:2,x:-150,y:-110});
 assert.deepEqual(zoomDrawing(view,centre,{x:-10000,y:-10000},1,400,300),{scale:2,x:-400,y:-300});
 assert.deepEqual(zoomDrawing(view,centre,{x:10000,y:10000},1,400,300),{scale:2,x:0,y:0});
});
test('zooming back in and panning can reach marks on extended paper',()=>{
 const centre={x:200,y:150},extent={width:1600,height:1200};
 const zoom=zoomDrawing({scale:.25,x:0,y:0},centre,centre,4,400,300,extent);
 assert.deepEqual(zoom,{scale:1,x:-600,y:-450});
 assert.equal((centre.x-zoom.x)/zoom.scale,800);
 assert.deepEqual(zoomDrawing(zoom,centre,{x:-10000,y:-10000},1,400,300,extent),{scale:1,x:-1200,y:-900});
});
test('image-sized paper stays fixed on a phone and allows 1600 percent detail zoom with bounded panning',()=>{
 const paper={width:760,height:1140},view=drawingSurface(paper,220,400,true);
 assert.equal(view.paperWidth,760);
 assert.equal(view.paperHeight,1140);
 const extent={width:paper.width*view.scale,height:paper.height*view.scale},centre={x:110,y:200};
 const zoom=zoomDrawing(initialDrawingZoom,centre,centre,40,220,400,extent,16);
 assert.equal(zoom.scale,16);
 assert.equal((centre.x-zoom.x)/(view.scale*zoom.scale),centre.x/view.scale);
 const corner=zoomDrawing(zoom,centre,{x:-100000,y:-100000},1,220,400,extent,16);
 assert.equal(corner.x,220-extent.width*16);
 assert.equal(corner.y,400-extent.height*16);
 assert.deepEqual(paper,{width:760,height:1140});
});
