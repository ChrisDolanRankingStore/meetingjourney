import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bingoSize,bingoWords,bingoLineCells,bingoSurprise} from '../src/bingoBoard.ts';
import {detailedPrompts} from '../src/companions.ts';
import {getMeeting} from '../../../node-app/meeting-catalog.js';
import {emptyStudy,readStudy,saveStudy} from '../src/studyStorage.ts';
import 'fake-indexeddb/auto';

test('two bingo sizes cover younger users and everyone teen or older',()=>{
 for(const age of ['child','preteen']) assert.equal(bingoSize(detailedPrompts(age)),3);
 for(const age of ['teen','adult20','adult35','adult40','adult60']) assert.equal(bingoSize(detailedPrompts(age)),4);
 const part=getMeeting('weekend','2026-10-25').parts[3];
 for(const language of ['en','es'])for(const size of [3,4]){
  const board=bingoWords(part,size,language);
  assert.equal(board.length,size*size);assert.equal(new Set(board).size,board.length);
  assert.deepEqual(board,bingoWords(part,size,language));
 }
 assert.equal(bingoWords({...part,listeningWords:{es:['Filemón','Filemón','Pablo']}},3,'es')[0],'Filemón');
});
test('only complete rows, columns and diagonals glow; undo removes a line',()=>{
 for(const size of [3,4]){
  const board=Array.from({length:size*size},(_,i)=>String(i));
  const row=board.slice(0,size),column=board.filter((_,i)=>i%size===0),diagonal=board.filter((_,i)=>i%(size+1)===0);
  for(const line of [row,column,diagonal])assert.deepEqual(bingoLineCells(board,line,size),new Set(line));
  assert.equal(bingoLineCells(board,row.slice(1),size).size,0);
 }
});
test('the final tick randomly reveals one of three surprises, not a row, undo or an already full board',()=>{
 for(const size of [3,4]){
  const board=Array.from({length:size*size},(_,i)=>String(i));
  const almost=board.slice(0,-1);
  for(const [random,expected] of [[0,'sparkle'],[.5,'companion'],[.99,'discovery']]){
   assert.equal(bingoSurprise(board,almost,board,true,()=>random),expected);
  }
  assert.equal(bingoSurprise(board,[],board.slice(0,size),true),null);
  assert.equal(bingoSurprise(board,board,board,true),null);
  assert.equal(bingoSurprise(board,board,almost,true),null);
  assert.equal(bingoSurprise(board,almost,[...almost,'not on the board'],true),null);
  assert.equal(bingoSurprise(board,almost,board,false,()=>0),'sparkle');
  assert.equal(bingoSurprise(board,almost,board,false,()=>.99),'discovery');
 }
 assert.equal(bingoSurprise([],[],[],true),null);
});
test('bingo taps persist independently of study comments, language and other meetings',async()=>{
 const study=emptyStudy('weekend-2026-10-19','watchtower-study');study.draft='Keep this';await saveStudy(study);
 const bingo={...emptyStudy(study.meetingId,'watchtower-study:bingo:en'),bingoWords:['love','hope'],bingoSize:3};await saveStudy(bingo);
 assert.deepEqual((await readStudy(bingo.meetingId,bingo.partId)).bingoWords,['love','hope']);
 assert.equal((await readStudy(bingo.meetingId,bingo.partId)).bingoSize,3);
 assert.equal((await readStudy(study.meetingId,study.partId)).draft,'Keep this');
 assert.equal(await readStudy(bingo.meetingId,'watchtower-study:bingo:es'),undefined);
 assert.equal(await readStudy('weekend-2026-10-26',bingo.partId),undefined);
});
