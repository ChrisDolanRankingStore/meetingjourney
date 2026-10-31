import {spawn} from 'node:child_process';import {readFileSync,readdirSync,existsSync} from 'node:fs';import {resolve,join} from 'node:path';
const cwd=resolve('publish-node'),info=JSON.parse(readFileSync(join(cwd,'build-info.json'),'utf8')),server=spawn(process.execPath,['server.js'],{cwd,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
try{
 const port=await new Promise((resolvePort,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),10000);let buffer='';server.on('error',reject);server.stdout.on('data',data=>{buffer+=data;for(const line of buffer.split('\n'))try{const event=JSON.parse(line);if(event.port){clearTimeout(timer);resolvePort(event.port);return;}}catch{}});server.on('exit',code=>{clearTimeout(timer);reject(Error('Server exit '+code));});});
 const base='http://127.0.0.1:'+port;
 const health=await fetch(base+'/health').then(r=>r.json());
 if(health.version!=='0.5.3')throw Error('Wrong runtime version');
 const html=await fetch(base+'/').then(r=>r.text());
 if(!html.includes(info.client))throw Error('Wrong client build');
 const study=await fetch(base+'/api/meetings/current?type=weekend&date=2026-10-25').then(r=>r.json());
 if(study.parts.find(p=>p.type==='WatchtowerStudy').studyGuide.paragraphCount!==18)throw Error('Missing study guide');
 const spanish=await fetch(base+'/es/privacy.html');
 if(!spanish.ok||!(await spanish.text()).includes('lang="es"'))throw Error('Spanish public page missing');
 const opening=study.parts.find(part=>part.id==='opening-song');
 if(!opening.appUrl?.includes('docid=2026522'))throw Error('Sunday study link missing');
 const portrait=await fetch(base+'/assets/compact-v1/adult60-1-ready-clean-360.webp');
 if(!portrait.ok||portrait.headers.get('content-type')!=='image/webp')throw Error('Complete adult portrait missing');
 const refresh=await fetch(base+'/refresh');
 if(!refresh.ok||!(await refresh.text()).includes('data-refresh-app'))throw Error('Safe refresh page missing');
 let paintedAssets=0;
 for(const view of ['gate','river','bridge','village','garden','discovery-map']){
  for(const width of [480,960,1600]){
   const art=await fetch(`${base}/assets/compact-v1/journey-${view}-v1-${width}.webp`);
   if(!art.ok||art.headers.get('content-type')!=='image/webp')throw Error(`Missing painted artwork: ${view}-${width}`);
   paintedAssets++;
  }
 }
 if(existsSync(join(cwd,'node-app/public/assets/worlds-v1')))throw Error('Obsolete vector scenery must not be shipped.');
 const iconNames=['listen','discover','notes','references','clue','thought','question','heart','connect','move-fidget','move-bounce','move-stretch','move-sway','move-shake','move-dance'];
 const worker=await fetch(base+'/sw.js').then(response=>response.text());
 for(const name of iconNames){
  const url=`/assets/painted-icons-v1/${name}.webp`,icon=await fetch(base+url);
  if(!icon.ok||icon.headers.get('content-type')!=='image/webp')throw Error(`Missing painted icon: ${name}`);
  if(!worker.includes(url))throw Error(`Painted icon missing from offline shell: ${name}`);
 }
 console.log(JSON.stringify({packageVersion:health.version,client:info.client,contentFiles:readdirSync(join(cwd,'node-app/content')).filter(n=>n.endsWith('.json')).length,artwork:'image/webp',paintedAssets,paintedIcons:iconNames.length,result:'Packaged runtime smoke check passed'}));
}finally{server.kill();}
