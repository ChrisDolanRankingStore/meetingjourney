import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';

const web=fileURLToPath(new URL('../../src/MeetingJourney.Web/',import.meta.url));
const sharp=createRequire(join(web,'package.json'))('sharp');
const [toolSheet,movementSheet]=process.argv.slice(2);
if(!toolSheet||!movementSheet)throw Error('Provide the tool sheet and movement sheet PNG paths.');
const output=join(web,'public/assets/painted-icons-v1');
mkdirSync(output,{recursive:true});
const sheets=[
  {source:toolSheet,width:768,height:768,cells:[
    ['listen',0,20,270,265],['discover',270,20,245,265],['notes',515,20,253,265],
    ['references',0,285,280,225],['clue',280,285,235,225],['thought',515,285,253,225],
    ['question',0,515,275,225],['heart',275,515,235,225],['connect',515,515,253,225]
  ]},
  {source:movementSheet,width:1152,height:768,cells:[
    ['move-fidget',0,0,384,384],['move-bounce',384,0,384,384],['move-stretch',768,0,384,384],
    ['move-sway',0,384,384,384],['move-shake',384,384,384,384],['move-dance',768,384,384,384]
  ]}
];
for(const sheet of sheets){
  const metadata=await sharp(resolve(sheet.source)).metadata();
  if(metadata.width!==sheet.width||metadata.height!==sheet.height||!metadata.hasAlpha)throw Error(`Unexpected sheet dimensions or missing alpha: ${sheet.source}`);
  for(const [name,left,top,width,height]of sheet.cells){
    const {data,info}=await sharp(resolve(sheet.source)).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const visited=new Uint8Array(width*height);
    // Keep distinct rays and motion marks, but discard isolated extraction flecks.
    for(let start=0;start<visited.length;start++){
      if(visited[start]||data[start*4+3]===0)continue;
      const pixels=[start];visited[start]=1;
      for(let index=0;index<pixels.length;index++){
        const pixel=pixels[index],x=pixel%width,y=Math.floor(pixel/width);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=x+dx,ny=y+dy;
          if(nx<0||nx>=width||ny<0||ny>=height)continue;
          const next=ny*width+nx;
          if(!visited[next]&&data[next*4+3]>0){visited[next]=1;pixels.push(next);}
        }
      }
      if(pixels.length<60)for(const pixel of pixels)data[pixel*4+3]=0;
    }
    let minX=width,minY=height,maxX=-1,maxY=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    if(maxX<0)throw Error(`No artwork found for ${name}`);
    const icon=await sharp(data,{raw:info}).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1})
      .resize(112,112,{fit:'contain',background:'#00000000'}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'})
      .webp({lossless:true,effort:6}).toFile(join(output,`${name}.webp`));
    console.log(`${name}: ${icon.size} bytes`);
  }
}
