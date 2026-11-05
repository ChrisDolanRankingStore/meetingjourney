import {existsSync, mkdirSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../src/MeetingJourney.Web/package.json',import.meta.url));
const sharp=require('sharp');

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const masters=join(root,'artwork','seasonal-masters');
const output=join(root,'src','MeetingJourney.Web','public','assets','compact-v1');
const seasons={summer:'',spring:'-sp',autumn:'-a',winter:'-w'};
const views={map:null,gate:[0,.5],river:[.03,.46],bridge:[.25,.30],village:[.5,.12],garden:[0,0]};
const [selectedWorld,selectedSeason,...extra]=process.argv.slice(2);
if(extra.length||(selectedWorld&&!/^[1-6]$/.test(selectedWorld))||(selectedSeason&&!Object.hasOwn(seasons,selectedSeason))||Boolean(selectedWorld)!==Boolean(selectedSeason))throw Error('Usage: node prepare-seasonal-artwork.mjs [world season]');
mkdirSync(output,{recursive:true});
let count=0,bytes=0;
for(let world=1;world<=6;world++)for(const [season,suffix] of Object.entries(seasons)){
  if(selectedWorld&&(world!==Number(selectedWorld)||season!==selectedSeason))continue;
  const source=join(masters,`meeting-valley-${world}${suffix}.png`);
  const metadata=await sharp(source).metadata();
  if(!metadata.width||!metadata.height)throw Error(`Invalid source dimensions: ${source}`);
  for(const [view,position] of Object.entries(views)){
    const standalone=join(root,'artwork','seasonal-views',`scene-${world}-${season}-${view}.png`);
    const hasStandalone=existsSync(standalone);
    const cropWidth=Math.floor(metadata.width/2),cropHeight=Math.floor(metadata.height/2);
    const crop=position?{left:Math.round(position[0]*metadata.width),top:Math.round(position[1]*metadata.height),width:cropWidth,height:cropHeight}:null;
    for(const width of [480,960,1600])for(const format of ['webp','jpg']){
      let image=sharp(hasStandalone?standalone:source).rotate();
      if(crop&&!hasStandalone)image=image.extract(crop);
      image=image.resize({width,withoutEnlargement:true}).toColourspace('srgb');
      image=format==='webp'?image.webp({quality:78,effort:6}):image.jpeg({quality:80,mozjpeg:true});
      const destination=join(output,`scene-${world}-${season}-${view}-v2-${width}.${format}`);
      await image.toFile(destination);
      bytes+=statSync(destination).size;count++;
    }
  }
}
console.log(JSON.stringify({images:count,bytes}));
