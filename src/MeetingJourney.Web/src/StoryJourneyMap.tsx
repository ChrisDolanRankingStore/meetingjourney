import {t, tt} from './i18n';
import { useState, type ReactNode, type CSSProperties, useRef, useEffect } from 'react';
import type { Meeting } from './types';
import {IconAction} from './IconAction';
import {NotebookIcon} from './NotebookIcon';
import {partTiming} from './circuitAssembly';
import {sceneSetForWeek} from './sceneSets';
import {sceneImage} from './artwork';
import {hasDaySessions, sessionForPart, sessionMapPoint, sessionPartIndices} from './meetingSessions';
import {MeetingSessionPicker} from './MeetingSessionPicker';

export function StoryJourneyMap({ meeting, current, onSelect, onBack, listView, initialList = false }: {
  meeting: Meeting; current: number; onSelect: (index: number) => void; onBack: () => void;
  listView: (indices: number[]) => ReactNode;
  initialList?: boolean;
}) {
  const [list, setList] = useState(initialList);
  const [session, setSession] = useState(() => sessionForPart(meeting,current));
  const split = hasDaySessions(meeting);
  const indices = sessionPartIndices(meeting,session);
  const rows = Math.ceil(indices.length / 2);
  const points = indices.map((_, index) => sessionMapPoint(index,indices.length));
  const scrollRef = useRef<HTMLDivElement>(null);
  const next = indices.includes(current) ? current : indices[0];
  const pack = sceneSetForWeek(meeting.weekOf);
  useEffect(() => { scrollRef.current?.scrollTo(0,0); }, [session,list]);
  return <section className={`story-map-screen artwork-painted ${split ? 'has-day-sessions' : ''}`}>
    <header className="story-map-heading"><IconAction icon="back" label={t("Back to home")} onClick={onBack} /><div><p className="eyebrow">{t("Today's journey")}</p><h2>{list ? t("Meeting outline") : t("Choose your next stop")}</h2></div><IconAction icon={list ? 'route' : 'list'} label={list ? t("Map") : t("List")} aria-pressed={list} onClick={() => setList(value => !value)} /></header>
    {split && <MeetingSessionPicker value={session} onChange={setSession} />}
    {list ? <div className="story-map-list" ref={scrollRef}>{listView(indices)}</div> : <div className="journey-map-scroll" ref={scrollRef}><div className="illustrated-journey-map" style={{'--map-image':`url("${sceneImage(pack.discoveryImage)}")`, minHeight:split?Math.max(520,rows*220):Math.max(520,rows*150)} as CSSProperties} aria-label={split ? t(session === 'morning' ? 'Morning programme map' : 'Afternoon programme map') : t("Meeting stops on the journey path")}>
      {indices.map((index, localIndex) => {const part=meeting.parts[index]; return <button type="button" key={part.id} className={`illustrated-stop section-${part.section.toLowerCase()} ${current === index ? 'is-current' : ''}`} style={{ '--stop-x': `${points[localIndex].x}%`, '--stop-y': `${points[localIndex].y}%` } as CSSProperties} onClick={() => onSelect(index)} aria-label={tt`Stop ${index + 1}: ${part.title}${current === index ? t(", your current place") : ''}`} aria-current={current === index ? 'step' : undefined}>
        <span className="illustrated-stop-marker" aria-hidden="true">{index + 1}</span><span className="illustrated-stop-caption"><NotebookIcon name={part.type==='Song' || part.type==='Music'?'music':part.section==='Treasures'?'treasure':part.section==='FieldMinistry'?'heart':'book'} /><strong>{part.title}</strong><small>{current === index ? t("You are here · ") : ''}{partTiming(part)}</small>{part.speakerName && <small>{t('Speaker: {name}', {name:part.speakerName})}</small>}</span>
      </button>;})}
    </div></div>}
    <footer className="story-map-footer"><p>{t("Pick any stop.")}<br /><small>{split ? t('Scroll to explore this session.') : t("Scroll to explore the journey.")}</small></p><button className="map-continue" type="button" onClick={() => onSelect(next)}>{t("Continue")}<NotebookIcon name="next" /></button></footer>
  </section>;
}
