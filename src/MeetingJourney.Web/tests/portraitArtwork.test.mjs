import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

test('wheelchair portrait has no floating fragment beside the head at any delivered size',async()=>{
  const sources=[
    '../public/assets/characters/adult40-3-clean.png',
    ...[180,360,720].map(height=>`../public/assets/compact-v1/adult40-3-clean-${height}.webp`)
  ];
  for(const source of sources){
    const {data,info}=await sharp(fileURLToPath(new URL(source,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const scale=info.height/1152;
    for(let y=Math.ceil(125*scale);y<Math.floor(185*scale);y++){
      for(let x=Math.ceil(140*scale);x<Math.floor(260*scale);x++){
        assert.equal(data[(y*info.width+x)*info.channels+3],0,`${source}: stray pixel at ${x},${y}`);
      }
    }
    assert.ok(data.some((value,index)=>index%info.channels===3&&value>0),`${source}: portrait must remain visible`);
  }
});
