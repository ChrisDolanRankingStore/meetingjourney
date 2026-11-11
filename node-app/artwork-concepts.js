import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {AdminError} from './admin-auth.js';
import {validatePublishedWeek} from './published-content.js';

export const artworkHash=value=>createHash('sha256').update(value).digest('hex');
export const artworkStyles=['simple','detailed','manga'];
export function reviewedArtworkItems(directory) {
  return readdirSync(directory).filter(name=>/^(midweek|weekend)-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort().flatMap(name=>{
    const meeting=validatePublishedWeek(JSON.parse(readFileSync(join(directory,name),'utf8').replace(/^\uFEFF/,'')));
    return meeting.parts.filter(part=>part.type==='WatchtowerStudy'||part.type==='CongregationBibleStudy'||part.section==='Treasures'&&part.type==='Talk')
      .map(part=>({meetingId:meeting.id,weekOf:meeting.weekOf,partId:part.id,title:part.title,
        reference:part.textReference??part.references.map(reference=>typeof reference==='string'?reference:reference.label).join('; '),
        sourceHash:artworkHash(JSON.stringify(part)),sourceUrl:part.sourceUrl??meeting.material.sourceUrl??meeting.material.appUrl,
        sourceStatus:'reviewed',context:part.summary,kind:meeting.kind,
        automatable:part.type==='WatchtowerStudy'||part.section==='Treasures'&&part.number===1}));
  });
}
function text(value,name,max) {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new AdminError(400,`Enter a valid ${name}.`);
  return value.trim();
}
export function artworkConcept(input,items) {
  const item=items.find(item=>item.meetingId===input.meetingId&&item.partId===input.partId);
  if(!item)throw new AdminError(400,'Choose an eligible meeting item.');
  if(!artworkStyles.includes(input.style))throw new AdminError(400,'Choose a supported drawing style.');
  const safeTheme=text(input.safeTheme,'child-safe theme',300),scene=text(input.scene,'safe scene description',1500);
  const style={simple:'Simple friendly cartoon outlines, bold clear lines and large colouring areas.',detailed:'Natural proportions and moderately detailed outlines with generous colouring areas.',manga:'Original manga-inspired line art with expressive, calm faces and clear colouring areas.'}[input.style];
  const prompt=`Create ONE original black-and-white colouring page. ${style}
Theme: ${safeTheme}
Scene: ${scene}
Use a calm, reassuring composition suitable for children, with modest, fully clothed characters wherever people appear.
Use original character designs, clean closed outlines, generous open colouring areas and a plain white background.
Keep the artwork unlettered and unshaded.`;
  return {meetingId:item.meetingId,weekOf:item.weekOf,partId:item.partId,partTitle:item.title,sourceHash:item.sourceHash,
    sourceUrl:item.sourceUrl,sourceStatus:item.sourceStatus,style:input.style,safeTheme,scene,prompt,
    state:'draft',conceptApproval:null,imageHash:null,imageApproval:null,publishedAt:null};
}
