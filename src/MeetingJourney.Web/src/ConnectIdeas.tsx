import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {t, getLanguage} from './i18n';
import {emptyStudy, readStudy, saveStudy, type StudyProgress} from './studyStorage';
import {IllustratedIcon} from './IllustratedIcon';
import {connectionActivityFor, generalConnections} from './connectionActivity';
import type {MeetingPart} from './types';
export function ConnectIdeas({meetingId, partId, part}: {meetingId: string; partId: string; part?: MeetingPart}) {
  const activity = connectionActivityFor(meetingId, partId, part);
  const [value,setValue] = useState<StudyProgress>(()=>emptyStudy(meetingId,`${partId}:connections`));
  const [active,setActive] = useState<string | null>(null);
  const [undo,setUndo]=useState<Record<string,string>|null>(null);
  const [loaded,setLoaded] = useState(false), [status,setStatus] = useState('');
  const current = useRef(value), saves=useRef(Promise.resolve());
  const board = useRef<HTMLDivElement>(null);
  const [layout,setLayout]=useState<{width:number;height:number;sources:{x:number;y:number}[];targets:{x:number;y:number}[]}|null>(null);
  const {sources, targets} = activity;
  const language=getLanguage();
  useLayoutEffect(()=>{
    const element=board.current;
    if(!element)return;
    const measure=()=>{
      const bounds=element.getBoundingClientRect();
      if(!bounds.width||!bounds.height)return;
      const points=(selector:string,edge:'left'|'right')=>Array.from(element.querySelectorAll<HTMLButtonElement>(selector),button=>{
        const rect=button.getBoundingClientRect();
        return {x:rect[edge]-bounds.left,y:rect.top+rect.height/2-bounds.top};
      });
      setLayout({width:bounds.width,height:bounds.height,sources:points('[data-connection-source]','right'),targets:points('[data-connection-target]','left')});
    };
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(element);
    element.querySelectorAll('button').forEach(button=>observer.observe(button));
    return ()=>observer.disconnect();
  },[sources,targets,language]);
  useEffect(()=>{
    let alive=true;
    void readStudy(meetingId,`${partId}:connections`).then(saved=>{
      if(alive){current.current=saved??emptyStudy(meetingId,`${partId}:connections`);setValue(current.current);setLoaded(true);}
    }).catch(()=>{if(alive)setStatus('Could not open this activity. Try reopening it.');});
    return ()=>{alive=false;};
  },[meetingId,partId]);
  const update=(patch:Partial<StudyProgress>)=>{
    const next={...current.current,...patch,updatedAt:new Date().toISOString()};
    current.current=next;setValue(next);
    saves.current=saves.current.catch(()=>undefined).then(()=>saveStudy(next)).then(()=>setStatus('Saved on this device')).catch(()=>setStatus('Could not save'));
  };
  const display = (text: string) => {
    if (getLanguage() !== 'es' || !part?.connections) return t(text);
    if (text === activity.title) return part.connections.es.title;
    const source = sources.indexOf(text), target = targets.indexOf(text);
    return source >= 0 ? part.connections.es.sources[source] : target >= 0 ? part.connections.es.targets[target] : text;
  };
  return <section className="activity-card connect-activity" aria-label={t('Connect the ideas')}>
    <h3>{display(activity.title)}</h3>
    <p>{t(activity===generalConnections?'General listening prompts. Choose an idea, then tap a related example. Your connections are not scored.':'Choose an idea, then tap a related example. Your connections are not scored.')}</p>
    <p className="connection-step" role="status">{active?t('Choose a related example for {idea}',{idea:display(active)}):t('Choose an idea')}</p>
    <div className="idea-connections" ref={board}>
      <div className="idea-column connection-sources">{sources.map((source,index)=><button type="button" key={source} data-connection-source={index} disabled={!loaded} aria-pressed={active===source} onClick={()=>setActive(previous=>previous===source?null:source)}><span className="connection-dot" data-colour={index} /><span>{display(source)}</span></button>)}</div>
      <svg className="connection-lines" viewBox={`0 0 ${layout?.width??1} ${layout?.height??1}`} preserveAspectRatio="none" aria-hidden="true">
        {layout&&sources.map((source,index)=>{
          const target=targets.indexOf(value.pointChoices?.[source]??'');
          const start=layout.sources[index],end=layout.targets[target];
          if(!start||!end)return null;
          const middle=(start.x+end.x)/2;
          return <path key={source} data-colour={index} d={`M ${start.x} ${start.y} C ${middle} ${start.y}, ${middle} ${end.y}, ${end.x} ${end.y}`}/>;
        })}
      </svg>
      <div className="idea-column connection-targets">{targets.map((target,index)=><button type="button" key={target} data-connection-target={index} disabled={!loaded||!active} aria-pressed={Boolean(active&&value.pointChoices?.[active]===target)} onClick={()=>{
        if(!active)return;
        setUndo({...current.current.pointChoices});
        update({pointChoices:{...current.current.pointChoices,[active]:current.current.pointChoices?.[active]===target?'':target}});
      }}><IllustratedIcon name={target===targets[0]?'thought':target===targets[1]?'heart':target===targets[2]?'references':'listen'} /><span>{display(target)}</span></button>)}</div>
    </div>
    {undo&&<button type="button" onClick={()=>{update({pointChoices:undo});setUndo(null);}}>{t('Undo connection')}</button>}
    <p className="connection-help">{t('Tap the selected idea to deselect it. Tap its related example again to remove a connection.')}</p>
    <ul className="connection-summary">{sources.filter(source=>value.pointChoices?.[source]).map(source=><li key={source}><button type="button" aria-pressed={active===source} onClick={()=>setActive(source)}>{display(source)} → {display(value.pointChoices![source])}</button>{value.connectionExamples?.[source]&&<p>{value.connectionExamples[source]}</p>}</li>)}</ul>
    {active&&value.pointChoices?.[active]&&<label>{t('My example for {idea} (optional)',{idea:display(active)})}<textarea disabled={!loaded} maxLength={1000} value={value.connectionExamples?.[active]??''} onChange={event=>update({connectionExamples:{...current.current.connectionExamples,[active]:event.target.value}})} rows={2}/></label>}
    <label>{t('Add my own example')}<textarea disabled={!loaded} maxLength={10000} value={value.draft??''} onChange={event=>update({draft:event.target.value})} rows={2} /></label>
    <small role="status">{t(status)}</small>
  </section>;
}
