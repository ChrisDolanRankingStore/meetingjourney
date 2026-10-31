import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {statSync} from 'node:fs';
import sharp from 'sharp';
import {paintedIconAssets,illustratedIconNames,movementIconNames} from '../src/paintedIcons.ts';

test('all fifteen painted icons have transparent padding, solid interiors and a compact download',async()=>{
  assert.equal(illustratedIconNames.length,9);
  assert.equal(movementIconNames.length,6);
  assert.equal(new Set(paintedIconAssets).size,15);
  let total=0;
  for(const source of paintedIconAssets){
    const file=fileURLToPath(new URL(`../public${source}`,import.meta.url));
    const metadata=await sharp(file).metadata();total+=statSync(file).size;
    assert.equal(metadata.format,'webp');
    assert.equal(metadata.width,128);
    assert.equal(metadata.height,128);
    assert.equal(metadata.hasAlpha,true);
    const {data}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let opaque=0;
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const alpha=data[(y*128+x)*4+3];
      if(x<8||x>=120||y<8||y>=120)assert.equal(alpha,0,`${source}: clipped padding`);
      if(alpha>=240)opaque++;
    }
    assert.ok(opaque>1000,`${source}: painted interior must remain solid`);
  }
  assert.ok(total<250*1024,`Painted icon budget exceeded: ${total} bytes`);
});
