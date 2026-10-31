import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDrawingPaper, fitDrawingPaper, drawingSurface, includeDrawingPoint } from '../src/drawingViewport.ts';

test('a tall notebook creates usable paper beyond the old 420-unit canvas', () => {
  const paper = createDrawingPaper(600, 700);
  assert.equal(paper.width, 760);
  assert.ok(paper.height > 800);
  const view = fitDrawingPaper(paper, 600, 700);
  assert.ok(Math.abs(view.width - 600) < 1);
  assert.ok(Math.abs(view.height - 700) < 1);
});
test('rotation fits the same saved paper without stretching or changing strokes', () => {
  const paper = createDrawingPaper(600, 700);
  const before = fitDrawingPaper(paper, 600, 700);
  const after = fitDrawingPaper(paper, 900, 400);
  assert.ok(after.width <= 900 && after.height <= 400);
  assert.equal(after.width / paper.width, after.height / paper.height);
  const point = { x: 150, y: 240 };
  assert.equal((point.x * before.scale) / before.scale, point.x);
  assert.ok(Math.abs((point.y * after.scale) / after.scale - point.y) < .0001);
});
test('legacy drawings retain their original coordinate width and full height', () => {
  const paper = createDrawingPaper(1000, 150);
  assert.deepEqual(paper, { width: 760, height: 420 });
});

test('the complete tablet surface accepts ink without stretching existing strokes', () => {
  const saved = {width:760,height:420};
  const view = drawingSurface(saved, 800, 700);
  assert.equal(view.width,800); assert.equal(view.height,700);
  const point={x:400/view.scale,y:650/view.scale};
  assert.ok(point.y>saved.height);
  const extended=includeDrawingPoint(saved,point);
  assert.equal(extended.width,saved.width);
  assert.ok(extended.height>=point.y);
  assert.equal(drawingSurface(extended,800,700).scale,view.scale);
  assert.deepEqual(saved,{width:760,height:420});
});
test('rotation fills the view without repeatedly enlarging stored paper', () => {
  const saved={width:760,height:900};
  for(const [width,height] of [[600,700],[900,400],[600,700]]) {
    const view=drawingSurface(saved,width,height);
    assert.equal(view.width,width);assert.equal(view.height,height);
    assert.ok(view.paperWidth>=saved.width-.0001);assert.ok(view.paperHeight>=saved.height-.0001);
  }
  assert.deepEqual(saved,{width:760,height:900});
});
