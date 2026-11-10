import type {ReactNode} from 'react';
import {t} from './i18n';
import {ScriptureLookup} from './ScriptureLookup';

export function NoteEditor({value,onChange,disabled=false,autoFocus=false,id,maxLength,children}:{
  value:string;onChange:(value:string)=>void;disabled?:boolean;autoFocus?:boolean;id?:string;maxLength?:number;children?:ReactNode;
}){
  return <div className="modal-note-editor">
    <p>{t('A word, question or feeling is enough.')}</p>
    <textarea aria-label={t('My thought')} autoFocus={autoFocus} disabled={disabled} id={id} value={value} maxLength={maxLength} onChange={event=>onChange(event.target.value)} placeholder={t('Write or dictate a thought...')} rows={5}/>
    <ScriptureLookup text={value}/>
    {children}
  </div>;
}
