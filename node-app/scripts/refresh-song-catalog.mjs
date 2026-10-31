import {writeFileSync,mkdirSync} from 'node:fs';
const sources = {
 en: 'https://www.jw.org/en/library/music-songs/sing-out-joyfully/',
 es: 'https://www.jw.org/es/biblioteca/m%C3%BAsica-canciones/cantemos-con-gozo/'
};
const decode = value => value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g,' ').trim();
const catalog = {checkedOn: new Date().toISOString().slice(0,10), sources, songs: {}};
for (const [language,url] of Object.entries(sources)) {
 const response=await fetch(url);
 if(!response.ok)throw Error(`Song index returned ${response.status}`);
 const html=await response.text();
 const songs={};
 for(const match of html.matchAll(/<a\s+href="([^"]+)"\s+id="musicTrack(\d+)"[^>]*>([^<]+)<\/a>/g)){
  const number=Number(match[2]),title=decode(match[3]).replace(/^\d+\.\s*/, '');
  const sourceUrl=new URL(decode(match[1]),url).href;
  if(new URL(sourceUrl).hostname!=='www.jw.org'||!title)throw Error('Invalid song metadata');
  songs[number]={title,url:sourceUrl};
 }
 if(Object.keys(songs).length<150)throw Error(`Incomplete ${language} song index`);
 const entries=Object.values(songs);
 for(let offset=0;offset<entries.length;offset+=6){
  await Promise.all(entries.slice(offset,offset+6).map(async song=>{
   const page=await fetch(song.url);
   if(!page.ok)throw Error(`Song page returned ${page.status}: ${song.url}`);
   const documentId=(await page.text()).match(/data-docid="(\d+)"/)?.[1];
   if(!documentId)throw Error(`Missing song document ID: ${song.url}`);
   song.appUrl=`https://www.jw.org/finder?wtlocale=${language==='es'?'S':'E'}&docid=${documentId}`;
  }));
 }
 catalog.songs[language]=songs;
 console.log(`${language}: ${Object.keys(songs).length} official song titles`);
}
const directory=new URL('../../src/MeetingJourney.Web/src/data/',import.meta.url);
mkdirSync(directory,{recursive:true});
writeFileSync(new URL('songCatalog.json',directory),JSON.stringify(catalog,null,2)+'\n');
