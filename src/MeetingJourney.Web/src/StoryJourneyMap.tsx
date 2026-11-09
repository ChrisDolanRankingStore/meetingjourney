import {t, tt} from './i18n';
import { useState, type ReactNode, type CSSProperties, type PointerEvent, useRef, useEffect } from 'react';
import type { Meeting } from './types';
import {IconAction} from './IconAction';
import {NotebookIcon} from './NotebookIcon';
import {partTiming} from './circuitAssembly';
import {hasDaySessions, sessionForPart, sessionMapPoint, sessionPartIndices} from './meetingSessions';
import {MeetingSessionPicker} from './MeetingSessionPicker';
import {useComfort} from './ComfortSettings';
import {minutesToSong} from './ElapsedPart';

export function StoryJourneyMap({ meeting, current, onSelect, onBack, listView, companion, initialList = false }: {
  meeting: Meeting; current: number; onSelect: (index: number) => void; onBack: () => void;
  listView: (indices: number[]) => ReactNode;
  initialList?: boolean;
  companion?: ReactNode;
}) {
  const [list, setList] = useState(initialList);
  const comfort=useComfort();
  const [session, setSession] = useState(() => sessionForPart(meeting,current));
  const split = hasDaySessions(meeting);
  const indices = sessionPartIndices(meeting,session);
  const rows = Math.ceil(indices.length / 2);
  const points = indices.map((_, index) => sessionMapPoint(index,indices.length));
  const scrollRef = useRef<HTMLDivElement>(null);
  const next = indices.includes(current) ? current : indices[0];
  const dragRef=useRef<{pointer:number;x:number;y:number;startX:number;startY:number;moved:boolean}|null>(null);
  const [cursor,setCursor]=useState<{x:number;y:number}|null>(null);
  const dragging=cursor!==null;
  const [dropTarget,setDropTarget]=useState<number|null>(null);
  const suppressClick=useRef(false);
  const targetAt=(x:number,y:number)=>{
    const stop=document.elementFromPoint(x,y)?.closest<HTMLButtonElement>('[data-journey-stop]');
    return stop&&scrollRef.current?.contains(stop)?Number(stop.dataset.journeyStop):null;
  };
  const cancelDrag=()=>{dragRef.current=null;setCursor(null);setDropTarget(null);};
  useEffect(()=>{
    if(!dragging)return;
    let frame=0;
    const tick=()=>{
      const drag=dragRef.current,scroll=scrollRef.current;
      if(!drag||!scroll)return;
      const bounds=scroll.getBoundingClientRect();
      if(drag.x>=bounds.left&&drag.x<=bounds.right&&drag.y>=bounds.top-24&&drag.y<=bounds.bottom+24){
        const distance=drag.y<bounds.top+56?-Math.min(12,(bounds.top+56-drag.y)/5):drag.y>bounds.bottom-56?Math.min(12,(drag.y-bounds.bottom+56)/5):0;
        if(distance)scroll.scrollTop+=distance;
      }
      setDropTarget(targetAt(drag.x,drag.y));
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();suppressClick.current=true;cancelDrag();}};
    document.addEventListener('keydown',escape);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',escape);};
  },[dragging]);
  const startDrag=(event:PointerEvent<HTMLButtonElement>)=>{
    if(!event.isPrimary||event.button!==0)return;
    suppressClick.current=false;
    dragRef.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag=(event:PointerEvent<HTMLButtonElement>)=>{
    const drag=dragRef.current;
    if(!drag||drag.pointer!==event.pointerId)return;
    drag.x=event.clientX;drag.y=event.clientY;
    if(Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>8)drag.moved=true;
    if(drag.moved){suppressClick.current=true;setCursor({x:drag.x,y:drag.y});setDropTarget(targetAt(drag.x,drag.y));}
  };
  const finishDrag=(event:PointerEvent<HTMLButtonElement>)=>{
    const drag=dragRef.current;
    if(!drag||drag.pointer!==event.pointerId)return;
    const target=drag.moved?targetAt(event.clientX,event.clientY):null;
    cancelDrag();
    if(target!==null){
      // Touch drags may not emit a click; consume any release click before opening the new screen.
      const cleanup=()=>{
        document.removeEventListener('click',consumeClick,true);
        document.removeEventListener('pointerdown',cleanup,true);
        window.clearTimeout(timeout);
      };
      const consumeClick=(click:MouseEvent)=>{
        cleanup();
        if(click.detail>0){click.preventDefault();click.stopImmediatePropagation();}
      };
      const timeout=window.setTimeout(cleanup,500);
      document.addEventListener('click',consumeClick,true);
      document.addEventListener('pointerdown',cleanup,true);
      onSelect(target);
    }
  };
  useEffect(() => { cancelDrag();scrollRef.current?.scrollTo(0,0); }, [session,list,comfort.neutral]);
  const [canScroll, setCanScroll] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setCanScroll(el.scrollHeight > el.clientHeight + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [session, list, comfort.neutral, indices.length]);
  return <section className={`story-map-screen artwork-painted ${split ? 'has-day-sessions' : ''}`}>
    <header className="story-map-heading"><IconAction icon="back" label={t("Back to home")} onClick={onBack} /><div><p className="eyebrow">{t("Today's journey")}</p><h2>{list ? t("Meeting outline") : t("Choose your next stop")}</h2></div><IconAction icon={list ? 'route' : 'list'} label={list ? t("Map") : t("List")} aria-pressed={list} onClick={() => setList(value => !value)} /></header>
    {split && <MeetingSessionPicker value={session} onChange={setSession} />}
    {list ? <div className="story-map-list" ref={scrollRef}>{listView(indices)}</div> : <div className="journey-map-scroll" ref={scrollRef}><div className="illustrated-journey-map" style={{minHeight:split?Math.max(520,rows*220):Math.max(520,rows*150)}} aria-label={split ? t(session === 'morning' ? 'Morning programme map' : 'Afternoon programme map') : t("Meeting stops on the journey path")}>
      {indices.map((index, localIndex) => {const part=meeting.parts[index]; return <button type="button" key={part.id} data-journey-stop={index} className={`illustrated-stop section-${part.section.toLowerCase()} ${current === index ? 'is-current' : ''} ${dropTarget===index?'is-drop-target':''}`} style={{ '--stop-x': `${points[localIndex].x}%`, '--stop-y': `${points[localIndex].y}%` } as CSSProperties} onClick={() => onSelect(index)} aria-label={tt`Stop ${index + 1}: ${part.title}${current === index ? t(", your current place") : ''}`} aria-current={current === index ? 'step' : undefined}>
        <span className="illustrated-stop-marker" aria-hidden="true">{index + 1}</span><span className="illustrated-stop-caption"><NotebookIcon name={part.type==='Song' || part.type==='Music'?'music':part.section==='Treasures'?'treasure':part.section==='FieldMinistry'?'heart':'book'} /><strong>{part.title}</strong><small>{current === index ? t("You are here · ") : ''}{partTiming(part)}</small>{!comfort.hideCounts&&part.type==='Song'&&index>=current&&<small>{t('≈ {minutes} min from your place',{minutes:minutesToSong(meeting.parts,current,index)})}</small>}{part.speakerName && <small>{t('Speaker: {name}', {name:part.speakerName})}</small>}</span>
      </button>;})}
    </div></div>}
    <footer className="story-map-footer">
      {!list&&!comfort.neutral&&companion&&<button type="button" className={`map-companion-cursor${cursor?' is-dragging':''}`} aria-label={t('Drag your companion to a stop, or activate to continue')} title={t('Drag your companion to a stop, or activate to continue')} onDragStart={event=>event.preventDefault()} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={()=>{suppressClick.current=true;cancelDrag();}} onLostPointerCapture={cancelDrag} onClick={event=>{
        if(event.detail===0)onSelect(next);
        else if(!suppressClick.current)onSelect(next);
        suppressClick.current=false;
      }}>{companion}</button>}
      <p>{t(!list&&!comfort.neutral&&companion?'Drag to a stop, or tap it.':"Pick any stop.")}{canScroll && <><br /><small>{split ? t('Scroll to explore this session.') : t("Scroll to explore the journey.")}</small></>}</p><button className="map-continue" type="button" onClick={() => onSelect(next)}>{t("Continue")}<NotebookIcon name="next" /></button>
    </footer>
    {cursor&&<div className="map-companion-drag-preview" aria-hidden="true" style={{left:cursor.x,top:cursor.y}}>{companion}</div>}
    <span className="visually-hidden" role="status">{dropTarget!==null?t('Release to open {title}',{title:meeting.parts[dropTarget].title}):''}</span>
  </section>;
}
