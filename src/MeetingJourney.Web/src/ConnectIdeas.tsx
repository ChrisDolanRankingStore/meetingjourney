import {useEffect, useRef, useState} from 'react';
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
  const {sources, targets} = activity;
  const display = (text: string) => {
    if (getLanguage() !== 'es' || !part?.connections) return t(text);
    if (text === activity.title) return part.connections.es.title;
    const source = sources.indexOf(text), target = targets.indexOf(text);
    return source >= 0 ? part.connections.es.sources[source] : target >= 0 ? part.connections.es.targets[target] : text;
  };
  return <section className="activity-card connect-activity" aria-label={t('Connect the ideas')}>
    <h3>{display(activity.title)}</h3>
    <p>{t(activity===generalConnections?'General listening prompts. Choose an idea, then tap a related example. Your connections are not scored.':'Choose an idea, then tap a related example. Your connections are not scored.')}</p>
    <div className="idea-connections">
      <details className="connection-source-picker" open={!active}><summary>{active?display(active):t('Choose an idea')}</summary>
      <div className="idea-column">{sources.map((source,index)=><button type="button" key={source} disabled={!loaded} aria-pressed={active===source} onClick={()=>setActive(previous=>previous===source?null:source)}><span className="connection-dot" data-colour={index} />{display(source)}</button>)}</div>
      </details>
      {active&&<><p className="connection-step" role="status">{t('Choose a related example for {idea}',{idea:display(active)})}</p><div className="idea-column connection-targets">{targets.map(target=><button type="button" key={target} disabled={!loaded} aria-pressed={Boolean(value.pointChoices?.[active]===target)} onClick={()=>{
        if(!active)return;
        setUndo({...current.current.pointChoices});
        update({pointChoices:{...current.current.pointChoices,[active]:current.current.pointChoices?.[active]===target?'':target}});
      }}><IllustratedIcon name={target===targets[0]?'thought':target===targets[1]?'heart':target===targets[2]?'references':'listen'} /><span>{display(target)}</span></button>)}</div></>}
    </div>
    {undo&&<button type="button" onClick={()=>{update({pointChoices:undo});setUndo(null);}}>{t('Undo connection')}</button>}
    <p className="connection-help">{t('Tap the selected idea to deselect it. Tap its related example again to remove a connection.')}</p>
    <ul className="connection-summary">{sources.filter(source=>value.pointChoices?.[source]).map(source=><li key={source}><button type="button" aria-pressed={active===source} onClick={()=>setActive(source)}>{display(source)} → {display(value.pointChoices![source])}</button>{value.connectionExamples?.[source]&&<p>{value.connectionExamples[source]}</p>}</li>)}</ul>
    {active&&value.pointChoices?.[active]&&<label>{t('My example for {idea} (optional)',{idea:display(active)})}<textarea disabled={!loaded} maxLength={1000} value={value.connectionExamples?.[active]??''} onChange={event=>update({connectionExamples:{...current.current.connectionExamples,[active]:event.target.value}})} rows={2}/></label>}
    <label>{t('Add my own example')}<textarea disabled={!loaded} maxLength={10000} value={value.draft??''} onChange={event=>update({draft:event.target.value})} rows={2} /></label>
    <small role="status">{t(status)}</small>
  </section>;
}
