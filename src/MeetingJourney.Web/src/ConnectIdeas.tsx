import {useEffect, useRef, useState} from 'react';
import {t, getLanguage} from './i18n';
import {emptyStudy, readStudy, saveStudy, type StudyProgress} from './studyStorage';
import {IllustratedIcon} from './IllustratedIcon';
import {connectionActivityFor} from './connectionActivity';
import type {MeetingPart} from './types';
export function ConnectIdeas({meetingId, partId, part}: {meetingId: string; partId: string; part?: MeetingPart}) {
  const activity = connectionActivityFor(meetingId, partId, part);
  const [value,setValue] = useState<StudyProgress>(()=>emptyStudy(meetingId,`${partId}:connections`));
  const [active,setActive] = useState<string | null>(null);
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
  if (!activity) return <p role="alert">{t('No prepared connections are available for this part.')}</p>;
  const {sources, targets} = activity;
  const display = (text: string) => {
    if (getLanguage() !== 'es' || !part?.connections) return t(text);
    if (text === activity.title) return part.connections.es.title;
    const source = sources.indexOf(text), target = targets.indexOf(text);
    return source >= 0 ? part.connections.es.sources[source] : target >= 0 ? part.connections.es.targets[target] : text;
  };
  return <section className="activity-card connect-activity" aria-label={t('Connect the ideas')}>
    <h3>{display(activity.title)}</h3>
    <p>{t('Choose an idea, then tap a related example. Your connections are not scored.')}</p>
    <div className="idea-connections">
      <div className="idea-column">{sources.map((source,index)=><button type="button" key={source} disabled={!loaded} aria-pressed={active===source} onClick={()=>setActive(source)}><span className="connection-dot" data-colour={index} />{display(source)}</button>)}</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{sources.map((source,index)=>{
        const target=targets.indexOf(value.pointChoices?.[source]??'');
        return target<0?null:<path key={source} stroke={['#55917b','#b87746','#7474b0','#c36e68'][index]} d={`M 0 ${12.5+index*25} C 50 ${12.5+index*25}, 50 ${12.5+target*25}, 100 ${12.5+target*25}`} />;
      })}</svg>
      <div className="idea-column">{targets.map(target=><button type="button" key={target} disabled={!loaded||!active} onClick={()=>{
        if(!active)return;
        update({pointChoices:{...current.current.pointChoices,[active]:current.current.pointChoices?.[active]===target?'':target}});
      }}><IllustratedIcon name={target===targets[0]?'thought':target===targets[1]?'heart':target===targets[2]?'references':'listen'} /><span>{display(target)}</span></button>)}</div>
    </div>
    <ul className="connection-summary">{sources.filter(source=>value.pointChoices?.[source]).map(source=><li key={source}>{display(source)} → {display(value.pointChoices![source])}</li>)}</ul>
    <label>{t('Add my own example')}<textarea disabled={!loaded} value={value.draft??''} onChange={event=>update({draft:event.target.value})} rows={2} /></label>
    <small role="status">{t(status)}</small>
  </section>;
}
