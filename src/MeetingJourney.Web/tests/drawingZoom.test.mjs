import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialDrawingZoom,zoomDrawing} from '../src/drawingViewport.ts';

test('pinch anchors the same paper point and limits zoom to 100–400 percent',()=>{
 const centre={x:200,y:150};
 const zoom=zoomDrawing(initialDrawingZoom,centre,centre,2,400,300);
 assert.deepEqual(zoom,{scale:2,x:-200,y:-150});
 assert.equal((centre.x-zoom.x)/zoom.scale,centre.x);
 assert.equal((centre.y-zoom.y)/zoom.scale,centre.y);
 assert.equal(zoomDrawing(zoom,centre,centre,20,400,300).scale,4);
 assert.deepEqual(zoomDrawing(zoom,centre,centre,.01,400,300),initialDrawingZoom);
});
test('two-finger pan is bounded by the visible paper',()=>{
 const centre={x:200,y:150},view={scale:2,x:-200,y:-150};
 assert.deepEqual(zoomDrawing(view,centre,{x:250,y:190},1,400,300),{scale:2,x:-150,y:-110});
 assert.deepEqual(zoomDrawing(view,centre,{x:-10000,y:-10000},1,400,300),{scale:2,x:-400,y:-300});
 assert.deepEqual(zoomDrawing(view,centre,{x:10000,y:10000},1,400,300),{scale:2,x:0,y:0});
});
