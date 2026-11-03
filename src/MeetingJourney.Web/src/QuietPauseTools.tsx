import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {t} from './i18n';

function BreatheTile(){
 const[running,setRunning]=useState(false);
 return <button type="button" className={`quiet-pause-tile breathe-tile${running?' is-running':''}`} aria-pressed={running} aria-label={t('Breathe')} onClick={()=>setRunning(value=>!value)}>
  <svg viewBox="0 0 64 64" aria-hidden="true"><circle className="breathe-ring" cx="32" cy="32" r="13"/></svg><span>{t('Breathe')}</span>
 </button>;
}

function SpinTile(){
 const [angle,setAngle]=useState(0),[reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const drag=useRef<{pointer:number;last:number;time:number;velocity:number}|null>(null),frame=useRef(0);
 useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
 useEffect(()=>{if(reduced)cancelAnimationFrame(frame.current);},[reduced]);
 const down=(event:PointerEvent<HTMLButtonElement>)=>{if(reduced)return;cancelAnimationFrame(frame.current);event.currentTarget.setPointerCapture(event.pointerId);drag.current={pointer:event.pointerId,last:event.clientX,time:performance.now(),velocity:0};};
 const move=(event:PointerEvent<HTMLButtonElement>)=>{const state=drag.current;if(reduced||!state||state.pointer!==event.pointerId)return;const now=performance.now(),elapsed=Math.max(1,now-state.time),delta=event.clientX-state.last;state.velocity=delta/elapsed;state.last=event.clientX;state.time=now;setAngle(value=>value+delta);};
 const up=(event:PointerEvent<HTMLButtonElement>)=>{const state=drag.current;if(state?.pointer!==event.pointerId)return;drag.current=null;if(reduced)return;let velocity=state.velocity,last=performance.now();const tick=(now:number)=>{const elapsed=Math.min(40,now-last);last=now;velocity*=Math.pow(.94,elapsed/16);setAngle(value=>value+velocity*elapsed);if(Math.abs(velocity)>=.01)frame.current=requestAnimationFrame(tick);};if(Math.abs(velocity)>=.01)frame.current=requestAnimationFrame(tick);};
 return <button type="button" className="quiet-pause-tile spin-tile" disabled={reduced} aria-label={t('Spin')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={event=>{if(!reduced&&(event.key==='ArrowRight'||event.key==='ArrowLeft'))setAngle(value=>value+(event.key==='ArrowRight'?45:-45));}}>
  <svg viewBox="0 0 64 64" aria-hidden="true" style={{transform:`rotate(${angle}deg)`}}><path d="M32 8a24 24 0 1 1-17 7" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/><path d="m9 8 7 9 10-1" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{t('Spin')}</span>
 </button>;
}

export function QuietPauseTools(){
 return <div className="quiet-pause-tools" role="group" aria-label={t('Hands-only pause tools')}><BreatheTile/><SpinTile/></div>;
}
