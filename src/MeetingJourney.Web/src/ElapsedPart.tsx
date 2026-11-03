import {useEffect,useRef,useState} from 'react';
import {useComfort} from './ComfortSettings';
import {t} from './i18n';

export function elapsedStep(elapsed:number, previous:number, now:number, running:boolean, duration:number) {
  return Math.min(duration,elapsed+(running?Math.max(0,now-previous):0));
}
export function minutesToSong(parts:{durationMinutes:number}[],current:number,target:number) {
  return target<current?undefined:parts.slice(current,target).reduce((sum,part)=>sum+part.durationMinutes,0);
}
export function ElapsedPart({minutes}:{minutes:number}) {
  const comfort=useComfort();
  const [elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false);
  const clock=useRef({elapsed:0,previous:0,visible:false});
  const duration=minutes*60000;
  useEffect(()=>{
    if(comfort.hideCounts||minutes<10)return;
    const state=clock.current;
    state.previous=performance.now();state.visible=!document.hidden;
    const tick=()=>{
      const now=performance.now();
      state.elapsed=elapsedStep(state.elapsed,state.previous,now,state.visible&&!paused,duration);
      state.previous=now;setElapsed(state.elapsed);
    };
    const visibility=()=>{tick();state.visible=!document.hidden;};
    document.addEventListener('visibilitychange',visibility);
    const interval=setInterval(tick,window.matchMedia('(prefers-reduced-motion: reduce)').matches?30000:1000);
    return()=>{tick();clearInterval(interval);document.removeEventListener('visibilitychange',visibility);};
  },[paused,comfort.hideCounts,minutes,duration]);
  if(comfort.hideCounts||minutes<10)return null;
  return <div className="elapsed-part">
    <button type="button" aria-pressed={paused} aria-label={t(paused?'Resume elapsed bar':'Pause elapsed bar')} onClick={()=>setPaused(value=>!value)}>
      <span className="elapsed-track" role="progressbar" aria-label={t('Elapsed part time')} aria-valuemin={0} aria-valuemax={minutes} aria-valuenow={Math.floor(elapsed/60000)}><span style={{width:`${elapsed/duration*100}%`}}/></span>
      {comfort.showMinutes&&<small>{t('{elapsed} of {total} min',{elapsed:Math.floor(elapsed/60000),total:minutes})}</small>}
    </button>
  </div>;
}
