import {useEffect,useState} from 'react';
import {t} from './i18n';
import {fetchPublishedArtwork,type PublishedArtwork} from './publishedArtwork';
import {NotebookIcon} from './NotebookIcon';

export function PublishedArtworkPicker({meetingId,partId,disabled,onChoose}:{meetingId:string;partId:string;disabled:boolean;onChoose:(item:PublishedArtwork)=>Promise<void>}){
  const [items,setItems]=useState<PublishedArtwork[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError('');setItems([]);
    fetchPublishedArtwork(meetingId,partId,controller.signal).then(result=>{
      if(!controller.signal.aborted)setItems(result);
    }).catch(()=>{
      if(!controller.signal.aborted)setError('Published outlines could not be loaded. Try again when online.');
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[meetingId,partId,retry]);
  return <details className="published-artwork-picker">
    <summary>{t('Colour a published outline')}{items.length>0?` (${items.length})`:''}</summary>
    <p>{t('Optional outlines for this meeting item. Choosing one adds a new page and keeps your existing drawings.')}</p>
    {loading?<p role="status">{t('Loading outlines...')}</p>:error?<div role="alert"><p>{t(error)}</p><button className="published-artwork-retry" type="button" onClick={()=>setRetry(value=>value+1)}><NotebookIcon name="redo"/>{t('Try again')}</button></div>:items.length===0?<p>{t('No published outlines for this meeting item yet. Blank drawing pages are always available.')}</p>:<div className="published-artwork-list">
      {items.map(item=><button type="button" key={item.id} disabled={disabled||busy} onClick={()=>{
        setBusy(true);setError('');
        void onChoose(item).catch(error=>setError(error instanceof Error?error.message:'This outline could not be opened.'))
          .finally(()=>setBusy(false));
      }}><img src={item.imageUrl} alt="" loading="lazy"/><span>{item.title}<small>{t(({simple:'Simple outlines',detailed:'Detailed outlines',manga:'Manga-inspired outlines'})[item.style])}</small></span><span>{t('Use on a new page')}</span></button>)}
    </div>}
    {busy&&<p role="status">{t('Saving the outline on this device...')}</p>}
  </details>;
}
