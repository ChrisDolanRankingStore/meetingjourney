import {jwLibraryUrl,t} from './i18n';
import {OfficialLinks} from './OfficialLinks';
import {partSources} from './partSources';
import type {MeetingMaterial,MeetingPart} from './types';

export function PartReferenceLinks({part,material,compact=false}: {part:MeetingPart;material:MeetingMaterial;compact?:boolean}) {
  const {primary,scriptures,publications}=partSources(part,material);
  const citations=<div className="part-citations">
    {scriptures.map(link=><OfficialLinks key={link.url} url={link.url} appLabel={link.label} webLabel="JW.org" />)}
    {publications.map(link=><div key={link.url}><OfficialLinks url={link.url} appLabel={link.label} webLabel={jwLibraryUrl(link.url)?'JW.org':`${link.label} (JW.org)`} />{link.note&&<small>{link.note}</small>}</div>)}
  </div>;
  return <div className={`part-reference-links${compact?' compact':''}`} aria-label={t('Sources for {title}',{title:part.title})}>
    {(primary.url||primary.webUrl)&&<OfficialLinks url={primary.url} webUrl={primary.webUrl} appLabel={primary.label??(compact?'JW Library':'Open in JW Library')} webLabel={primary.label&&!jwLibraryUrl(primary.url)?`${primary.label} (JW.org)`:compact?'JW.org':'Open on JW.org'} />}
    {primary.note&&<small>{primary.note}</small>}
    {scriptures.length+publications.length>0&&(compact?<details><summary>{t('Scriptures and publications')}</summary>{citations}</details>:citations)}
  </div>;
}
