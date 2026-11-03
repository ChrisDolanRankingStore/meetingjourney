import {t} from './i18n.ts';
import type {Meeting} from './types.ts';

export function notebookContext(meetingId: string, partId: string, storage: Pick<Storage,'getItem'> = localStorage) {
  const baseId=partId.replace(/::page::\d+$/, '').replace(/:(connections|listening|bingo:(en|es))$/, '');
  const kind=meetingId.startsWith('assembly-')?'Assembly':meetingId.startsWith('convention-')?'Convention':meetingId.startsWith('weekend-')?'Weekend':'Midweek';
  const date=meetingId.match(/\d{4}-\d{2}-\d{2}/)?.[0]??'';
  let title=baseId.replace(/-/g,' '), reference='';
  try {
    const raw=storage.getItem(`mj-notebook-labels:${meetingId}`)??storage.getItem(`mj-meeting-cache:${meetingId}`);
    if(raw){
      const saved=JSON.parse(raw) as Pick<Meeting,'parts'>;
      const part=saved.parts?.find(part=>part.id===baseId);
      title=part?.title??title;reference=part?.textReference??'';
    }
  }catch(error){console.warn('Could not read cached notebook titles.',error);}
  const page=partId.match(/::page::(\d+)$/);
  const activity=partId.endsWith(':connections')?t('Connect the ideas'):partId.includes(':bingo:')?t('Word bingo'):'';
  return {title,reference,date,label:[t(kind),date,title,activity,page?t('Page {number}',{number:Number(page[1])+1}):''].filter(Boolean).join(' · ')};
}
export function notebookSearch(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
}
