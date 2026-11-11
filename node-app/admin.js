import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {AdminError,createAccessVerifier,readAdminConfig,requireAdminMutation} from './admin-auth.js';
import {openAdminStore} from './admin-store.js';
import {contentDirectory} from './published-content.js';
import {artworkConcept as concept,artworkHash as hash,reviewedArtworkItems} from './artwork-concepts.js';
import {createArtworkPlanner,readPlannerConfig} from './artwork-planner.js';

const assets=fileURLToPath(new URL('./admin/',import.meta.url));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export const isAdminPath=path=>path==='/admin'||path.startsWith('/admin/')||path==='/api/admin'||path.startsWith('/api/admin/');
export const isColouringPath=path=>path==='/api/colouring'||path.startsWith('/api/colouring/');

class ArtworkStorageError extends Error {
  constructor(cause){super('Private artwork storage initialization failed.',{cause});}
}
function storageErrorMessage(error) {
  const cause=error.cause;
  const filesystem={
    EACCES:'Node does not have permission to access or write the private data directory (EACCES).',
    EPERM:'The host denied access to the private data directory (EPERM).',
    EROFS:'The private data directory is on a read-only filesystem (EROFS).',
    ENOENT:'A required storage path is missing or not visible to the Node process (ENOENT).',
    ENOTDIR:'A component of the configured storage path is not a directory (ENOTDIR).',
    ENOSPC:'The filesystem has no space available for private artwork storage (ENOSPC).',
    EDQUOT:'The hosting storage quota has been exceeded (EDQUOT).'
  };
  const sqlite={
    5:'The private SQLite database is locked (SQLITE_BUSY).',
    8:'Node cannot write the private SQLite database (SQLITE_READONLY).',
    10:'The filesystem reported an SQLite input/output error (SQLITE_IOERR).',
    11:'The private SQLite database is corrupt (SQLITE_CORRUPT). Restore a verified backup.',
    13:'There is no space available for the private SQLite database (SQLITE_FULL).',
    14:'SQLite cannot open its database file. Check the directory path and Node write access (SQLITE_CANTOPEN).',
    26:'The private database file is not a valid SQLite database (SQLITE_NOTADB).'
  };
  const reason=Object.hasOwn(filesystem,cause?.code)?filesystem[cause.code]:
    cause?.code==='ERR_SQLITE_ERROR'&&Object.hasOwn(sqlite,cause.errcode)?sqlite[cause.errcode]:
    'Private artwork storage could not be initialized. Ask the host for the Node application error log.';
  return reason+' Keep storage outside the deployment target and public directories.';
}

function checked(input) {
  if(input.safetyReviewed!==true||input.sourceReviewed!==true)throw new AdminError(400,'Confirm both the child-safety and source-accuracy reviews.');
}
async function body(request,limit) {
  if(request.headers['content-encoding']&&request.headers['content-encoding']!=='identity')throw new AdminError(415,'Compressed uploads are not accepted.');
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0,failed=false;
    request.on('data',chunk=>{
      if(failed)return;
      size+=chunk.length;
      if(size>limit){failed=true;reject(new AdminError(413,'Upload is too large.'));return;}
      chunks.push(chunk);
    });
    request.on('end',()=>{if(!failed)resolve(Buffer.concat(chunks));});
    request.on('error',reject);
    request.on('aborted',()=>reject(new AdminError(400,'Upload interrupted. Try again.')));
  });
}
async function jsonBody(request) {
  if(request.headers['content-type']?.split(';')[0]!=='application/json')throw new AdminError(415,'Use a JSON request.');
  try {
    const value=JSON.parse((await body(request,12000)).toString('utf8'));
    if(!value||typeof value!=='object'||Array.isArray(value))throw new AdminError(400,'Use a JSON object.');
    return value;
  }
  catch(error){if(error instanceof AdminError)throw error;throw new AdminError(400,'Invalid JSON request.');}
}
export async function normalizeArtwork(buffer) {
  let metadata,image;
  try {
    metadata=await sharp(buffer,{limitInputPixels:16000000}).metadata();
    if(!['png','jpeg','webp'].includes(metadata.format)||(metadata.pages??1)!==1||!metadata.width||!metadata.height||
      metadata.width<256||metadata.height<256||metadata.width>4096||metadata.height>4096)throw new AdminError(400,'Use a single PNG, JPEG or WebP between 256 and 4096 pixels per side.');
    image=await sharp(buffer,{limitInputPixels:16000000}).rotate().flatten({background:'#ffffff'}).png().toBuffer();
  }catch(error){if(error instanceof AdminError)throw error;throw new AdminError(400,'The uploaded file could not be decoded as a supported image.');}
  if(image.length>8*1024*1024)throw new AdminError(413,'The prepared image is too large.');
  return image;
}

export function createAdminHandler({env=process.env,publicDir,meetingsDirectory=contentDirectory,verifyAccess,storeFactory=openAdminStore,plannerOptions={}}={}) {
  let config;
  try {config=readAdminConfig(env,publicDir);}catch(error){console.error('Administration disabled: '+error.message);}
  const verify=config?(verifyAccess??createAccessVerifier(config)):null;
  let store;
  const database=()=>{
    try{return store??=storeFactory(config.dataDir,publicDir);}
    catch(error){throw new ArtworkStorageError(error);}
  };
  const reviewedItems=()=>reviewedArtworkItems(meetingsDirectory);
  const availableItems=()=>{
    const items=reviewedItems(),keys=new Set(items.map(item=>`${item.meetingId}/${item.partId}`));
    return [...items,...database().sources().filter(item=>!keys.has(`${item.meetingId}/${item.partId}`))].sort((a,b)=>a.weekOf.localeCompare(b.weekOf));
  };
  let plannerConfig,plannerError;
  try{if(config)plannerConfig=readPlannerConfig(env);}
  catch(error){plannerError=error.message;console.error('Artwork automation disabled: '+plannerError);}
  const planner=plannerConfig?createArtworkPlanner({...plannerOptions,config:plannerConfig,database,reviewedItems}):null;
  const plannerStatus=()=>planner?planner.status():{enabled:false,running:false,message:plannerError??'Enable artwork automation and configure a Gemini key in private server settings.'};
  const matchesCurrentSource=data=>data.conceptApproval?.sourceHash===data.sourceHash&&availableItems().some(item=>item.meetingId===data.meetingId&&item.partId===data.partId&&item.sourceHash===data.sourceHash);
  const rates=new Map();
  const send=(response,status,value,type='application/json; charset=utf-8')=>{
    response.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'});
    response.end(type.startsWith('application/json')?JSON.stringify(value):value);
  };
  const limit=actor=>{
    const now=Date.now(),current=rates.get(actor);
    const next=!current||now-current.start>60000?{start:now,count:1}:{...current,count:current.count+1};
    rates.set(actor,next);
    if(next.count>120)throw new AdminError(429,'Too many administrator requests. Wait a minute and try again.');
  };
  const handler=async(request,response,path)=>{
    if(!isAdminPath(path)&&!isColouringPath(path))return false;
    response.setHeader('Cache-Control','no-store, private');
    response.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    let authenticated=false;
    try {
      if(!config){send(response,isAdminPath(path)?503:404,{error:isAdminPath(path)?'Administration is not configured.':'Not found'});return true;}
      if(isColouringPath(path)){
        if(request.method!=='GET')throw new AdminError(405,'Method not allowed.');
        const image=path.match(/^\/api\/colouring\/images\/([a-f0-9-]+)\.png$/);
        if(image&&uuid.test(image[1])){
          const entry=database().get(image[1]);
          if(entry.data.state!=='published'||entry.data.imageApproval?.imageHash!==entry.data.imageHash||!entry.image||!matchesCurrentSource(entry.data))throw new AdminError(404,'Not found');
          send(response,200,entry.image,'image/png');return true;
        }
        const selection=path.match(/^\/api\/colouring\/([a-zA-Z0-9_-]{1,100})\/([a-zA-Z0-9_-]{1,100})$/);
        if(!selection)throw new AdminError(404,'Not found');
        send(response,200,database().list().filter(item=>item.state==='published'&&item.meetingId===selection[1]&&item.partId===selection[2]&&item.imageApproval?.imageHash===item.imageHash&&matchesCurrentSource(item))
          .map(item=>({id:item.id,style:item.style,title:item.safeTheme,imageHash:item.imageHash,imageUrl:`/api/colouring/images/${item.id}.png`})));
        return true;
      }
      const actor=await verify(request);
      authenticated=true;
      limit(actor.subject);
      if(!['GET','POST'].includes(request.method))throw new AdminError(405,'Method not allowed.');
      if(request.method==='POST')requireAdminMutation(request,config);
      if(request.method==='GET'){
        const file={'/admin':'index.html','/admin/':'index.html','/admin/app.js':'app.js','/admin/styles.css':'styles.css'}[path];
        if(file){
          const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8';
          send(response,200,readFileSync(join(assets,file)),type);return true;
        }
        if(path==='/api/admin/session'){send(response,200,{email:actor.email});return true;}
        if(path==='/api/admin/meetings'){send(response,200,availableItems());return true;}
        if(path==='/api/admin/planner'){send(response,200,plannerStatus());return true;}
        if(path==='/api/admin/artwork'){send(response,200,database().list());return true;}
      }
      if(path==='/api/admin/planner/run'&&request.method==='POST'){
        if(!planner)throw new AdminError(503,plannerStatus().message);
        void planner.run({force:true}).catch(error=>console.error('Artwork planning check failed.',error));
        send(response,202,plannerStatus());return true;
      }
      if(path==='/api/admin/artwork'&&request.method==='POST'){
        const input=await jsonBody(request);
        send(response,201,database().create(concept(input,availableItems()),actor.subject));return true;
      }
      const match=path.match(/^\/api\/admin\/artwork\/([a-f0-9-]+)(\/image|\/actions|\/audit)?$/);
      if(!match||!uuid.test(match[1]))throw new AdminError(404,'Not found');
      const [,id,suffix]=match;
      if(request.method==='GET'){
        if(suffix==='/audit'){send(response,200,database().audit(id));return true;}
        const entry=database().get(id);
        if(suffix==='/image'){
          if(!entry.image)throw new AdminError(404,'No image has been uploaded.');
          send(response,200,entry.image,'image/png');
        }else if(!suffix)send(response,200,entry.data);
        else throw new AdminError(404,'Not found');
        return true;
      }
      const revision=Number(request.headers['if-match']);
      if(!Number.isSafeInteger(revision)||revision<1)throw new AdminError(428,'Send the current draft revision in If-Match.');
      if(suffix==='/image'){
        if(!['image/png','image/jpeg','image/webp'].includes(request.headers['content-type']))throw new AdminError(415,'Upload a PNG, JPEG or WebP image.');
        const current=database().get(id);
        if(current.data.revision!==revision)throw new AdminError(409,'This draft changed. Reload it before continuing.');
        if(!current.data.conceptApproval)throw new AdminError(409,'Approve the safe concept before uploading an image.');
        const image=await normalizeArtwork(await body(request,8*1024*1024));
        const result=database().update(id,revision,actor.subject,'upload-image',entry=>({
          data:{...entry.data,state:'image-ready',imageHash:hash(image),imageApproval:null,publishedAt:null},image
        }));
        send(response,200,result);return true;
      }
      const input=await jsonBody(request);
      if(!suffix){
        const updated=concept(input,availableItems());
        send(response,200,database().update(id,revision,actor.subject,'edit-concept',entry=>({data:{...updated,generation:entry.data.generation,createdAt:entry.data.createdAt},image:null})));return true;
      }
      if(suffix!=='/actions')throw new AdminError(404,'Not found');
      const result=database().update(id,revision,actor.subject,input.action,entry=>{
        const data={...entry.data},approval={actor:actor.subject,at:new Date().toISOString()};
        if(input.action==='approve-concept'){
          if(data.state!=='draft')throw new AdminError(409,'Only a draft concept can be approved.');
          if(!availableItems().some(item=>item.meetingId===data.meetingId&&item.partId===data.partId&&item.sourceHash===data.sourceHash))
            throw new AdminError(409,'The source changed. Save and review the updated concept first.');
          checked(input);data.conceptApproval={...approval,promptHash:hash(data.prompt),sourceHash:data.sourceHash};data.state='concept-approved';
        }else if(input.action==='approve-image'){
          if(data.state!=='image-ready'||!entry.image||data.conceptApproval?.promptHash!==hash(data.prompt))throw new AdminError(409,'Review an image generated from the approved concept first.');
          checked(input);data.imageApproval={...approval,imageHash:data.imageHash};data.state='approved';
        }else if(input.action==='publish'){
          const item=availableItems().find(item=>item.meetingId===data.meetingId&&item.partId===data.partId);
          if(data.state!=='approved'||!item||item.sourceHash!==data.sourceHash||!entry.image||data.imageApproval?.imageHash!==hash(entry.image))throw new AdminError(409,'An unchanged, approved image and matching reviewed meeting item are required.');
          data.state='published';data.publishedAt=approval.at;
        }else if(input.action==='withdraw'){
          data.state='rejected';data.imageApproval=null;data.publishedAt=null;
        }else throw new AdminError(400,'Unknown artwork action.');
        return {data,image:entry.image};
      });
      send(response,200,result);return true;
    }catch(error){
      const status=error instanceof AdminError?error.status:500;
      if(status>=500)console.error('Administrator request failed.',error);
      const message=error instanceof AdminError?error.message:
        authenticated&&error instanceof ArtworkStorageError?storageErrorMessage(error):'Administration is unavailable. Try again.';
      send(response,status,{error:message});
      return true;
    }
  };
  handler.start=()=>planner?.start();
  handler.runPlanner=()=>{
    if(!planner)throw new AdminError(503,plannerStatus().message);
    return planner.run({force:true});
  };
  handler.close=async()=>{await planner?.stop();store?.close();};
  return handler;
}
