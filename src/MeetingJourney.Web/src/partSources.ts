import {bibleReferenceLinks,getLanguage,jwLibraryUrl,t} from './i18n.ts';
import type {MeetingMaterial,MeetingPart} from './types';

export function partSources(part: MeetingPart, material: MeetingMaterial) {
  const sectionId = part.type==='BibleReading'?'reading':
    part.section==='Treasures'?'treasures':part.section==='FieldMinistry'?'ministry':
    part.section==='Living'&&part.type!=='CongregationBibleStudy'&&part.type!=='Song'?'living':undefined;
  const section = material.sections.find(item=>item.id===sectionId);
  const directScriptures = bibleReferenceLinks([
    part.textReference,
    ...part.activities.map(activity=>activity.mission?.scriptureReference)
  ].filter(Boolean).join(' '),getLanguage());
  const narrativeScriptures=directScriptures.length?[]:bibleReferenceLinks([part.summary,part.question].filter(Boolean).join(' '),getLanguage());
  const scriptures=directScriptures.length?directScriptures:narrativeScriptures.length?narrativeScriptures:bibleReferenceLinks(section?.reference,getLanguage());
  const locallyChosen = material.sections.some(item=>item.id==='watchtower')&&(part.type==='PublicTalk'||part.type==='Song');
  const specificUrl=(url?:string)=>locallyChosen&&url&&(url===material.appUrl||url===material.sourceUrl)?undefined:url;
  const fallbackApp=locallyChosen?undefined:section?.sourceUrl??material.appUrl??material.sourceUrl;
  const fallbackWeb=locallyChosen?undefined:section?.sourceUrl??material.sourceUrl??material.appUrl;
  const url = specificUrl(part.appUrl) ?? part.researchUrl ?? specificUrl(part.sourceUrl) ?? fallbackApp;
  const primaryKey = jwLibraryUrl(url) ?? url;
  const primaryReference=part.references.find(link=>(jwLibraryUrl(link.url)??link.url)===primaryKey);
  const primary = {url,webUrl:specificUrl(part.sourceUrl) ?? specificUrl(part.appUrl) ?? part.researchUrl ?? fallbackWeb,label:primaryReference?.label,note:primaryReference?.note};
  const publications = [
    ...part.references,
    ...(part.researchUrl?[{label:t('Research'),url:part.researchUrl}]:[]),
    ...(section?.sourceUrl?[{label:section.heading,url:section.sourceUrl}]:[])
  ].filter((link,index,links)=>{
    const key=jwLibraryUrl(link.url)??link.url;
    return key!==primaryKey&&links.findIndex(other=>(jwLibraryUrl(other.url)??other.url)===key)===index
      &&!scriptures.some(scripture=>(jwLibraryUrl(scripture.url)??scripture.url)===key);
  });
  return {primary,scriptures,publications};
}
