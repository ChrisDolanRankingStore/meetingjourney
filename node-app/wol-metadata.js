import {getMeeting} from './meeting-catalog.js';
import {weekOfDate} from './meeting-schedule.js';
import {extractPassageWords,passageText} from './passage-words.js';

const languages={en:'r1/lp-e',es:'r4/lp-s'};
const cache=new Map();
const pending=new Map();
const notice='Programme titles and references updated from WOL. Listening prompts are general; reviewed activities are added separately.';
const text=html=>html.replace(/<[^>]*>/g,'').replace(/&#x([a-f0-9]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code,16))).replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code))).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g,entity=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '})[entity]).replace(/[\u200b\u200e\u200f\u00ad]/g,'').replace(/\s+/g,' ').trim();
const finder=(docid,language,pid)=>`https://www.jw.org/finder?wtlocale=${language==='es'?'S':'E'}&docid=${docid}${pid?`&par=${pid}`:''}`;

export function wolWeekUrl(date,language='en'){
 const monday=weekOfDate(date),day=new Date(`${monday}T00:00:00Z`);
 day.setUTCDate(day.getUTCDate()+3);
 const year=day.getUTCFullYear(),start=new Date(Date.UTC(year,0,1));
 const week=Math.ceil(((day-start)/86400000+1)/7);
 if(!Object.hasOwn(languages,language))throw Error('Unsupported programme language.');
 return `https://wol.jw.org/${language}/wol/meetings/${languages[language]}/${year}/${week}`;
}

function documentHtml(html){
 const article=html.match(/<article\b[^>]*\bid="article"[^>]*>([\s\S]*?)<\/article>/i)?.[1];
 if(!article)throw Error('WOL programme document is missing.');
 return article;
}

function references(html,language){
 const links=[];
 for(const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)){
  const url=new URL(text(match[1]),'https://wol.jw.org');
  if(url.hostname!=='wol.jw.org'||url.protocol!=='https:'||!url.pathname.startsWith(`/${language}/wol/`)||!/\/(?:bc|pc)\//.test(url.pathname))continue;
  const label=text(match[2]);
  const previous=links.at(-1);
  if(previous&&/\/bc\//.test(url.pathname)&&/,\s*$/.test(previous.label)&&/^\d/.test(label)){
   previous.label=`${previous.label} ${label}`;
  }else if(label&&label.length<=160&&!links.some(link=>link.url===url.href))links.push({label,url:url.href});
 }
 return links.slice(0,40).map(link=>({...link,label:link.label.replace(/,\s*$/,'')}));
}

export function parseWorkbookMetadata(html,language){
 const article=documentHtml(html);
 const headings=[...article.matchAll(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)];
 const reading=headings.find(heading=>heading[1]==='2'&&/\/wol\/bc\//.test(heading[3]));
 const items=[];
 let section='Opening';
 for(let index=0;index<headings.length;index++){
  const heading=headings[index],title=text(heading[3]),attributes=heading[2];
  if(heading[1]==='2'){
   if(/teal/.test(attributes))section='Treasures';
   else if(/gold/.test(attributes))section='FieldMinistry';
   else if(/maroon/.test(attributes))section='Living';
   continue;
  }
  const number=title.match(/^(\d+)\.\s*(.+)/),pid=attributes.match(/\bdata-pid="(\d+)"/)?.[1];
  if(!pid)throw Error('WOL programme heading identifier is missing.');
  const end=headings[index+1]?.index??article.indexOf('<!-- Root element',heading.index);
  const block=article.slice(heading.index,end>heading.index?end:undefined);
  const minutes=Number(text(block).match(/\((\d+)\s*mins?\.?\)/i)?.[1]);
  const song=title.match(/(?:Song|Canción)\s+(\d+)/i);
  if(number){
   if(!minutes||minutes>60)throw Error('WOL programme duration is missing.');
   const type=section==='FieldMinistry'?'Demonstration':/Bible Reading|Lectura de la Biblia/i.test(title)?'BibleReading':/Congregation Bible Study|Estudio bíblico de la congregación/i.test(title)?'CongregationBibleStudy':'Talk';
   items.push({id:`part-${number[1]}`,number:Number(number[1]),title:number[2],section,type,durationMinutes:minutes,pid,references:references(block,language)});
  }else if(section==='Opening'&&song){
   items.push({id:'opening-song',title:language==='es'?`Canción ${song[1]} y oración`:`Song ${song[1]} and prayer`,songNumber:Number(song[1]),section,type:'Song',durationMinutes:5,pid,references:[]});
   items.push({id:'opening-comments',title:language==='es'?'Palabras de introducción':'Opening comments',section,type:'Comments',durationMinutes:minutes||1,pid,references:[]});
  }else if(section==='Living'&&song&&!/\|/.test(title)){
   items.push({id:'living-song',title:language==='es'?`Canción ${song[1]}`:`Song ${song[1]}`,songNumber:Number(song[1]),section,type:'Song',durationMinutes:5,pid,references:[]});
  }else if(song&&/\|/.test(title)){
   items.push({id:'closing-comments',title:language==='es'?'Palabras de conclusión':'Concluding comments',section:'Closing',type:'Comments',durationMinutes:minutes||3,pid,references:[]});
   items.push({id:'closing-song',title:language==='es'?`Canción ${song[1]} y oración`:`Song ${song[1]} and prayer`,songNumber:Number(song[1]),section:'Closing',type:'Song',durationMinutes:5,pid,references:[]});
  }
 }
 const numbered=items.filter(item=>item.number);
 if(!reading||numbered.length<5||items.length>30||numbered.some((item,index)=>item.number!==index+1)||!items.some(item=>item.id==='closing-song')||!items.some(item=>item.type==='CongregationBibleStudy'))throw Error('WOL programme format is incomplete or has changed.');
 return {bibleReading:text(reading[3]),parts:items};
}

export function parseStudyMetadata(html,language){
 const article=documentHtml(html),title=text(article.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]??'');
 const header=article.slice(0,article.indexOf('</header>')+9);
 const song=text(header).match(/(?:SONG|CANCIÓN)\s+(\d+)/i);
 if(!title||title.length>300||!song)throw Error('WOL study metadata is incomplete.');
 return {title,songNumber:Number(song[1]),references:references(header,language)};
}

async function fetchHtml(url,fetcher,redirects=0){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.hostname!=='wol.jw.org')throw Error('Unsupported metadata source.');
 const response=await fetcher(url,{signal:AbortSignal.timeout(12000),redirect:'manual',headers:{'User-Agent':'MeetingJourney/0.5.4 (programme and listening metadata)'}});
 if([301,302,303,307,308].includes(response.status)){
  if(redirects>=4)throw Error('Too many metadata redirects.');
  return fetchHtml(new URL(response.headers.get('location'),url).href,fetcher,redirects+1);
 }
 if(!response.ok)throw Error(`WOL returned HTTP ${response.status}.`);
 const reader=response.body.getReader(),chunks=[];
 let size=0;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500000)throw Error('WOL document exceeds the metadata size limit.');chunks.push(value);}
 }finally{await reader.cancel();reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}

async function retrieve(kind,date,fetcher){
 const base=getMeeting(kind,date),results={};
 const documents=new Map();
 const documentFor=url=>{if(!documents.has(url))documents.set(url,fetchHtml(url,fetcher));return documents.get(url);};
 const activityMetadata=async(part,language)=>{
  const citations=part.references.filter(link=>link.url.includes('/bc/'));
  try{
   if(['CongregationBibleStudy','WatchtowerStudy'].includes(part.type)){
    const source=part.references.find(link=>link.url.includes('/pc/'));
    if(source){
     const chapter=await documentFor(source.url);
     citations.push(...references(documentHtml(chapter),language).filter(link=>link.url.includes('/bc/')));
    }
   }
   const passages=[];
   for(const citation of citations.slice(0,16))passages.push(passageText(await documentFor(citation.url),citation.label));
   const nouns=extractPassageWords(passages.join(' '),language);
   if(nouns.length)part.bingoWords=nouns.map(({word})=>({word,source:'passage'}));
  }catch(error){
   console.error('Could not prepare passage listening words.',{partId:part.id,language,error:error.message});
   part.activityNotice=language==='es'?'No se pudieron preparar las palabras de esta semana. Se muestran palabras conocidas.':'This week’s words could not be prepared. Familiar words are available.';
  }
 };
 for(const language of ['en','es']){
  const index=await fetchHtml(wolWeekUrl(date,language),fetcher);
  const shownDate=index.match(/id="todayDate"[^>]*value="([\d/]+)"/)?.[1]?.replaceAll('/','-');
  if(shownDate!==base.weekOf)throw Error('WOL returned a different meeting week.');
  const publication=kind==='midweek'?'mwb':'w';
  const card=[...index.matchAll(/<li\b[^>]*class="([^"]+)"[^>]*>([\s\S]*?)<\/li>/gi)].find(match=>new RegExp(`\\bpub-${publication}\\b`).test(match[1])&&/\btodayItem\b/.test(match[1]));
  const docid=card?.[1].match(/\bdocId-(\d+)\b/)?.[1];
  if(!docid)throw Error('WOL weekly publication is not available.');
  const sourceUrl=finder(docid,language);
  const html=await fetchHtml(`https://wol.jw.org/${language}/wol/d/${languages[language]}/${docid}`,fetcher);
  if(kind==='midweek'){
   const metadata=parseWorkbookMetadata(html,language);
   // Keep notebooks already created with the general outline attached to their corresponding items.
   let ministry=false,living=false;
   for(const item of metadata.parts){
    if(item.type==='CongregationBibleStudy')item.id='study';
    else if(item.section==='FieldMinistry'&&!ministry){item.id='ministry';ministry=true;}
    else if(item.section==='Living'&&item.type!=='Song'&&!living){item.id='living';living=true;}
    item.appUrl=finder(docid,language,item.pid);item.sourceUrl=item.appUrl;delete item.pid;
   }
   results[language]={...metadata,sourceUrl};
  }else{
   const metadata=parseStudyMetadata(html,language);
   const parts=structuredClone(base.parts);
   Object.assign(parts.find(part=>part.id==='watchtower-study'),{title:metadata.title,references:metadata.references,appUrl:sourceUrl,sourceUrl});
   Object.assign(parts.find(part=>part.id==='study-song'),{title:`${language==='es'?'Canción':'Song'} ${metadata.songNumber}`,songNumber:metadata.songNumber});
   results[language]={bibleReading:metadata.title,parts,sourceUrl};
  }
  for(const part of results[language].parts)await activityMetadata(part,language);
 }
 const english=results.en,spanish=results.es;
 if(english.parts.length!==spanish.parts.length||english.parts.some((part,index)=>part.id!==spanish.parts[index].id))throw Error('WOL programme translations do not match.');
 const parts=english.parts.map(item=>{
  const template=base.parts.find(part=>part.id===item.id)??base.parts.find(part=>part.type===item.type&&part.section===item.section);
  return {summary:template?.summary??'Listen for one helpful idea. You can draw or write what you notice.',activities:[],references:[],...item};
 });
 return {...base,contentStatus:'dated',contentNotice:notice,bibleReading:english.bibleReading,
  material:{...base.material,appUrl:english.sourceUrl,sourceUrl:english.sourceUrl},parts,
  programmeMetadata:{retrievedAt:new Date().toISOString(),sourceUrl:wolWeekUrl(date),es:{bibleReading:spanish.bibleReading,parts:spanish.parts}}};
}

export function cachedWolMeeting(kind,date){return cache.get(`${kind}:${weekOfDate(date)}`)?.meeting;}

export async function loadWolMeeting(kind,date,{fetcher=fetch,now=Date.now}={}){
 const base=getMeeting(kind,date);
 if(base.contentStatus==='dated')return base;
 const key=`${kind}:${base.weekOf}`,saved=cache.get(key);
 if(saved&&saved.expires>now())return saved.meeting;
 if(pending.has(key))return pending.get(key);
 const request=(async()=>{
  try{
   const meeting=await retrieve(kind,date,fetcher);
   cache.delete(key);cache.set(key,{meeting,expires:now()+24*60*60*1000});
   return meeting;
  }catch(error){
   console.error('WOL programme metadata update failed.',{kind,weekOf:base.weekOf,error:error instanceof Error?error.message:String(error)});
   const meeting=saved?.meeting.contentStatus==='dated'?{...saved.meeting,contentNotice:'The programme could not be refreshed. Showing the last saved programme.'}:{...base,contentNotice:'The online programme could not be loaded. General notebooks are available; open the official programme for this week.'};
   cache.delete(key);cache.set(key,{meeting,expires:now()+15*60*1000});
   return meeting;
  }finally{pending.delete(key);while(cache.size>32)cache.delete(cache.keys().next().value);}
 })();
 pending.set(key,request);
 return request;
}
