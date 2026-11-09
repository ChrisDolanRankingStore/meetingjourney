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

test('revealed scenery allows movement to the nameplate clearance without reserving a chapter heading',()=>{
 const stage={width:302,height:366,topClearance:32},portrait={width:110,height:165};
 const top=moveCompanionPosition({x:50,y:0},0,-10000,stage,portrait);
 assert.deepEqual(top,{x:50,y:1});
 const travel=companionVerticalTravel(stage.height,portrait.height,stage.topClearance);
 assert.equal(stage.height-8-travel-portrait.height,32);
 assert.equal(travel-companionVerticalTravel(stage.height,portrait.height),32);
 assert.deepEqual(moveCompanionPosition(top,0,travel,stage,portrait),{x:50,y:0});
});
