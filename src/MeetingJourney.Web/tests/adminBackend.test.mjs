import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {SignJWT,generateKeyPair,exportJWK,createLocalJWKSet} from 'jose';
import sharp from 'sharp';
import {createAccessVerifier,readAdminConfig} from '../../../node-app/admin-auth.js';
import {createAdminHandler,normalizeArtwork} from '../../../node-app/admin.js';
import {artworkConcept,artworkStyles} from '../../../node-app/artwork-concepts.js';

const issuer='https://test-team.cloudflareaccess.com',audience='a'.repeat(64),origin='https://meetingjourney.example';
const envFor=directory=>({MJ_ADMIN_ENABLED:'true',MJ_ADMIN_ACCESS_ISSUER:issuer,MJ_ADMIN_ACCESS_AUD:audience,MJ_ADMIN_ORIGIN:origin,MJ_ADMIN_EMAILS:'admin@example.invalid',MJ_ADMIN_DATA_DIR:join(directory,'private')});
async function tokens(config){
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const jwk={...await exportJWK(publicKey),kid:'test-key',alg:'RS256',use:'sig'};
  const sign=(payload={},header={})=>new SignJWT({email:'admin@example.invalid',type:'app',...payload}).setProtectedHeader({alg:'RS256',kid:'test-key',...header})
    .setSubject('test-administrator').setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('15m').sign(privateKey);
  return {sign,verify:createAccessVerifier(config,createLocalJWKSet({keys:[jwk]})),privateKey};
}
async function serverFor(handler){
  const server=createServer(async(req,res)=>{
    if(!await handler(req,res,decodeURIComponent(new URL(req.url,'http://localhost').pathname))){res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {base:`http://127.0.0.1:${server.address().port}`,close:async()=>{await new Promise(resolve=>server.close(resolve));await handler.close();}};
}
test('admin configuration is opt-in and rejects unsafe issuers, origins, public storage and empty allowlists',()=>{
  assert.equal(readAdminConfig({},'/public'),null);
  for(const patch of [
    {MJ_ADMIN_ACCESS_ISSUER:'https://test-team.cloudflareaccess.com.evil.example'},
    {MJ_ADMIN_ORIGIN:'http://meetingjourney.example'},
    {MJ_ADMIN_EMAILS:''},
    {MJ_ADMIN_DATA_DIR:join(tmpdir(),'public','drafts')},
    {MJ_ADMIN_DATA_DIR:join(tmpdir(),'public','..drafts')}
  ])assert.throws(()=>readAdminConfig({...envFor(tmpdir()),...patch},join(tmpdir(),'public')));
});
test('Cloudflare verification rejects forged, expired, wrong-audience and unauthorised identities',async()=>{
  const config=readAdminConfig(envFor(tmpdir()),join(tmpdir(),'public')),keys=await tokens(config);
  const request=token=>({headers:{'cf-access-jwt-assertion':token}});
  const valid=await keys.sign();
  assert.equal((await keys.verify(request(valid))).subject,'test-administrator');
  const payloads=[
    new SignJWT({email:'admin@example.invalid',type:'app'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('test').setIssuer(issuer).setAudience('wrong').setIssuedAt().setExpirationTime('15m').sign(keys.privateKey),
    new SignJWT({email:'admin@example.invalid',type:'app'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('test').setIssuer('https://another-team.cloudflareaccess.com').setAudience(audience).setIssuedAt().setExpirationTime('15m').sign(keys.privateKey),
    new SignJWT({email:'admin@example.invalid',type:'app'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('test').setIssuer(issuer).setAudience(audience).setIssuedAt(Math.floor(Date.now()/1000)-3600).setExpirationTime(Math.floor(Date.now()/1000)-30).sign(keys.privateKey),
    keys.sign({email:'not-an-admin@example.invalid'}),keys.sign({type:'service'}),Promise.resolve(valid.slice(0,-12)+'AAAAAAAAAAAA')
  ];
  for(const token of await Promise.all(payloads))await assert.rejects(keys.verify(request(token)),error=>[401,403].includes(error.status));
  await assert.rejects(keys.verify({headers:{'cf-access-authenticated-user-email':'admin@example.invalid'}}),error=>error.status===401);
});
test('admin endpoints fail closed without configuration and never serve the private admin page anonymously',async()=>{
  const handler=createAdminHandler({env:{},publicDir:tmpdir()}),server=await serverFor(handler);
  try{
    for(const path of ['/admin','/admin/app.js','/api/admin/session','/%61dmin','/api/%61dmin/artwork']){
      const response=await fetch(server.base+path);
      assert.equal(response.status,503,path);
      assert.match(response.headers.get('cache-control'),/no-store/);
      assert.doesNotMatch(await response.text(),/Artwork administration/);
    }
    assert.equal((await fetch(server.base+'/api/colouring/meeting-2026-10-19/part-1')).status,404);
  }finally{await server.close();}
});
test('storage initialization diagnostics are sanitised and only shown after administrator verification',async t=>{
  const logging=t.mock.method(console,'error',()=>{});
  const env=envFor(tmpdir()),publicDir=join(tmpdir(),'public'),keys=await tokens(readAdminConfig(env,publicDir));
  const auth={'cf-access-jwt-assertion':await keys.sign()};
  for(const [properties,expected] of [
    [{code:'EACCES'},/permission.*EACCES/],
    [{code:'EROFS'},/read-only.*EROFS/],
    [{code:'ERR_SQLITE_ERROR',errcode:14},/SQLite cannot open.*SQLITE_CANTOPEN/],
    [{code:'unexpected-private-detail'},/could not be initialized/]
  ]){
    const failure=Object.assign(new Error('/private/secret-path: secret-provider-value'),properties);
    let attempts=0;
    const handler=createAdminHandler({env,publicDir,verifyAccess:keys.verify,storeFactory:()=>{attempts++;throw failure;}});
    const server=await serverFor(handler);
    try{
      assert.equal((await fetch(server.base+'/api/admin/artwork')).status,401);
      assert.equal(attempts,0);
      const response=await fetch(server.base+'/api/admin/artwork',{headers:auth});
      assert.equal(response.status,500);
      const body=await response.text();
      assert.match(body,expected);
      assert.doesNotMatch(body,/secret-path|secret-provider-value|unexpected-private-detail/);
      const log=logging.mock.calls.at(-1);
      assert.equal(log.arguments[1].cause,failure);
      const publicResponse=await fetch(server.base+'/api/colouring/meeting-2026-10-19/part-1');
      assert.equal(publicResponse.status,500);
      assert.deepEqual(await publicResponse.json(),{error:'Administration is unavailable. Try again.'});
    }finally{await server.close();}
  }
});
test('private artwork requires concept review, exact-image approval and explicit publication; edits revoke approval',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'mj-admin-test-')),publicDir=join(directory,'public');
  mkdirSync(publicDir);
  const meetingsDirectory=join(directory,'content');mkdirSync(meetingsDirectory);
  const reviewed=JSON.parse(readFileSync(new URL('../../../node-app/content/midweek-2026-10-19.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
  const reviewedPath=join(meetingsDirectory,'midweek-2026-10-19.json');writeFileSync(reviewedPath,JSON.stringify(reviewed));
  const env=envFor(directory),config=readAdminConfig(env,publicDir),keys=await tokens(config);
  const handler=createAdminHandler({env,publicDir,meetingsDirectory,verifyAccess:keys.verify}),server=await serverFor(handler);
  const auth={'cf-access-jwt-assertion':await keys.sign()};
  const mutation={...auth,Origin:origin,'X-MJ-Admin':'1','Content-Type':'application/json'};
  const call=(path,body,revision,headers=mutation)=>fetch(server.base+path,{method:'POST',headers:{...headers,...(revision?{'If-Match':String(revision)}:{})},body:JSON.stringify(body)});
  try{
    assert.equal((await fetch(server.base+'/admin')).status,401);
    const page=await fetch(server.base+'/admin',{headers:auth});
    assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/default-src 'none'/);
    const items=await fetch(server.base+'/api/admin/meetings',{headers:auth}).then(r=>r.json());
    assert.ok(items.length>0);
    const item=items[0],input={meetingId:item.meetingId,partId:item.partId,style:'simple',safeTheme:'Showing patience',scene:'A fully clothed person calmly tending a plant.'};
    assert.equal((await call('/api/admin/artwork',input,null,{...mutation,Origin:'https://attacker.example'})).status,403);
    assert.equal((await call('/api/admin/artwork',input,null,{...auth,Origin:origin,'Content-Type':'application/json'})).status,403);
    assert.equal((await call('/api/admin/artwork',null)).status,400);
    assert.equal((await call('/api/admin/artwork',{...input,scene:'x'.repeat(13000)})).status,413);
    const created=await call('/api/admin/artwork',input);
    assert.equal(created.status,201);
    let draft=await created.json();
    const path=`/api/admin/artwork/${draft.id}`,publicPath=`/api/colouring/${item.meetingId}/${item.partId}`,publicImage=`/api/colouring/images/${draft.id}.png`;
    const action=async(name,extra={})=>call(path+'/actions',{action:name,...extra},draft.revision);
    assert.equal((await fetch(server.base+path+'/image')).status,401);
    assert.equal((await fetch(server.base+publicImage)).status,404);
    assert.deepEqual(await fetch(server.base+publicPath).then(r=>r.json()),[]);
    assert.equal((await action('publish')).status,409);
    assert.equal((await action('approve-concept')).status,400);
    draft=await (await action('approve-concept',{safetyReviewed:true,sourceReviewed:true})).json();
    const image=await sharp({create:{width:300,height:400,channels:3,background:'white'}}).png().toBuffer();
    const upload=buffer=>fetch(server.base+path+'/image',{method:'POST',headers:{...auth,Origin:origin,'X-MJ-Admin':'1','Content-Type':'image/png','If-Match':String(draft.revision)},body:buffer});
    assert.equal((await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).status,400);
    draft=await (await upload(image)).json();
    assert.equal(draft.state,'image-ready');
    assert.equal((await fetch(server.base+publicImage)).status,404);
    assert.equal((await call(path+'/actions',{action:'approve-image',safetyReviewed:true,sourceReviewed:true},1)).status,409);
    draft=await (await action('approve-image',{safetyReviewed:true,sourceReviewed:true})).json();
    assert.equal((await fetch(server.base+publicImage)).status,404);
    draft=await (await action('publish')).json();
    assert.equal(draft.state,'published');
    assert.equal((await fetch(server.base+publicImage)).status,200);
    const published=await fetch(server.base+publicPath).then(r=>r.json());
    assert.equal(published[0].id,draft.id);
    assert.equal(published[0].imageHash,draft.imageHash);
    assert.equal(published[0].prompt,undefined);
    const changedPart=reviewed.meeting.parts.find(part=>part.id===item.partId),originalSummary=changedPart.summary;
    changedPart.summary='A changed reviewed theme summary';writeFileSync(reviewedPath,JSON.stringify(reviewed));
    assert.equal((await fetch(server.base+publicImage)).status,404);
    assert.deepEqual(await fetch(server.base+publicPath).then(r=>r.json()),[]);
    changedPart.summary=originalSummary;writeFileSync(reviewedPath,JSON.stringify(reviewed));
    draft=await (await upload(image)).json();
    assert.equal(draft.state,'image-ready');assert.equal(draft.imageApproval,null);
    assert.equal((await fetch(server.base+publicImage)).status,404);
    assert.equal((await action('publish')).status,409);
    draft=await (await call(path,input,draft.revision)).json();
    assert.equal(draft.state,'draft');assert.equal(draft.conceptApproval,null);
    assert.equal((await fetch(server.base+path+'/image',{headers:auth})).status,404);
    const audit=await fetch(server.base+path+'/audit',{headers:auth}).then(r=>r.json());
    assert.ok(audit.some(entry=>entry.action==='publish'));
    assert.equal(audit[0].action,'edit-concept');
  }finally{await server.close();rmSync(directory,{recursive:true,force:true});}
});
test('artwork decoding strips metadata, rejects non-raster content and enforces dimensions',async()=>{
  await assert.rejects(normalizeArtwork(Buffer.from('<svg><script>alert(1)</script></svg>')),error=>error.status===400);
  const small=await sharp({create:{width:32,height:32,channels:3,background:'white'}}).png().toBuffer();
  await assert.rejects(normalizeArtwork(small),error=>error.status===400);
  const valid=await sharp({create:{width:300,height:300,channels:3,background:'white'}}).jpeg().toBuffer();
  assert.equal((await sharp(await normalizeArtwork(valid)).metadata()).format,'png');
});
test('only authenticated same-origin admins can trigger planning; discovered drafts still need source and image review',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'mj-admin-planning-')),publicDir=join(directory,'public'),meetingsDirectory=join(directory,'content');
  mkdirSync(publicDir);mkdirSync(meetingsDirectory);
  const env={...envFor(directory),MJ_ARTWORK_AUTOMATION_ENABLED:'true',MJ_GEMINI_API_KEY:'not-a-real-api-key-for-tests',MJ_OPENROUTER_API_KEY:'not-a-real-openrouter-key'};
  const keys=await tokens(readAdminConfig(env,publicDir));
  let providerCalls=0;
  const handler=createAdminHandler({env,publicDir,meetingsDirectory,verifyAccess:keys.verify,plannerOptions:{
    now:()=>new Date('2026-11-10T12:00:00Z'),
    discover:async week=>({subjects:[{meetingId:`meeting-${week}`,weekOf:week,kind:'midweek',partId:'part-1',title:'Patience',
      reference:'Test 1:1',sourceUrl:'https://www.jw.org/finder?docid=123',sourceStatus:'discovered',automatable:true}],missing:['weekend']}),
    generate:async item=>{providerCalls++;return {needsReview:false,concepts:artworkStyles.map(style=>artworkConcept({
      meetingId:item.meetingId,partId:item.partId,style,safeTheme:'Patience',scene:'A calm person tending a plant.'
    },[item]))};}
  }}),server=await serverFor(handler);
  const auth={'cf-access-jwt-assertion':await keys.sign()},mutation={...auth,Origin:origin,'X-MJ-Admin':'1','Content-Type':'application/json'};
  try{
    assert.equal((await fetch(server.base+'/api/admin/planner')).status,401);
    assert.equal((await fetch(server.base+'/api/admin/planner/instructions')).status,401);
    const promptUrl=server.base+'/api/admin/planner/instructions';
    const initial=await fetch(promptUrl,{headers:auth}).then(r=>r.json());
    assert.match(initial.instructions,/false god/);
    const saveInstructions=(text,revision,headers=mutation)=>fetch(promptUrl,{
      method:'POST',headers:{...headers,'If-Match':String(revision)},body:JSON.stringify({instructions:text})
    });
    assert.equal((await saveInstructions('changed',0,{...mutation,Origin:'https://evil.example'})).status,403);
    assert.equal((await saveInstructions('',0)).status,400);
    const edited=initial.instructions+'\nKeep plants natural.';
    const saved=await saveInstructions(edited,0);
    assert.equal(saved.status,200);
    assert.equal((await saved.json()).instructions,edited);
    assert.equal((await saveInstructions('stale',0)).status,409);
    assert.equal(providerCalls,0,'Loading admin and saving instructions must not call Gemini.');
    assert.equal((await fetch(server.base+'/api/admin/planner/run',{method:'POST',headers:mutation,body:'{}'})).status,428);
    assert.equal((await fetch(server.base+'/api/admin/planner/run',{method:'POST',headers:mutation,body:'{"instructionsRevision":0}'})).status,409);
    const requestRun=input=>fetch(server.base+'/api/admin/planner/run',{method:'POST',headers:mutation,body:JSON.stringify({instructionsRevision:1,...input})});
    assert.equal((await requestRun({provider:'unconfigured'})).status,400);
    assert.equal((await requestRun({provider:'openrouter',model:'example/paid-model'})).status,400);
    assert.equal((await requestRun({provider:'openrouter',model:'example/paid-model',allowPaid:'true'})).status,400);
    assert.equal((await requestRun({startWeek:'invalid'})).status,400);
    assert.equal((await requestRun({startWeek:'2026-11-16',endWeek:'2026-11-02'})).status,400);
    assert.equal(providerCalls,0,'Invalid or unconfirmed provider selections must not call a provider.');
    assert.equal((await fetch(server.base+'/api/admin/planner/regenerate',{method:'POST'})).status,401);
    assert.equal((await fetch(server.base+'/api/admin/planner/run',{method:'POST',headers:{...mutation,Origin:'https://evil.example'}})).status,403);
    assert.equal((await fetch(server.base+'/api/admin/planner/regenerate',{method:'POST',headers:{...mutation,Origin:'https://evil.example'}})).status,403);
    const triggered=await fetch(server.base+'/api/admin/planner/run',{method:'POST',headers:mutation,body:'{"instructionsRevision":1}'});
    assert.equal(triggered.status,202);
    await handler.runPlanner();
    const state=await fetch(server.base+'/api/admin/planner',{headers:auth}).then(r=>r.text());
    assert.doesNotMatch(state,/not-a-real-api-key|not-a-real-openrouter-key/);
    assert.equal(JSON.parse(state).maxCallsPerDay,50);
    assert.deepEqual(JSON.parse(state).providers.map(provider=>provider.id),['gemini','openrouter']);
    const items=await fetch(server.base+'/api/admin/meetings',{headers:auth}).then(r=>r.json());
    assert.equal(items.length,5);assert.equal(items[0].sourceStatus,'discovered');
    const drafts=await fetch(server.base+'/api/admin/artwork',{headers:auth}).then(r=>r.json());
    assert.equal(drafts.length,15);assert.ok(drafts.every(draft=>draft.state==='draft'&&!draft.conceptApproval));
    assert.equal((await fetch(server.base+'/api/admin/planner/regenerate',{method:'POST',headers:mutation,body:'{"instructionsRevision":1}'})).status,202);
    await handler.runPlanner();
    assert.deepEqual(await fetch(server.base+'/api/admin/artwork',{headers:auth}).then(r=>r.json()),drafts);
    assert.equal((await requestRun({provider:'openrouter',model:'example/paid-model',allowPaid:true})).status,202);
    await handler.runPlanner();
    assert.equal(providerCalls,5,'Switching provider/model must not duplicate existing subject suggestions.');
    assert.deepEqual(await fetch(server.base+'/api/admin/artwork',{headers:auth}).then(r=>r.json()),drafts);
    const draft=drafts[0],path=`/api/admin/artwork/${draft.id}/actions`;
    const action=data=>fetch(server.base+path,{method:'POST',headers:{...mutation,'If-Match':String(draft.revision)},body:JSON.stringify(data)});
    assert.equal((await action({action:'publish'})).status,409);
    assert.equal((await action({action:'approve-concept',safetyReviewed:true})).status,400);
    const approved=await (await action({action:'approve-concept',safetyReviewed:true,sourceReviewed:true})).json();
    assert.equal(approved.conceptApproval.sourceHash,draft.sourceHash);
    assert.deepEqual(await fetch(server.base+`/api/colouring/${draft.meetingId}/${draft.partId}`).then(r=>r.json()),[]);
    assert.equal((await requestRun({startWeek:'2026-11-02',endWeek:'2026-11-09'})).status,202);
    await handler.runPlanner({startWeek:'2026-11-02',endWeek:'2026-11-09'});
    const caughtUp=await fetch(server.base+'/api/admin/meetings',{headers:auth}).then(r=>r.json());
    assert.ok(caughtUp.some(item=>item.weekOf==='2026-11-02'));
    const latest=await fetch(server.base+'/api/admin/artwork',{headers:auth}).then(r=>r.json());
    assert.equal(latest.length,18);
    assert.deepEqual(latest.find(entry=>entry.id===approved.id),approved);
    const catchupStatus=await fetch(server.base+'/api/admin/planner',{headers:auth}).then(r=>r.json());
    assert.deepEqual(catchupStatus.weeks,['2026-11-02','2026-11-09']);
    assert.deepEqual(catchupStatus.defaultWeeks,['2026-11-09','2026-11-16','2026-11-23','2026-11-30','2026-12-07']);
  }finally{await server.close();rmSync(directory,{recursive:true,force:true});}
});
test('the offline worker never intercepts administration routes and purges legacy private cache entries',async()=>{
  const worker=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
  let fetchHandler,messageHandler,responded=false;
  const removed=[],cache={
    keys:async()=>['/admin','/api/%61dmin/artwork','/assets/public.webp'].map(path=>({url:origin+path})),
    delete:async request=>{removed.push(new URL(request.url).pathname);return true;}
  };
  const self={location:{origin},addEventListener:(name,handler)=>{if(name==='fetch')fetchHandler=handler;if(name==='message')messageHandler=handler;}};
  new Function('self','caches',worker)(self,{keys:async()=>['meeting-journey-legacy'],open:async()=>cache});
  for(const path of ['/admin','/admin/app.js','/api/admin/artwork','/%61dmin','/api/%61dmin/artwork','/api/colouring/meeting-2026-11-16/part-1','/api/colouring/images/test.png']){
    responded=false;
    fetchHandler({request:{method:'GET',url:origin+path},respondWith:()=>{responded=true;}});
    assert.equal(responded,false,path);
  }
  let completion,ready;
  messageHandler({data:{type:'ADMIN_NETWORK_ONLY'},ports:[{postMessage:value=>{ready=value;}}],waitUntil:promise=>{completion=promise;}});
  await completion;
  assert.deepEqual(removed,['/admin','/api/%61dmin/artwork']);
  assert.equal(ready.adminNetworkOnly,true);
});
