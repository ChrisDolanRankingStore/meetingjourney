import {t, tt} from './i18n';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { Meeting } from './types';
import { SceneImage } from './artwork';
import {IconAction} from './IconAction';
import {NotebookIcon} from './NotebookIcon';
import { readMeetingDrawings, readNote } from './storage';
import { buildDiscoveryTreasures, discoverySummary, type DiscoveryDrawing, type DiscoveryTreasure } from './discoveryBook';
import { sceneSetForWeek } from './sceneSets';
import {hasDaySessions, sessionForPart, sessionMapPoint, sessionPartIndices} from './meetingSessions';
import {restoreMeetingPart} from './journeyExperience';
import {MeetingSessionPicker} from './MeetingSessionPicker';
import {renderDrawingInk} from './drawingInk';
import {NotesTimeline} from './NotesTimeline';
import {HistoricalNotebook, type HistoricalTarget} from './HistoricalNotebook';
import {MeetingStamps} from './MeetingStamps';
import {ScriptureLookup} from './ScriptureLookup';

function TreasureChest({ open }: { open: boolean }) {
  const shade = `chest-${useId().replace(/:/g, '')}`;
  return <svg className={`treasure-chest ${open ? 'is-open' : ''}`} viewBox="0 0 80 72" aria-hidden="true" focusable="false">
    <defs><linearGradient id={shade} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bd8751" /><stop offset="1" stopColor="#765037" /></linearGradient></defs>
    <ellipse cx="40" cy="63" rx="29" ry="5" fill="#493f3333" />
    <path d="M13 34L63 31L69 39V59L22 65L12 57Z" fill={`url(#${shade})`} stroke="#62462e" strokeWidth="2" />
    <path d="M22 43L69 39M22 43V65M32 42V63M59 40V60" fill="none" stroke="#c8a268" strokeWidth="3" />
    <path className="chest-inner" d="M16 33L61 31L67 38L23 44Z" fill="#f4dea1" stroke="#755339" strokeWidth="1.5" />
    <g className="chest-lid"><path d="M12 34Q12 13 35 12L56 12Q67 14 67 34L23 43Z" fill={`url(#${shade})`} stroke="#62462e" strokeWidth="2" /><path d="M23 43Q20 22 37 14M34 41Q32 24 42 13M57 36Q57 20 52 13" fill="none" stroke="#d6b479" strokeWidth="3" /><path d="M12 34L23 43L67 34" fill="none" stroke="#ebcb88" strokeWidth="2" /></g>
    <rect x="40" y="39" width="9" height="11" rx="2" fill="#eed291" stroke="#795b35" strokeWidth="1.3" /><circle cx="44.5" cy="43" r="1.3" fill="#795b35" />
  </svg>;
}

function SavedDrawingPreview({ drawing }: { drawing: DiscoveryDrawing }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paper = drawing.paper ?? { width: 760, height: 420 };
    const scale = Math.min(1, 1200 / Math.max(paper.width, paper.height));
    canvas.width = Math.max(1, Math.round(paper.width * scale));
    canvas.height = Math.max(1, Math.round(paper.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(renderDrawingInk(drawing.strokes, paper.width, paper.height, 1200), 0, 0, canvas.width, canvas.height);
  }, [drawing]);
  return <canvas className="treasure-drawing-preview" ref={canvasRef} role="img" aria-label={tt`Your saved drawing, page ${drawing.page + 1}`}>{t("Your saved drawing, page ")}{drawing.page + 1}.</canvas>;
}

function TreasureContents({ treasure, onReturn, onEdit }: { treasure: DiscoveryTreasure; onReturn: (index: number) => void; onEdit:(kind:'note'|'drawing',page?:number)=>void }) {
  const [page, setPage] = useState(0);
  const note = treasure.note;
  const drawing = treasure.drawings[page];
  return <div className="treasure-contents">
    {note?.text?.trim() && <section><h4>{t("My thought")}</h4><p className="treasure-own-words">{note.text}</p></section>}
    {(note?.feedback?.trim() || Boolean(note?.feedbackChoices?.length)) && <section><h4>{t("What I noticed")}</h4>{Boolean(note?.feedbackChoices?.length) && <div className="treasure-feeling-tags">{note!.feedbackChoices!.map(choice => <span key={choice}>{t(choice)}</span>)}</div>}{note?.feedback?.trim() && <p className="treasure-own-words">{note.feedback}</p>}</section>}
    {note&&<ScriptureLookup text={[note.text,note.feedback].filter(Boolean).join('\n')}/>}
    {drawing && <section><h4>{t("My drawing")}</h4>{treasure.drawings.length > 1 && <div className="treasure-page-tabs" aria-label={t("Saved drawing pages")}>{treasure.drawings.map((item, index) => <button type="button" key={item.page} aria-pressed={index === page} onClick={() => setPage(index)}>{t("Page ")}{item.page + 1}</button>)}</div>}<SavedDrawingPreview drawing={drawing} /></section>}
    {note&&<button type="button" className="treasure-return" onClick={()=>onEdit('note')}>{t('Edit note')}</button>}
    {drawing&&<button type="button" className="treasure-return" onClick={()=>onEdit('drawing',drawing.page)}>{t('Edit drawing')}</button>}
    <button type="button" className="treasure-return" onClick={() => onReturn(treasure.partIndex)}>{t("Return to this meeting part →")}</button>
  </div>;
}

export function savedDiscoveryLabel(standardRegister:boolean){
  return t(standardRegister?"Your saved discovery · Stop ":"Your saved treasure · Stop ");
}

export function DiscoveriesMap({ meeting, onReturn, teen = false, standardRegister = teen }: { meeting: Meeting; teen?: boolean; standardRegister?: boolean; onReturn: (index: number) => void }) {
  const [savedView]=useState(()=>{try{return sessionStorage.getItem('mj-discovery-view');}catch(error){console.warn('Could not restore discovery view.',error);return null;}});
  const [timeline,setTimeline]=useState(savedView==='history');
  const [editing,setEditing]=useState<HistoricalTarget|null>(null);
  const scenePack = sceneSetForWeek(meeting.weekOf);
  const split = hasDaySessions(meeting);
  const [session, setSession] = useState(() => sessionForPart(meeting,restoreMeetingPart(meeting,localStorage)));
  const indices = sessionPartIndices(meeting,session);
  const [treasures, setTreasures] = useState<DiscoveryTreasure[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [list, setList] = useState(savedView==='list'||!savedView&&teen);
  const [gallery, setGallery] = useState(savedView!=='list'&&savedView!=='map');
  useEffect(()=>{
    try{sessionStorage.setItem('mj-discovery-view',timeline?'history':gallery?'gallery':list?'list':'map');}
    catch(error){console.warn('Could not remember discovery view.',error);}
  },[timeline,gallery,list]);
  const [filter, setFilter] = useState<'all' | 'drawings' | 'thoughts' | 'feelings'>('all');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelId = `discovery-${useId().replace(/:/g, '')}`;
  const selected = treasures.find(item => item.part.id === selectedId);
  const visibleTreasures = treasures.filter(treasure => indices.includes(treasure.partIndex) && (filter==='all' || filter==='drawings' && treasure.drawings.length>0 || filter==='thoughts' && Boolean(treasure.note?.text?.trim()) || filter==='feelings' && Boolean(treasure.note?.feedback?.trim() || treasure.note?.feedbackChoices?.length)));
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false);
    Promise.all([Promise.all(meeting.parts.map(part => readNote(meeting.id, part.id))), readMeetingDrawings(meeting.id)]).then(([notes, drawings]) => {
      if (active) { setTreasures(buildDiscoveryTreasures(meeting, notes, drawings)); setLoading(false); }
    }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [meeting, retry]);
  useEffect(() => {
    const parent = mapRef.current;
    if (!parent) return;
    // Use the complete available workspace on phones; the old height cap left
    // a large empty strip beside the terrain in portrait mode.
    const measure = () => { const width = parent.clientWidth; const height = parent.clientHeight; setSize({ width, height }); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(parent);
    return () => observer.disconnect();
  }, [list,session,gallery,timeline]);
  useEffect(() => {mapRef.current?.scrollTo(0,0);setSelectedId(null);}, [session]);
  useEffect(() => {
    if (!selectedId) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedId(null); };
    document.addEventListener('keydown', escape);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', escape); previous?.focus(); };
  }, [selectedId]);
  const selectTreasure = (id: string) => setSelectedId(current => current === id ? null : id);
  if(editing)return <section className="discovery-map-screen"><HistoricalNotebook target={editing} onClose={()=>{setEditing(null);setRetry(value=>value+1);requestAnimationFrame(()=>closeRef.current?.focus());}}/></section>;
  return <section className={`discovery-map-screen ${split ? 'has-day-sessions' : ''} ${timeline ? 'showing-timeline' : ''} ${selected&&!timeline ? 'reading-discovery' : ''}`}>
    <header className="discovery-map-heading"><div><p className="eyebrow">{standardRegister ? t("My notes") : t("Your adventure journal")}</p><h2>{t("My discoveries")}</h2><p>{t("The things you chose to keep along the way.")}</p></div><div className="discovery-view-picker" role="group" aria-label={t('Discovery view')}>
      <IconAction icon="grid" label={t('Gallery')} aria-pressed={!timeline&&gallery} onClick={()=>{setTimeline(false);setSelectedId(null);setGallery(true);}} />
      <IconAction icon="route" label={t('Map')} aria-pressed={!timeline&&!gallery&&!list} onClick={()=>{setTimeline(false);setSelectedId(null);setGallery(false);setList(false);}} />
      <IconAction icon="list" label={t('List')} aria-pressed={!timeline&&!gallery&&list} onClick={()=>{setTimeline(false);setSelectedId(null);setGallery(false);setList(true);}} />
      <IconAction icon="calendar" label={t('Previous notes')} aria-pressed={timeline} onClick={()=>{setTimeline(true);setSelectedId(null);}} />
    </div>{!timeline&&<MeetingStamps key={retry} meeting={meeting}/>}</header>
    {timeline?<NotesTimeline/>:<><div className="discovery-filters" role="group" aria-label={t('Filter discoveries')}>{(['all','drawings','thoughts','feelings'] as const).map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>{setFilter(value);setSelectedId(null);}}>{t(({all:'All',drawings:'Drawings',thoughts:'Thoughts',feelings:'Feelings'})[value])}</button>)}</div>
    {split && <MeetingSessionPicker value={session} onChange={setSession} />}
    <div className={`discovery-map-workspace ${selected ? 'has-treasure-open' : ''}`}>
      {gallery ? <div className="discovery-gallery" aria-label={t('Saved meeting discoveries')}>{visibleTreasures.map(treasure=><button type="button" className="discovery-gallery-card" key={treasure.part.id} aria-expanded={selectedId===treasure.part.id} aria-controls={panelId} onClick={()=>selectTreasure(treasure.part.id)}>
        {treasure.drawings[0] ? <SavedDrawingPreview drawing={treasure.drawings[0]} /> : <div className="gallery-thought-preview"><NotebookIcon name={treasure.note?.text?.trim()?'note':'heart'} /><p>{treasure.note?.text || treasure.note?.feedback || treasure.note?.feedbackChoices?.map(choice=>t(choice)).join(' · ')}</p></div>}
        <small>{t('Stop {number}',{number:treasure.partIndex+1})}</small><strong>{treasure.part.title}</strong>
      </button>)}</div> : list ? <div className="treasure-list" aria-label={t("Saved meeting discoveries")}>{visibleTreasures.map(treasure => <button type="button" key={treasure.part.id} onClick={() => selectTreasure(treasure.part.id)} aria-expanded={selectedId === treasure.part.id} aria-controls={panelId}><TreasureChest open={selectedId === treasure.part.id} /><span><strong>{treasure.part.title}</strong><small>{discoverySummary(treasure)}</small></span></button>)}</div> : <div className="treasure-map-viewport" ref={mapRef}><div className="treasure-terrain" style={{ width: size.width, height: split ? Math.max(size.height, Math.ceil(indices.length/2)*130) : size.height }} aria-label={t("Your saved discoveries along the meeting journey")}>
        <SceneImage source={scenePack.discoveryImage} alt={t(scenePack.discoveryDescription,{location:t(scenePack.label)})} />
        {visibleTreasures.map(treasure => {const position = split ? sessionMapPoint(indices.indexOf(treasure.partIndex),indices.length) : treasure.position; return <div className="treasure-stop" key={treasure.part.id} style={{ '--treasure-x': `${position.x}%`, '--treasure-y': `${position.y}%` } as CSSProperties}>
          <button type="button" className="treasure-stop-button" onClick={() => selectTreasure(treasure.part.id)} aria-label={tt`Open your discovery from ${treasure.part.title}`} aria-expanded={selectedId === treasure.part.id} aria-controls={panelId} aria-describedby={`${panelId}-${treasure.part.id}-preview`}><TreasureChest open={selectedId === treasure.part.id} /><span className="treasure-stop-number">{treasure.partIndex + 1}</span></button>
          <div className="treasure-stop-preview" id={`${panelId}-${treasure.part.id}-preview`} role="tooltip"><strong>{treasure.part.title}</strong><small>{discoverySummary(treasure)}</small>{treasure.note?.text?.trim() && <p>{treasure.note.text.slice(0, 90)}{treasure.note.text.length > 90 ? '…' : ''}</p>}</div>
        </div>;})}
      </div></div>}
      {selected && <aside className="open-treasure" id={panelId} aria-labelledby={`${panelId}-title`}><button ref={closeRef} className="close-treasure" type="button" onClick={() => setSelectedId(null)} aria-label={t("Close this discovery")}>×</button><div className="open-treasure-heading"><TreasureChest open /><p className="eyebrow">{savedDiscoveryLabel(standardRegister)}{selected.partIndex + 1}</p><h3 id={`${panelId}-title`}>{selected.part.title}</h3></div><TreasureContents key={selected.part.id} treasure={selected} onReturn={onReturn} onEdit={(kind,page)=>setEditing({meetingId:meeting.id,partId:`${selected.part.id}${page?`::page::${page}`:''}`,kind})} /></aside>}
      {(loading || failed) && <div className="treasure-map-message" role="status">{loading ? t("Opening your discovery map…") : <><p>{t("Your discoveries could not be loaded from this device.")}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{t("Try again")}</button></>}</div>}
    </div>
    <p className="discovery-map-hint">{treasures.length ? gallery || list ? t('Choose a card to open your saved discovery.') : t("Tap a chest to open it. Hover or focus for a preview.") : t("Your notes and drawings stay on this device.")}</p></>}
  </section>;
}
