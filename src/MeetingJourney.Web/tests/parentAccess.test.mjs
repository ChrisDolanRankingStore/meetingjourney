import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasParentPin,removeParentPin,setParentPin,verifyParentPin} from '../src/parentAccessStorage.ts';
class MemoryStorage{data=new Map();getItem(key){return this.data.get(key)??null;}setItem(key,value){this.data.set(key,String(value));}removeItem(key){this.data.delete(key);}}
test('parent code is stored as a salted derivation and can be verified or removed',async()=>{
 const previous=globalThis.localStorage;globalThis.localStorage=new MemoryStorage();
 try{
  assert.equal(hasParentPin(),false);
  await assert.rejects(setParentPin('123'),/four digits/);
  await setParentPin('1234');
  const saved=globalThis.localStorage.getItem('mj-parent-pin');
  assert.ok(saved);assert.doesNotMatch(saved,/1234/);assert.equal(await verifyParentPin('9999'),false);assert.equal(await verifyParentPin('1234'),true);
  removeParentPin();assert.equal(hasParentPin(),false);
 }finally{globalThis.localStorage=previous;}
});
