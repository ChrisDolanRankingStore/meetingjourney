import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url))),dist=join(root,'src/MeetingJourney.Web/dist'),publicDir=join(root,'node-app/public'),stage=join(root,'publish-node'),stagePublic=join(stage,'node-app/public');
if(!existsSync(join(dist,'index.html')))throw Error('Build the web client before staging.');
const allowed=new Set([publicDir,stagePublic].map(path=>resolve(path)));
function resetGenerated(target){
 const absolute=resolve(target);
 if(!allowed.has(absolute)||!absolute.startsWith(root+sep))throw Error('Refusing unexpected output path');
 mkdirSync(absolute,{recursive:true});
 // Keep the output directory itself: Windows may hold it open during an upload.
 for(const name of readdirSync(absolute))rmSync(join(absolute,name),{recursive:true,force:true});
}
resetGenerated(publicDir);cpSync(dist,publicDir,{recursive:true});
const artDir=join(publicDir,'assets');for(const name of readdirSync(artDir))if(name.endsWith('.png'))rmSync(join(artDir,name));
const legacyPortraits=join(artDir,'characters');if(existsSync(legacyPortraits))for(const name of readdirSync(legacyPortraits))if(name.endsWith('.png'))rmSync(join(legacyPortraits,name));
const chunks=readdirSync(artDir).filter(name=>/\.(js|css)$/.test(name)).map(name=>'/assets/'+name);
const paintedIcons=readdirSync(join(artDir,'painted-icons-v1')).filter(name=>name.endsWith('.webp')).map(name=>'/assets/painted-icons-v1/'+name);
writeFileSync(join(publicDir,'sw.js'),readFileSync(join(root,'src/MeetingJourney.Web/public/sw.js'),'utf8').replace('/*BUILD_ASSETS*/[]',JSON.stringify([...chunks,...paintedIcons])));
const testsDir=join(root,'src/MeetingJourney.Web/tests');execFileSync(process.execPath,['--experimental-strip-types','--test',...readdirSync(testsDir).filter(name=>name.endsWith('.test.mjs')).map(name=>join(testsDir,name))],{cwd:root,stdio:'inherit'});
resetGenerated(stagePublic);cpSync(publicDir,stagePublic,{recursive:true});
for(const file of ['server.js','package.json','meeting.js','meeting-catalog.js','meeting-schedule.js','study-guides.js','published-content.js','wol-metadata.js','passage-words.js'])cpSync(join(root,'node-app',file),join(stage,'node-app',file));
mkdirSync(join(stage,'node-app/content'),{recursive:true});cpSync(join(root,'node-app/content'),join(stage,'node-app/content'),{recursive:true});
for(const file of ['server.js','package.json'])cpSync(join(root,file),join(stage,file));
const html=readFileSync(join(publicDir,'index.html'),'utf8'),client=html.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];
const version=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
writeFileSync(join(stage,'build-info.json'),JSON.stringify({version,build:'20261103-release-three-accessibility',preparedUtc:new Date().toISOString(),client,checks:'Production client build and all current automated checks passed',visualReview:'Reviewed 390px phone home and part screens, 768px previous-notes view, and Spanish navigation. Physical-device and screen-reader checks remain outstanding.',personalData:'Device only; no journal upload; import confirmation is device-specific and not backed up',weeklyContent:'Opt-in WOL programme metadata and extracted listening words only. No article or verse text stored in meeting data. Reviewed outlines take precedence.'},null,2));
writeFileSync(join(stage,'UPLOAD-README.txt'),`Meeting Journey ${version}\nUpload all contents of this folder to the existing Node app root. Restart Node after all transfers finish. Open https://meetingjourney.com/refresh and tap Update app, then reopen the installed app. App version is shown under Settings > Your journal.\nPersonal data remains in browser/device storage. Do not clear website data as part of updating. Save a local backup from Settings.\nFuture reviewed weekly outlines can be uploaded individually into node-app/content without an app rebuild or restart. Preserve your own later weekly files.\n`);
console.log('Upload package ready: '+stage);
