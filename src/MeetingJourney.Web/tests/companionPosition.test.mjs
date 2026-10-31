import {test} from 'node:test';
import assert from 'node:assert/strict';
import {companionVerticalTravel,moveCompanionPosition} from '../src/companionPosition.ts';

test('dragging vertically moves the companion without changing horizontal position',()=>{
 const stage={width:700,height:500},portrait={width:150,height:240},origin={x:50,y:0};
 const up=moveCompanionPosition(origin,0,-94,stage,portrait);
 assert.equal(up.x,50);assert.equal(up.y,.5);
 assert.deepEqual(moveCompanionPosition(up,0,94,stage,portrait),origin);
});
test('large diagonal drags keep a wheelchair portrait and name inside the scene',()=>{
 const stage={width:300,height:600},portrait={width:180,height:260};
 const topLeft=moveCompanionPosition({x:50,y:0},-10000,-10000,stage,portrait);
 const bottomRight=moveCompanionPosition({x:50,y:0},10000,10000,stage,portrait);
 assert.ok(topLeft.x/100*stage.width-portrait.width/2>=8-.001);assert.equal(topLeft.y,1);
 assert.ok(bottomRight.x/100*stage.width+portrait.width/2<=stage.width-8+.001);assert.equal(bottomRight.y,0);
 assert.equal(8+companionVerticalTravel(stage.height,portrait.height)+portrait.height,stage.height-64);
});
test('a shallow phone scene disables vertical travel without invalid coordinates',()=>{
 assert.equal(companionVerticalTravel(84,70),0);
 assert.deepEqual(moveCompanionPosition({x:50,y:1},0,-200,{width:390,height:84},{width:46,height:70}),{x:50,y:0});
});
