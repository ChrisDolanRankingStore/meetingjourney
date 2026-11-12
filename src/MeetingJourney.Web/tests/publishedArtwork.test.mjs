import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchPublishedArtwork,downloadPublishedArtwork,validDrawingArtwork} from '../src/publishedArtwork.ts';

const item={id:'12345678-1234-1234-1234-123456789abc',style:'simple',title:'A source-linked outline',imageHash:'a'.repeat(64),imageUrl:'/api/colouring/images/12345678-1234-1234-1234-123456789abc.png'};
test('outline selection uses only the requested meeting feed and rejects off-site or malformed image entries',async t=>{
  const signal=new AbortController().signal;
  const fetcher=t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'/api/colouring/weekend-2026-11-16/watchtower-study');
    assert.equal(options.cache,'no-store');assert.equal(options.signal,signal);
    return new Response(JSON.stringify([item]));
  });
  assert.deepEqual(await fetchPublishedArtwork('weekend-2026-11-16','watchtower-study',signal),[item]);
  for(const changed of [{...item,imageUrl:'https://example.invalid/image.png'},{...item,imageHash:'invalid'},{...item,style:'unreviewed'}]){
    fetcher.mock.mockImplementation(async()=>new Response(JSON.stringify([changed])));
    await assert.rejects(fetchPublishedArtwork('weekend-2026-11-16','watchtower-study',signal),/invalid/);
  }
  fetcher.mock.mockImplementation(async()=>new Response('',{status:404}));
  assert.deepEqual(await fetchPublishedArtwork('meeting-a','part-1',signal),[]);
  fetcher.mock.mockImplementation(async()=>new Response('',{status:503}));
  await assert.rejects(fetchPublishedArtwork('meeting-a','part-1',signal),/could not be loaded/);
});
test('outline imports reject withdrawals and changed image bytes before storing a page',async t=>{
  const fetcher=t.mock.method(globalThis,'fetch',async()=>new Response('',{status:404}));
  await assert.rejects(downloadPublishedArtwork(item),/no longer available/);
  fetcher.mock.mockImplementation(async()=>new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}}));
  await assert.rejects(downloadPublishedArtwork(item),/outline changed/);
  fetcher.mock.mockImplementation(async()=>new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}}));
  await assert.rejects(downloadPublishedArtwork(item),/supported PNG/);
});
test('saved outlines accept bounded PNG snapshots but never remote or executable data URLs',()=>{
  const artwork={id:item.id,title:item.title,imageHash:item.imageHash,dataUrl:'data:image/png;base64,aGVsbG8=',width:760,height:900};
  assert.equal(validDrawingArtwork(artwork),true);
  for(const change of [{dataUrl:'https://example.invalid/a.png'},{dataUrl:'data:image/svg+xml;base64,aGVsbG8='},{width:Infinity},{height:0},{imageHash:'bad'}]){
    assert.equal(validDrawingArtwork({...artwork,...change}),false);
  }
});
