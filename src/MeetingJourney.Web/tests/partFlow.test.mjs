import {test} from 'node:test';
import assert from 'node:assert/strict';
import {primaryPartAction,isNavigationKey} from '../src/partFlow.ts';
import {extractPassageWords,passageText} from '../../../node-app/passage-words.js';
import {bingoWords} from '../src/bingoBoard.ts';
import {parseWorkbookMetadata} from '../../../node-app/wol-metadata.js';
test('one primary action per part type, comments are listening only',()=>{
 for(const [type,tool] of [['Song','feelings'],['BibleReading','listen'],['Demonstration','note'],['WatchtowerStudy','listen'],['CongregationBibleStudy','listen'],['Talk','bingo']])
  assert.equal(primaryPartAction({type,durationMinutes:10}).tool,tool);
 assert.equal(primaryPartAction({type:'Comments'}),null);
 assert.equal(isNavigationKey({key:'ArrowRight'},null),true);
 assert.equal(isNavigationKey({key:'ArrowRight',ctrlKey:true},null),false);
 assert.equal(isNavigationKey({key:'ArrowLeft'},{closest:()=>({})}),false);
});
test('noun extraction retains only bounded words and selected verses, in both languages',()=>{
 const html='<article><span id="v24-50-23-1">lion</span><span id="v24-50-24-1">Babylon arrow shepherd city sword trap Babylon</span><span id="v24-50-41-1">eagle</span></article>';
 const selected=passageText(html,'Jer 50:24-40');
 assert.doesNotMatch(selected,/lion|eagle/);
 const nouns=extractPassageWords(selected,'en');
 assert.equal(nouns[0].word,'Babylon');assert.ok(nouns.length>=6);
 assert.ok(extractPassageWords('Babilonia flechas pastor ciudad espada trampa','es').length>=6);
 const part={id:'part-3',title:'Reading',summary:'',activities:[],bingoWords:nouns.map(({word})=>({word,source:'passage'}))};
 const board=bingoWords(part,3,'en');
 assert.equal(board.length,9);assert.equal(new Set(board).size,9);
 assert.equal(board.filter(word=>nouns.some(noun=>noun.word===word)).length,6);
 assert.notDeepEqual(bingoWords({...part,id:'part-4'},3,'en'),board);
 assert.doesNotMatch(JSON.stringify(part),/Babylon arrow shepherd city/);
});
