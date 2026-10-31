import { IconAction } from './IconAction';
import { ListeningSettings } from './ListeningSettings';
import { ListeningActivities } from './ListeningActivities';
import {ConnectIdeas} from './ConnectIdeas';
import {PartActivities, type PartActivityChoice} from './PartActivities';
import {hasConnectIdeas} from './connectionActivity';
import { WordBingo } from './WordBingo';
import { companionVerticalTravel, moveCompanionPosition } from './companionPosition';
import {ageOptions, characterStyles, companionAsset, detailedPrompts, looksForAge, normalizeAge, refreshedPortrait, withCompanionAge, type AgeGroup, type CharacterStyle, type CharacterGender} from './companions';
import {meetingLanguage} from './meetingLanguage';
import {setLanguage} from './i18n';
import {t, tt} from './i18n';
import {LanguageSelector, useLanguage} from './LanguageSelector';
import {localizeMeeting} from './meetingLocale';
import {bibleReferenceLinks, getLanguage, jwLibraryHandoffUrl, jwLibraryUrl, officialUrl} from './i18n';
import {BibleReferenceLinks, OfficialLinks} from './OfficialLinks';
import {PartReferenceLinks} from './PartReferenceLinks';
import {partSources} from './partSources';
import {IllustratedIcon} from './IllustratedIcon';
import {MovementIcon} from './MovementIcon';
import {HomeGuidePanel, type HomeGuideAction} from './HomeGuidePanel';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useMeetingSchedule, type MeetingSchedule } from './useMeetingSchedule';
import { MeetingPicker, MeetingDaysSettings, meetingDateLabel } from './MeetingPicker';
import { applyCircuitVisit, VISIT_UPDATED } from './circuitVisit';
import {partTiming} from './circuitAssembly';
import {hasListeningTools, programmePartLabel} from './programmeParts';
import { lazy, Suspense } from 'react';
import { DataControls } from './DataControls';
import {LocalPartTitles, SongDetailsButton} from './MeetingDetails';
import {DETAILS_UPDATED, personalizeMeeting} from './localMeetingDetails';
import {OfficialReturn} from './OfficialReturn';
import {useOfflinePreparation} from './offlinePreparation';
import { OfflineMeeting, DisplaySettings } from './OfflineMeeting';
import { StudyTools } from './StudyTools';
import { MeetingReview, WelcomeScreen } from './MeetingReview';
import { sceneImage } from './artwork';
import { sceneSetForWeek, sceneSeasonClass } from './sceneSets';
const DrawingPad = lazy(() => import('./DrawingPad').then(module => ({ default: module.DrawingPad })));
import { StoryJourneyMap } from './StoryJourneyMap';
import { CompanionPortrait } from './CompanionPortrait';
import { DiscoveriesMap } from './DiscoveriesMap';
import { NotebookIcon } from './NotebookIcon';
import { restoreMeetingPart, storyMoment } from './journeyExperience';
import { readNote, saveNote } from './storage';
import type { EngagementActivity, Meeting, MeetingPart } from './types';

type Presentation = 'simple' | 'standard' | 'reflective';
type Engagement = 'quiet' | 'guided' | 'active';
type CharacterVariant = 'standard' | 'tall' | 'short' | 'slim' | 'robust' | 'chunky';
type HairColour = 'natural' | 'black' | 'brown' | 'auburn' | 'blonde' | 'blue';
type EyeColour = 'brown' | 'blue' | 'green' | 'hazel' | 'grey';
type CharacterAction = 'steady' | 'fidget' | 'bounce' | 'stretch' | 'sway' | 'shake' | 'dance';
type AppScreen = 'home' | 'overview' | 'outline' | 'journey' | 'discoveries' | 'settings' | 'study' | 'prep' | 'review';
type CompanionQuickAction = 'story' | 'activities' | 'feelings' | 'doodle' | 'note' | 'source';

type CharacterProfile = {
  portrait?: 'original' | 'prepared';
  portraitRevision?: number;
  gender: CharacterGender;
  ageGroup: AgeGroup;
  style: CharacterStyle;
  name: string;
  variant: CharacterVariant;
  hairColour: HairColour;
  eyeColour: EyeColour;
  glasses: boolean;
  cap: boolean;
  backpack: boolean;
  tablet: boolean;
  phone: boolean;
};

const defaultProfile: CharacterProfile = { portrait:'prepared', portraitRevision:1, gender: 'boy', ageGroup: 'preteen', style: 'classic-boy', name: '', variant: 'standard', hairColour: 'natural', eyeColour: 'brown', glasses: false, cap: false, backpack: true, tablet: false, phone: false };
const hairColourOptions: { id: HairColour; label: string; value: string }[] = [
  { id: 'natural', label: 'Natural', value: '#8a5a3b' },
  { id: 'black', label: 'Black', value: '#201d24' },
  { id: 'brown', label: 'Brown', value: '#68432f' },
  { id: 'auburn', label: 'Auburn', value: '#a34f2b' },
  { id: 'blonde', label: 'Blonde', value: '#d8a94d' },
  { id: 'blue', label: 'Blue', value: '#4f78b8' }
];
const eyeColourOptions: { id: EyeColour; label: string; value: string }[] = [
  { id: 'brown', label: 'Brown', value: '#5b3829' },
  { id: 'blue', label: 'Blue', value: '#4d8bb8' },
  { id: 'green', label: 'Green', value: '#4b8b68' },
  { id: 'hazel', label: 'Hazel', value: '#9a7840' },
  { id: 'grey', label: 'Grey', value: '#738397' }
];
const genderOptions: { id: CharacterGender; label: string; colour: string }[] = [
  { id: 'boy', label: 'Boy', colour: '#5b61d6' },
  { id: 'girl', label: 'Girl', colour: '#d86d8d' }
];

function readCharacterProfile(): CharacterProfile | null {
  const saved = localStorage.getItem('mj-character');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as Partial<CharacterProfile>;
    if (parsed.gender && parsed.ageGroup) {
      const style = parsed.style && characterStyles.some(option => option.id === parsed.style) ? parsed.style : parsed.gender === 'girl' ? 'classic-girl' : 'classic-boy';
      const savedVariant = (parsed.variant as string | undefined) === 'stocky' ? 'robust' : parsed.variant;
      return withCompanionAge({ ...defaultProfile, ...parsed, ageGroup: normalizeAge(parsed.ageGroup), portrait: refreshedPortrait({...parsed,style}), portraitRevision:1, style, variant: savedVariant ?? defaultProfile.variant, hairColour: parsed.hairColour ?? defaultProfile.hairColour, eyeColour: parsed.eyeColour ?? defaultProfile.eyeColour, name: typeof parsed.name === 'string' ? parsed.name.slice(0, 24) : '' }, normalizeAge(parsed.ageGroup));
    }
  } catch {
    const legacy = saved as CharacterGender | AgeGroup;
    const gender = legacy === 'girl' ? 'girl' : 'boy';
    return { ...defaultProfile, gender, style: gender === 'girl' ? 'classic-girl' : 'classic-boy', ageGroup: legacy === 'teen' || legacy === 'preteen' ? legacy : 'child' };
  }
  return null;
}

function profileName(profile: CharacterProfile) {
  return profile.name.trim() || t('Your companion');
}

function companionMessage(action: CharacterAction, partIndex = 0) {
  if (action === 'fidget') return t("Moving helps. Keep going in the way that works for you.");
  if (action === 'bounce') return t("Nice energy. We are ready when you are.");
  if (action === 'stretch') return t("Take a stretch. Your body can help you reset.");
  if (action === 'sway') return t("Sway, rock or settle in the way that feels good.");
  if (action === 'shake') return t("Shake it out. Come back when you are ready.");
  if (action === 'dance') return t("A little dance is welcome. We can keep going together.");
  if (partIndex === 0) return t("You've got this. We can take it one step at a time.");
  return t("Look how far you have come. Take your time with this stop.");
}

function genderColour(gender: CharacterGender) {
  return genderOptions.find(option => option.id === gender)?.colour ?? '#5b61d6';
}

function characterAsset(profile: CharacterProfile) { return companionAsset(profile); }

function sectionLabel(section: MeetingPart['section']) {
  return t(({
    Opening: 'Opening',
    Treasures: "Treasures from God's Word",
    FieldMinistry: 'Apply Yourself to the Ministry',
    Living: 'Living as Christians',
    PublicTalk: 'Public talk',
    Programme: 'Programme',
    Watchtower: 'Watchtower study',
    Closing: 'Closing'
  } as const)[section]);
}

function officialPartUrl(part: MeetingPart, material: Meeting['material']) {
  const sources=partSources(part,material);
  const biblePassage=part.type==='BibleReading'?sources.scriptures[0]?.url:undefined;
  return jwLibraryHandoffUrl(biblePassage??sources.primary.url??sources.primary.webUrl);
}

function openOfficialMaterial(url: string) {
  window.dispatchEvent(new Event('mj-official-open'));
  window.open(url, '_blank', 'noopener,noreferrer');
}

function SpiritualGemsCard({part, material}: {part: MeetingPart; material: Meeting['material']}) {
  const question = part.question ?? (part.activities.find(activity => activity.type === 'SpotTheClue')?.prompt ?? part.summary);
  const textReference = part.textReference ?? material.sections.find(section => section.id === 'treasures')?.reference;
  const researchApp = officialUrl(part.researchUrl ?? part.appUrl ?? material.appUrl);
  const researchWeb = officialUrl(part.sourceUrl ?? material.sourceUrl);
  return <section className="spiritual-gems-card" aria-labelledby={`${part.id}-gems-title`}>
    <div className="spiritual-gems-heading"><span className="activity-label">{t("Spiritual gems question")}</span><span className="spiritual-gems-mark" aria-hidden="true">✦</span></div>
    <h3 id={`${part.id}-gems-title`}>{t("Think about this")}</h3>
    <p className="spiritual-gems-question">{question}</p>
    {(textReference || researchApp || researchWeb) && <div className="spiritual-gems-links" aria-label={t("Spiritual gems sources")}>
      {textReference && <BibleReferenceLinks reference={textReference} />}
      <OfficialLinks url={researchApp} webUrl={researchWeb ?? researchApp} appLabel="Research in JW Library" webLabel="Research on JW.org" />
    </div>}
  </section>;
}

export default function App() {
  const schedule = useMeetingSchedule();
  const language = useLanguage();
  useLayoutEffect(() => {const next=meetingLanguage({id:schedule.meeting.id,kind:schedule.meeting.kind},localStorage,getLanguage());if(next!==getLanguage())setLanguage(next);},[schedule.meeting.id,schedule.meeting.kind]);
  const [titleRevision, setTitleRevision] = useState(0);
  useEffect(() => {
    const update = () => setTitleRevision(value => value + 1);
    window.addEventListener(DETAILS_UPDATED, update); window.addEventListener(VISIT_UPDATED, update);
    return () => { window.removeEventListener(DETAILS_UPDATED, update); window.removeEventListener(VISIT_UPDATED, update); };
  }, []);
  const localMeeting = useMemo(() => personalizeMeeting(schedule.meeting, localStorage, language), [schedule.meeting, titleRevision, language]);
  const localizedSchedule = {...schedule, meeting: applyCircuitVisit(localizeMeeting(schedule.meeting, language), localStorage, language)};
  const [welcomed, setWelcomed] = useState(() => Boolean(localStorage.getItem('mj-welcome-seen') || readCharacterProfile()));
  const [, setDisplayRevision] = useState(0);
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = localStorage.getItem('mj-theme') ?? 'painted';
      document.documentElement.dataset.artwork = 'painted';
      document.documentElement.dataset.font = localStorage.getItem('mj-font') ?? 'system';
      document.documentElement.dataset.palette = localStorage.getItem('mj-palette') ?? 'journey';
      setDisplayRevision(value=>value+1);
    };
    apply(); window.addEventListener('mj-display-change', apply);
    return () => window.removeEventListener('mj-display-change', apply);
  }, []);
  if (!welcomed) return <WelcomeScreen onStart={() => { localStorage.setItem('mj-welcome-seen', 'true'); setWelcomed(true); }} />;
  return <><MeetingApp key={schedule.meeting.id} meeting={localMeeting} schedule={localizedSchedule} /><MeetingPicker schedule={localizedSchedule} /></>;
}

function MeetingApp({ meeting, schedule }: { meeting: Meeting; schedule: MeetingSchedule }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [partIndex, setPartIndex] = useState(() => restoreMeetingPart(meeting, localStorage));
  const [presentation, setPresentation] = useState<Presentation>(() => (localStorage.getItem('mj-presentation') as Presentation | null) ?? 'standard');
  const [engagement, setEngagement] = useState<Engagement>(() => (localStorage.getItem('mj-engagement') as Engagement | null) ?? 'guided');
  const [calmView, setCalmView] = useState(() => localStorage.getItem('mj-calm-view') === 'true');
  const [character, setCharacter] = useState<CharacterProfile | null>(() => readCharacterProfile());
  const [characterAction, setCharacterAction] = useState<CharacterAction>('steady');
  useOfflinePreparation(meeting, character ? characterAsset(character) : undefined);
  const [showCharacterChooser, setShowCharacterChooser] = useState(() => !localStorage.getItem('mj-character'));
  const [screen, setScreen] = useState<AppScreen>('home');
  const [pendingTool, setPendingTool] = useState<CompanionQuickAction | null>(null);
  useEffect(() => { const page = ({ home:'Home', overview:'Meeting map', outline:'Meeting outline', discoveries:'Discoveries', settings:'Settings', study:'Personal study', prep:'Meeting prep', review:'My meeting review' } as Record<string,string>)[screen]; document.title = (screen === 'journey' ? meeting.parts[partIndex]?.title : t(page)) + ' · Meeting Journey'; }, [screen, meeting, partIndex]);
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    const onlineNow = () => setOnline(true);
    const offlineNow = () => setOnline(false);
    window.addEventListener('online', onlineNow);
    window.addEventListener('offline', offlineNow);
    return () => {
      window.removeEventListener('online', onlineNow);
      window.removeEventListener('offline', offlineNow);
    };
  }, []);

  useEffect(() => { localStorage.setItem('mj-presentation', presentation); }, [presentation]);
  useEffect(() => { localStorage.setItem('mj-engagement', engagement); }, [engagement]);
  useEffect(() => { localStorage.setItem('mj-calm-view', String(calmView)); }, [calmView]);

  useEffect(() => { setPartIndex(index => Math.min(index, meeting.parts.length - 1)); }, [meeting.parts.length]);
  const part = meeting.parts[Math.min(partIndex, meeting.parts.length - 1)];
  const scenePack = sceneSetForWeek(meeting.weekOf);
  const appClass = `app presentation-${presentation} engagement-${engagement} ${calmView ? 'sensory-calm' : ''} ${sceneSeasonClass(meeting.weekOf)} scene-pack-${scenePack.id}`;
  const sceneStyle = {'--scene-home-image': `url("${sceneImage(scenePack.homeImage, 960)}")`, '--scene-home-wide': `url("${sceneImage(scenePack.homeImage, 1600)}")`} as CSSProperties;
  useEffect(() => {
    try { if (part) localStorage.setItem(`mj-place:${meeting.id}`, part.id); } catch { /* Local notes remain independent of journey preferences. */ }
  }, [meeting.id, part]);
  const progress = Math.round(((partIndex + 1) / meeting.parts.length) * 100);
  const sectionParts = useMemo(() => meeting.parts.reduce<Record<string, MeetingPart[]>>((groups, item) => { (groups[item.section] ??= []).push(item); return groups; }, {}), [meeting]);
  const move = (delta: number) => { if (delta > 0 && partIndex === meeting.parts.length - 1) setScreen('review'); else setPartIndex(current => Math.max(0, Math.min(meeting.parts.length - 1, current + delta))); };
  const chooseCharacter = (profile: CharacterProfile) => { if (localStorage.getItem('mj-calm-view') === null && profile.ageGroup === 'child') { setCalmView(true); localStorage.setItem('mj-calm-view', 'true'); } setCharacter(profile); localStorage.setItem('mj-character', JSON.stringify(profile)); setShowCharacterChooser(false); };
  const moveCharacter = (action: Exclude<CharacterAction, 'steady'>) => {
    setCharacterAction(action);
    const durations: Record<Exclude<CharacterAction, 'steady'>, number> = { fidget: 1200, bounce: 850, stretch: 1100, sway: 1200, shake: 900, dance: 1500 };
    window.setTimeout(() => setCharacterAction('steady'), durations[action]);
  };
  const openMaterial = () => {
    setScreen('outline');
  };
  const runQuickAction = (action: CompanionQuickAction) => {
    if (action === 'source') {
      const url = officialPartUrl(part, meeting.material);
      if (url) openOfficialMaterial(url);
      return;
    }
    setPendingTool(action);
    setScreen('journey');
  };

  if (!character || showCharacterChooser) return <CharacterChooserV2 current={character} onChoose={chooseCharacter} onCancel={character ? () => setShowCharacterChooser(false) : undefined} />;

  if (screen === 'home') return <div className={`${appClass} home-screen`} style={{ '--scene-home-image': `url("${sceneImage(scenePack.homeImage, 960)}")`, '--scene-home-wide': `url("${sceneImage(scenePack.homeImage, 1600)}")` } as CSSProperties}><AppHeader schedule={schedule} partId={part.id} online={online} onOpenJourney={() => setScreen('overview')} /><main id="main-content" tabIndex={-1} className="page-shell adventure-home-page"><AdventureHomeV2 meeting={meeting} profile={character} partIndex={partIndex} characterAction={characterAction} onMoveCharacter={moveCharacter} onQuickAction={runQuickAction} quiet={engagement==='quiet'} onStart={() => setScreen('journey')} onOverview={() => setScreen('overview')} onOpenMaterial={openMaterial} onSelectPart={setPartIndex} /></main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={openMaterial} onProfile={() => setShowCharacterChooser(true)} /><footer><p>{t("Your notes and drawings stay on this device. ")}<button type="button" className="text-button" onClick={() => setScreen('settings')}>{t("Privacy and data")}</button></p></footer></div>;

  if (screen === 'overview' || screen === 'outline') return <div className={appClass} style={sceneStyle}><AppHeader schedule={schedule} partId={part.id} online={online} onOpenJourney={() => setScreen('overview')} /><main id="main-content" tabIndex={-1} className="page-shell overview-page"><MeetingOverview key={`${meeting.id}:${screen}`} initialList={screen === 'outline'} meeting={meeting} partIndex={partIndex} onSelect={(index) => { setPartIndex(index); setScreen('journey'); }} onBack={() => setScreen('home')} /></main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={openMaterial} onProfile={() => setShowCharacterChooser(true)} /><footer><p>{t("Your notes and drawings stay on this device. ")}<button type="button" className="text-button" onClick={() => setScreen('settings')}>{t("Privacy and data")}</button></p></footer></div>;

  if (screen === 'discoveries' || screen === 'review') return <div className={appClass} style={sceneStyle}><AppHeader schedule={schedule} partId={part.id} online={online} onOpenJourney={() => setScreen('overview')} /><main id="main-content" tabIndex={-1} className="page-shell discovery-page">{screen === 'review' ? <MeetingReview meeting={meeting} onBack={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} /> : <DiscoveriesMap key={meeting.id} teen={detailedPrompts(character.ageGroup)} meeting={meeting} onReturn={index => { setPartIndex(index); setScreen('journey'); }} />}</main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={openMaterial} onProfile={() => setShowCharacterChooser(true)} /><footer><p>{t("Your notes and drawings stay on this device.")}</p></footer></div>;

  if (screen === 'study') return <div className={appClass} style={sceneStyle}><AppHeader schedule={schedule} partId={part.id} online={online} onOpenJourney={() => setScreen('overview')} /><main id="main-content" tabIndex={-1} className="page-shell tool-page"><PersonalStudyScreen meeting={meeting} onBack={() => setScreen('home')} /></main><footer><p>{t("Your notes stay on this device.")}</p></footer></div>;

  if (screen === 'prep') return <div className={appClass} style={sceneStyle}><AppHeader schedule={schedule} partId={part.id} online={online} onOpenJourney={() => setScreen('overview')} /><main id="main-content" tabIndex={-1} className="page-shell tool-page"><MeetingPrepScreen meeting={meeting} onBack={() => setScreen('home')} /></main><footer><p>{t("Your preparation stays on this device.")}</p></footer></div>;

  if (screen === 'settings') return <div className={appClass} style={sceneStyle}><AppHeader schedule={schedule} partId={part.id} online={online} onOpenJourney={() => setScreen('overview')} /><main id="main-content" tabIndex={-1} className="page-shell settings-page"><SettingsScreen scheduleSettings={<><LanguageSelector meeting={{id:schedule.meeting.id,kind:schedule.meeting.kind}} /><MeetingDaysSettings schedule={schedule} /><OfflineMeeting meeting={meeting} portrait={characterAsset(character)} /><DisplaySettings /><ListeningSettings /><LocalPartTitles meeting={schedule.meeting} /><DataControls /></>} presentation={presentation} engagement={engagement} calmView={calmView} onPresentation={setPresentation} onEngagement={setEngagement} onCalmView={setCalmView} onOpenProfile={() => setShowCharacterChooser(true)} onOpenStudy={() => setScreen('study')} onOpenPrep={() => setScreen('prep')} /></main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={openMaterial} onProfile={() => setShowCharacterChooser(true)} /><footer><p>{t("Your notes and drawings stay on this device.")}</p></footer></div>;

  return <div className={`${appClass} journey-screen`} style={{'--journey-background':`url("${sceneImage(scenePack.homeImage, 1600)}")`} as CSSProperties}>
    <AppHeader schedule={schedule} partId={part.id} online={online} onOpenJourney={() => setScreen('overview')} />
    <main id="main-content" tabIndex={-1} className="page-shell journey-stage-page">
      <section className="welcome-card">
        <div className="adventure-scene" aria-hidden="true"><span className="scene-sun" /><span className="scene-cloud cloud-one" /><span className="scene-cloud cloud-two" /><span className="scene-mountain mountain-one" /><span className="scene-mountain mountain-two" /><span className="scene-path" /><CharacterAvatar profile={character} size="hero" action={characterAction} /></div>
        <div className="adventure-intro">
          <div className="adventure-kicker"><CharacterAvatar profile={character} size="medium" action={characterAction} /><div><p className="eyebrow">{t("Your adventure · Week of ")}{new Date(`${meeting.weekOf}T12:00:00`).toLocaleDateString(getLanguage(), { day: 'numeric', month: 'long', year: 'numeric' })}</p><strong>{profileName(character)}{t("'s journey")}</strong></div></div>
          <div className="character-movement" aria-label={t("Optional movement for your companion")}><span>{t("Need to move?")}</span><button type="button" onClick={() => moveCharacter('fidget')} aria-label={t("Let your companion fidget")}>{t("Fidget")}</button><button type="button" onClick={() => moveCharacter('bounce')} aria-label={t("Let your companion bounce")}>{t("Bounce")}</button><small aria-live="polite">{characterAction === 'steady' ? t("Your companion is ready.") : t("Movement is okay. Take your time.")}</small></div>
          <p className="companion-message" aria-live="polite">{t(companionMessage(characterAction, partIndex))}</p>
          <h2>{meeting.theme}</h2>
          <p className="lead">{meeting.bibleReading}{t(" · Follow the programme at your own pace.")}</p>
          <button className="source-link source-button" type="button" onClick={openMaterial}>{t("Meeting outline")}</button>
          <small className="source-note">{t("Stays in this app, so your place, notes and drawing are not interrupted.")}</small>
        </div>
        <div className="preference-controls">
          <label>{t("View")}<select value={presentation} onChange={event => setPresentation(event.target.value as Presentation)}><option value="simple">{t("Simple")}</option><option value="standard">{t("Standard")}</option><option value="reflective">{t("Reflective Explorer")}</option></select></label>
          <label>{t("Activities")}<select value={engagement} onChange={event => setEngagement(event.target.value as Engagement)}><option value="quiet">{t("Quiet")}</option><option value="guided">{t("Guided")}</option><option value="active">{t("Active")}</option></select></label>
          <button className={`calm-toggle ${calmView ? 'active' : ''}`} type="button" onClick={() => setCalmView(value => !value)} aria-pressed={calmView}>{calmView ? t("Calm view on") : t("Calm view")}</button>
        </div>
      </section>
      <section className="progress-card" aria-label={t("Your place in the meeting")}><div><span className="progress-label">{t("Your place")}</span><strong>{t("Part ")}{partIndex + 1}{t(" of ")}{meeting.parts.length}</strong><small>{t("No rush. You can move, pause or return whenever you need.")}</small></div><div className="progress-meter" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div><span className="progress-percent">{progress}%</span></section>
      {meeting.contentNotice && <small className="meeting-content-notice">{meeting.contentNotice}</small>}
      <WhereAmIControl meeting={meeting} partIndex={partIndex} onSelect={setPartIndex} />
      <JourneyTrail meeting={meeting} partIndex={partIndex} onSelect={setPartIndex} />
      <section className={`journey-layout ${showMap ? 'with-map' : 'focus-layout'}`}>
        {showMap && <aside className="journey-map" aria-label={t("Meeting journey")}><div className="map-header"><div><p className="eyebrow">{t("Your journey")}</p><h2>{t("Meeting map")}</h2></div><button className="icon-button" type="button" aria-label={t("Hide journey map")} onClick={() => setShowMap(false)}>×</button></div><p className="map-help">{t("Choose any part, or use Next when you are ready.")}</p><div className="map-list">{Object.entries(sectionParts).map(([section, items]) => <div className="map-section" key={section}><h3>{sectionLabel(section as MeetingPart['section'])}</h3>{items.map(item => { const index = meeting.parts.indexOf(item); return <button key={item.id} type="button" className={`map-stop ${index === partIndex ? 'selected' : ''} ${index < partIndex ? t("visited") : ''}`} onClick={() => setPartIndex(index)}><span className="stop-number">{item.number ?? '•'}</span><span><strong>{item.title}</strong><small>{partTiming(item)}</small></span>{index < partIndex && <span aria-label={t("visited")}>✓</span>}</button>; })}</div>)}</div></aside>}
        <section className="part-column">
          <PartScreen key={part.id} part={part} weekOf={meeting.weekOf} quiet={engagement === 'quiet'} profile={character} characterAction={characterAction} partIndex={partIndex} totalParts={meeting.parts.length} onMoveCharacter={moveCharacter} onQuickAction={runQuickAction} onSwipe={move}><MeetingPartView key={part.id} requestedTool={pendingTool} onToolOpened={() => setPendingTool(null)} songPart={meeting.kind === 'weekend' && part.type === 'Song' ? schedule.meeting.parts.find(item => item.id === part.id) : undefined} meetingId={meeting.id} part={part} partIndex={partIndex} material={meeting.material} profile={character} characterAction={characterAction} totalParts={meeting.parts.length} engagement={engagement} presentation={presentation} onOpenMaterial={openMaterial} /></PartScreen>
        </section>
      </section>
    </main>
    <MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={openMaterial} onProfile={() => setShowCharacterChooser(true)} />
    <footer><p>{t("Your notes and drawings stay on this device. ")}<button type="button" className="text-button" onClick={() => setScreen('settings')}>{t("Privacy and data")}</button></p></footer>
  </div>;
}

function AppHeader({ schedule, partId, online, onOpenJourney }: { schedule: MeetingSchedule; partId: string; online: boolean; onOpenJourney: () => void }) {
  const assembly = schedule.selection.type === 'assembly' || schedule.selection.type === 'convention';
  return <><OfficialReturn meetingId={schedule.meeting.id} partId={partId} /><a className="skip-link" href="#main-content">{t("Skip to meeting content")}</a><header className="app-header"><button className="brand-mark" type="button" onClick={onOpenJourney} aria-label={t("Open today's journey")}>✦</button><div><p className="eyebrow">{t("Meeting Journey")}</p><h1 className="visually-hidden">{schedule.meeting.theme}</h1><button className="header-meeting-choice" type="button" onClick={() => schedule.setPickerOpen(true)} aria-label={t("Change meeting type or date")} aria-haspopup="dialog" aria-expanded={schedule.pickerOpen}><span className="header-meeting-label">{t(({midweek:'Midweek', weekend:'Weekend', assembly:'Assembly', convention:'Convention'})[schedule.selection.type])}{assembly ? ' · ' : t(" · Week of ")}{meetingDateLabel(assembly ? schedule.selection.date : schedule.meeting.weekOf)}</span><NotebookIcon name="chevron-down" /></button></div><div className="meeting-header-language"><LanguageSelector compact shortLabels meeting={{id:schedule.meeting.id,kind:schedule.meeting.kind}} /><span className="visually-hidden" role="status">{online ? t("Online") : t("Offline")}</span></div></header></>;
}

function MobileNav({ screen, onHome, onJourney, onDiscoveries, onSettings }: { profile: CharacterProfile; screen: AppScreen; onHome: () => void; onJourney: () => void; onDiscoveries?: () => void; onSettings?: () => void; onProfile: () => void; onMaterial?: () => void }) {
  return <nav className="mobile-nav" aria-label={t("Meeting Journey navigation")}>
    <IconAction showLabel icon="home" label={t("Home")} className={screen === 'home' ? 'active' : ''} onClick={onHome} aria-current={screen === 'home' ? 'page' : undefined} />
    <IconAction showLabel icon="route" label={t("Journey")} className={screen === 'overview' || screen === 'outline' || screen === 'journey' ? 'active' : ''} onClick={onJourney} aria-current={screen === 'overview' || screen === 'outline' || screen === 'journey' ? 'page' : undefined} />
    <IconAction showLabel icon="treasure" label={t("Discoveries")} className={screen === 'discoveries' ? 'active' : ''} onClick={() => onDiscoveries?.()} aria-current={screen === 'discoveries' ? 'page' : undefined} />
    <IconAction showLabel icon="settings" label={t("Settings")} className={screen === 'settings' ? 'active' : ''} onClick={() => onSettings?.()} aria-current={screen === 'settings' ? 'page' : undefined} />
  </nav>;
}

function AdventureHome({ meeting, profile, partIndex, characterAction, onMoveCharacter, onStart, onOverview }: { meeting: Meeting; profile: CharacterProfile; partIndex: number; characterAction: CharacterAction; onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void; onStart: () => void; onOverview: () => void }) {
  return <section className="adventure-home"><div className="home-scene"><span className="scene-sun" /><span className="scene-cloud cloud-one" /><span className="scene-cloud cloud-two" /><CharacterAvatar profile={profile} size="hero" action={characterAction} /><div className="scene-message" aria-live="polite">{t(companionMessage(characterAction))}</div></div><div className="home-copy"><p className="eyebrow">{t("Welcome back, ")}{profileName(profile)}</p><h2>{t("Ready to explore")}<br />{t("today's journey?")}</h2><p className="home-details">{meeting.weekOf}{t(" · Life and Ministry Meeting")}<br />{t("Bible reading: ")}{meeting.bibleReading}</p><div className="home-actions"><button className="primary-adventure-button" type="button" onClick={onStart}>{t("Start journey ")}<span aria-hidden="true">→</span></button><button className="secondary-adventure-button" type="button" onClick={onOverview}>{t("Preview the meeting ")}<span aria-hidden="true">▤</span></button></div><div className="movement-dock"><span>{t("Need a movement break?")}</span><button type="button" onClick={() => onMoveCharacter('fidget')}>{t("Fidget")}</button><button type="button" onClick={() => onMoveCharacter('bounce')}>{t("Bounce")}</button></div></div></section>;
}

function AdventureHomeV2({ meeting, profile, partIndex, characterAction, onMoveCharacter, onQuickAction, quiet, onStart, onOverview, onOpenMaterial, onSelectPart }: { meeting: Meeting; profile: CharacterProfile; partIndex: number; characterAction: CharacterAction; onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void; onQuickAction: (action: CompanionQuickAction) => void; quiet: boolean; onStart: () => void; onOverview: () => void; onOpenMaterial: () => void; onSelectPart: (index: number) => void }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideUsed, setGuideUsed] = useState(false);
  const guideAction = (action: HomeGuideAction) => {
    if (action==='continue'||action==='place') onStart();
    else if (action==='outline') onOpenMaterial();
    else onQuickAction(action);
  };
  const resumeLabel = partIndex > 0 ? 'Continue journey' : 'Start journey';
  return <section className={`adventure-home storybook-home artwork-painted home-redesign${guideOpen ? ' guide-is-open' : ''}`}>
    <div className="home-scene storybook-scene">
      <div className="painted-welcome-copy">
        <p>{t('Welcome to')}</p><h2>Meeting Journey</h2>
        <strong>{new Date(`${meeting.eventDate ?? meeting.weekOf}T12:00:00`).toLocaleDateString(getLanguage(),{day:'numeric',month:'long',year:'numeric'})}</strong>
        <span>{t(({midweek:'Midweek', weekend:'Weekend', assembly:'Assembly', convention:'Convention'})[meeting.kind ?? 'midweek'])}</span>
        <span>{meeting.bibleReading}</span>
      </div>
      <div className="scene-message" aria-live="polite">{t(companionMessage(characterAction))}</div>
      <div className="home-guide-stage" aria-hidden="true" />
    </div>
    <div className="home-avatar-layer"><CompanionActionHub profile={profile} characterAction={characterAction} onMoveCharacter={onMoveCharacter} onQuickAction={onQuickAction} placement="scene" homeGuide={{open:guideOpen, hint:!guideUsed, onOpen:()=>{setGuideUsed(true);setGuideOpen(true);}}} /></div>
    <div className="home-copy">
      <p className="eyebrow">{profile.name.trim() ? tt`Welcome back, ${profile.name.trim()}` : t("Welcome to your adventure")}</p>
      <h2>{profile.ageGroup === "teen" ? t("Your meeting, your pace") : t("Let us take the next step")}</h2>
      <p className="home-details">{t(({midweek:'Midweek', weekend:'Weekend', assembly:'Assembly', convention:'Convention'})[meeting.kind ?? 'midweek'])} · {meeting.bibleReading} · {new Date(`${meeting.eventDate ?? meeting.weekOf}T12:00:00`).toLocaleDateString(getLanguage(), { day: 'numeric', month: 'short' })}</p>
      {meeting.contentNotice&&<small className="meeting-content-notice">{meeting.contentNotice}</small>}
      <WhereAmIControl meeting={meeting} partIndex={partIndex} onSelect={onSelectPart} compact />
      <div className="home-actions"><button className="primary-adventure-button" type="button" onClick={onStart}><NotebookIcon name="route" /><span>{t(resumeLabel)}</span><NotebookIcon name="next" /></button></div>
      <div className="storybook-links">
        <button type="button" onClick={onOverview}><NotebookIcon name="route" /><span>{t('Preview the journey')}</span></button>
        <button type="button" onClick={onOpenMaterial}><NotebookIcon name="list" /><span>{t('Meeting outline')}</span></button>
      </div>
      <details className="home-source-details"><summary><NotebookIcon name="book" />{t('Meeting sources')}</summary>
        {bibleReferenceLinks(meeting.bibleReading).length>0&&<BibleReferenceLinks reference={meeting.bibleReading} />}
        <OfficialLinks url={meeting.material.appUrl} webUrl={meeting.material.sourceUrl} />
      </details>
    </div>
    <HomeGuidePanel open={guideOpen} onClose={()=>setGuideOpen(false)} onAction={guideAction} onMove={onMoveCharacter} quiet={quiet} hasSource={Boolean(officialPartUrl(meeting.parts[partIndex],meeting.material))} />
  </section>;
}

function WhereAmIControl({ meeting, partIndex, onSelect, compact = false }: { meeting: Meeting; partIndex: number; onSelect: (index: number) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = meeting.parts[partIndex];
  return <section className={`where-am-i ${compact ? 'where-am-i-compact' : ''}`} aria-label={t("Update your place in the meeting")}><button type="button" className="where-am-i-toggle" onClick={() => setOpen(value => !value)} aria-expanded={open}>{compact && <NotebookIcon name="pin" />}<span><small>{t("I'm here")}</small><strong>{t("Part ")}{partIndex + 1}: {current.title}</strong></span><span>{open ? t("Close") : t("Change")}</span></button>{open && <div className="where-am-i-list">{meeting.parts.map((item, index) => <button type="button" key={item.id} className={index === partIndex ? 'selected' : ''} onClick={() => { onSelect(index); setOpen(false); }}><span>{item.number ?? index + 1}</span><strong>{item.title}</strong><small>{partTiming(item)}</small></button>)}</div>}</section>;
}

function MovementMenu({ onMoveCharacter }: { onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void }) {
  return <details className="movement-menu"><summary>{t("Need to move?")}</summary><p>{t("Choose whatever your body feels like. Nothing is scored, and you can stop whenever you want.")}</p><div className="movement-options"><button type="button" onClick={() => onMoveCharacter('fidget')}>{t("Fidget")}</button><button type="button" onClick={() => onMoveCharacter('bounce')}>{t("Bounce / jump")}</button><button type="button" onClick={() => onMoveCharacter('stretch')}>{t("Stretch")}</button><button type="button" onClick={() => onMoveCharacter('sway')}>{t("Sway / rock")}</button><button type="button" onClick={() => onMoveCharacter('shake')}>{t("Shake it out")}</button><button type="button" onClick={() => onMoveCharacter('dance')}>{t("Dance")}</button></div></details>;
}

function CompanionActionHub({ profile, characterAction, onMoveCharacter, onQuickAction, placement, homeGuide }: { profile: CharacterProfile; characterAction: CharacterAction; onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void; onQuickAction: (action: CompanionQuickAction) => void; placement: 'scene' | 'dock'; homeGuide?: {open:boolean; hint:boolean; onOpen:()=>void} }) {
  const verticalStorageKey = homeGuide ? 'mj-home-companion-y' : 'mj-companion-y';
  const hubRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: number; originY: number; width: number; height: number; half: number; portraitHeight: number; moved: boolean } | null>(null);
  const suppressTap = useRef(false);
  const [position, setPosition] = useState<number | null>(() => {
    try { const saved = localStorage.getItem('mj-companion-x'); return saved !== null && Number.isFinite(Number(saved)) ? Math.max(0, Math.min(100, Number(saved))) : null; } catch { return null; }
  });
  const [verticalPosition, setVerticalPosition] = useState(() => {
    try { const saved = localStorage.getItem(verticalStorageKey); const value = Number(saved); return saved !== null && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : homeGuide ? .5 : 0; } catch { return homeGuide ? .5 : 0; }
  });
  const verticalRef = useRef(verticalPosition);
  const positionRef = useRef(position);
  const placeCompanion = (value: number, half: number, width: number) => {
    const margin = Math.min(49, (half + 8) / width * 100);
    const next = Math.max(margin, Math.min(100 - margin, value));
    positionRef.current = next; setPosition(next);
  };
  const savePosition = () => { try { if (positionRef.current !== null) localStorage.setItem('mj-companion-x', String(positionRef.current)); localStorage.setItem(verticalStorageKey, String(verticalRef.current)); } catch { /* Optional device preference. */ } };
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (placement !== 'scene' || !event.isPrimary) return;
    event.stopPropagation(); suppressTap.current = false;
    const bounds = hubRef.current!.getBoundingClientRect();
    const portrait = event.currentTarget.getBoundingClientRect();
    const travel = companionVerticalTravel(bounds.height, portrait.height);
    dragRef.current = { startX: event.clientX, startY: event.clientY,
      origin: (portrait.left + portrait.width / 2 - bounds.left) / bounds.width * 100,
      originY: travel ? Math.max(0, Math.min(1, (bounds.bottom - portrait.bottom - 8) / travel)) : 0,
      width: bounds.width, height: bounds.height, half: portrait.width / 2, portraitHeight: portrait.height, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const dragCompanion = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.stopPropagation();
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 9) drag.moved = true;
    if (drag.moved) {
      setOpen(false); setMovementOpen(false);
      const next = moveCompanionPosition({x:drag.origin,y:drag.originY}, event.clientX - drag.startX, event.clientY - drag.startY,
        {width:drag.width,height:drag.height}, {width:drag.half * 2,height:drag.portraitHeight});
      placeCompanion(next.x, drag.half, drag.width);
      verticalRef.current = next.y; setVerticalPosition(next.y);
    }
  };
  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    event.stopPropagation(); suppressTap.current = dragRef.current.moved;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    savePosition();
  };
  const [open, setOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!hubRef.current?.contains(event.target as Node)) { setOpen(false); setMovementOpen(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); setMovementOpen(false); hubRef.current?.querySelector<HTMLButtonElement>('.companion-trigger')?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  const choose = (action: CompanionQuickAction) => { setOpen(false); setMovementOpen(false); onQuickAction(action); };
  return <div ref={hubRef} className={`companion-action-hub companion-${placement} ${open ? 'is-open' : ''} ${movementOpen ? 'choosing-movement' : ''}`} style={{ ...(position !== null ? {'--companion-x': `${position}%`} : {}), '--companion-y': verticalPosition } as CSSProperties}>
    <button className="companion-trigger" type="button" onPointerDown={startDrag} onPointerMove={dragCompanion} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={event => {
      if (placement !== 'scene' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const bounds = hubRef.current!.getBoundingClientRect(), portrait = event.currentTarget.getBoundingClientRect();
      const next = moveCompanionPosition({x:(portrait.left + portrait.width / 2 - bounds.left) / Math.max(1, bounds.width) * 100,y:verticalPosition},
        event.key === 'ArrowLeft' ? -bounds.width * .08 : event.key === 'ArrowRight' ? bounds.width * .08 : 0,
        event.key === 'ArrowUp' ? -companionVerticalTravel(bounds.height,portrait.height) * .12 : event.key === 'ArrowDown' ? companionVerticalTravel(bounds.height,portrait.height) * .12 : 0,
        bounds, portrait);
      placeCompanion(next.x, portrait.width / 2, bounds.width); verticalRef.current = next.y; setVerticalPosition(next.y); savePosition();
    }} onClick={() => { if (suppressTap.current) { suppressTap.current = false; return; } if(homeGuide){homeGuide.onOpen();return;} setOpen(value => !value); setMovementOpen(false); }} aria-label={homeGuide?t('Ask your guide'):open ? t("Close companion thoughts") : t("Tap for thoughts; drag in any direction or use the arrow keys to move your companion")} aria-expanded={homeGuide?.open??open} aria-haspopup={homeGuide?'dialog':undefined} aria-controls={homeGuide?'home-guide-dialog':undefined}>{placement === 'scene' && <span className="companion-nameplate">{profileName(profile)}</span>}{homeGuide&&<span className={`home-guide-hint${homeGuide.hint?' first-visit':''}`}>{t('Ask your guide')}</span>}<CharacterAvatar profile={profile} size={placement === 'scene' ? 'hero' : 'small'} action={characterAction} /></button>
    {open && <div className="companion-action-card" role="group" aria-label={movementOpen ? t("Choose a movement") : t("Your companion thoughts")}>
      {!movementOpen && <button className="close-companion-menu" type="button" aria-label={t("Close companion actions")} onClick={() => { setOpen(false); setMovementOpen(false); }}>×</button>}{movementOpen ? <div className="movement-thoughts">{(['fidget', 'bounce', 'stretch', 'sway', 'shake', 'dance'] as const).map((action, index) => <button type="button" className={`movement-thought movement-thought-${index}`} key={action} onClick={() => onMoveCharacter(action)} aria-label={t(action[0].toUpperCase() + action.slice(1))} title={t(action[0].toUpperCase() + action.slice(1))}><MovementIcon action={action} /></button>)}</div> : <div className="companion-action-grid">
        <button className="action-bubble action-move" type="button" onClick={() => setMovementOpen(true)} aria-label={t("Choose a movement")}><span aria-hidden="true">✦</span>{t("Move")}</button>
        <button className="action-bubble action-feelings" type="button" onClick={() => choose('feelings')} aria-label={t("Record a feeling")} title={t("Feelings")}><NotebookIcon name="heart" /></button>
        <button className="action-bubble action-doodle" type="button" onClick={() => choose('doodle')}><span aria-hidden="true">✎</span>{t("Draw")}</button>
        <button className="action-bubble action-note" type="button" onClick={() => choose('note')}><span aria-hidden="true">☁</span>{t("My thought")}</button>
      </div>}
    </div>}
  </div>;
}

function MeetingOverview(props: { meeting: Meeting; partIndex: number; onSelect: (index: number) => void; onBack: () => void; initialList?: boolean }) {
  return <StoryJourneyMap key={props.meeting.id} initialList={props.initialList} meeting={props.meeting} current={props.partIndex} onSelect={props.onSelect} onBack={props.onBack} listView={indices => <MeetingOverviewList {...props} indices={indices} />} />;
}

function MeetingOverviewList({ meeting, partIndex, onSelect, onBack, indices }: { meeting: Meeting; partIndex: number; onSelect: (index: number) => void; onBack: () => void; indices: number[] }) {
  const visibleParts = indices.map(index => meeting.parts[index]);
  const sections = [...new Set(visibleParts.map(part => part.section))];
  const sectionIcon: Record<MeetingPart['section'], string> = { Opening: '♫', Treasures: '◇', FieldMinistry: '✦', Living: '♧', PublicTalk: '◇', Watchtower: '♡', Closing: '♡', Programme: '◇' };
  const next = indices.includes(partIndex) ? partIndex : indices[0];
  return <section className="meeting-overview">
    <button className="back-link" type="button" onClick={onBack}>{t("← Home")}</button>
    <div className="overview-heading"><div><p className="eyebrow">{t("Today's journey")}</p><h2>{new Date(`${meeting.eventDate ?? meeting.weekOf}T12:00:00`).toLocaleDateString(getLanguage(), { month: 'long', day: 'numeric', year: 'numeric' })}</h2><p>{meeting.theme}<br /><small>{meeting.bibleReading}</small></p></div><span className="overview-book" aria-hidden="true">▱</span></div>
    <div className="overview-sections">{sections.map(section => <section className={`overview-section overview-${section.toLowerCase()}`} key={section}>
      <div className="overview-section-icon" aria-hidden="true">{sectionIcon[section]}</div>
      <div className="overview-section-content"><h3>{sectionLabel(section)}</h3>{visibleParts.filter(part => part.section === section).map(item => {
        const index = meeting.parts.indexOf(item);
        return <div className="overview-item" key={item.id}><button type="button" aria-current={index===partIndex?'step':undefined} className={`overview-stop ${index === partIndex ? 'current' : ''}`} onClick={() => onSelect(index)}><span>{index+1}</span><strong>{item.title}</strong><small>{partTiming(item)}{item.speakerName && <><br />{t('Speaker: {name}', {name:item.speakerName})}</>}</small></button><PartReferenceLinks part={item} material={meeting.material} compact /></div>;
      })}</div>
    </section>)}</div>
    <div className="outline-official-links"><OfficialLinks url={meeting.material.appUrl} webUrl={meeting.material.sourceUrl ?? meeting.material.appUrl} /></div>
    <button className="overview-start" type="button" onClick={() => onSelect(next)}>{t("Continue at stop ")}{next + 1} <span aria-hidden="true">→</span></button>
  </section>;
}


function PersonalStudyScreen({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
  const [focus, setFocus] = useState(() => localStorage.getItem(`mj-study-focus-${meeting.id}`) ?? '');
  const [notes, setNotes] = useState(() => localStorage.getItem(`mj-study-notes-${meeting.id}`) ?? '');
  useEffect(() => { localStorage.setItem(`mj-study-focus-${meeting.id}`, focus); }, [meeting.id, focus]);
  useEffect(() => { localStorage.setItem(`mj-study-notes-${meeting.id}`, notes); }, [meeting.id, notes]);
  return <section className="tool-screen">
    <button className="back-link" type="button" onClick={onBack}>{t("← Back to journey")}</button>
    <div className="screen-heading"><div><p className="eyebrow">{t("A quiet space for you")}</p><h2>{t("Personal study")}</h2><p>{t("Explore one idea from the meeting at your own pace. Nothing is graded and you can leave whenever you want.")}</p></div><span className="screen-heading-icon" aria-hidden="true">{t("Book")}</span></div>
    <div className="tool-grid"><article className="tool-card tool-focus-card"><span className="tool-card-label">{t("Choose a focus")}</span><h3>{t("What would you like to understand?")}</h3><div className="tool-choice-row">{[t("A Bible thought"), t("A practical idea"), t("A question I have")].map(option => <button key={option} className={focus === option ? 'selected' : ''} type="button" onClick={() => setFocus(option)}>{option}</button>)}</div><label className="tool-field">{t("My own focus")}<input value={focus} onChange={event => setFocus(event.target.value)} placeholder={t("A word, question or theme...")} /></label></article><article className="tool-card"><span className="tool-card-label">{t("Keep a thought")}</span><h3>{t("Personal study notes")}</h3><p>{t("Write a few words to return to later. Your notes stay on this device.")}</p><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={t("What would you like to remember?")} rows={8} /><small className="tool-saved">{t("Saved automatically")}</small></article></div>
    <article className="tool-card source-tool-card"><div><span className="tool-card-label">{t("Official material")}</span><h3>{t("Read the source in JW Library")}</h3><p>{meeting.material.title}</p></div><OfficialLinks url={meeting.material.appUrl} webUrl={meeting.material.sourceUrl ?? meeting.material.appUrl} /></article>
  </section>;
}

function MeetingPrepScreen({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
  const prepItems = ['I have opened the meeting material', 'I know where I would like to begin', 'I have thought of one comment or question', 'I know what will help me feel comfortable'];
  const [checked, setChecked] = useState<boolean[]>(() => { try { return JSON.parse(localStorage.getItem(`mj-prep-checks-${meeting.id}`) ?? '[]') as boolean[]; } catch { return []; } });
  const [plan, setPlan] = useState(() => localStorage.getItem(`mj-prep-plan-${meeting.id}`) ?? '');
  useEffect(() => { localStorage.setItem(`mj-prep-checks-${meeting.id}`, JSON.stringify(checked)); }, [meeting.id, checked]);
  useEffect(() => { localStorage.setItem(`mj-prep-plan-${meeting.id}`, plan); }, [meeting.id, plan]);
  const completed = checked.filter(Boolean).length;
  return <section className="tool-screen">
    <button className="back-link" type="button" onClick={onBack}>{t("← Back to journey")}</button>
    <div className="screen-heading"><div><p className="eyebrow">{t("Get ready without rushing")}</p><h2>{t("Meeting prep")}</h2><p>{t("A short, flexible preparation space. Tick anything that helps; skip anything that does not.")}</p></div><span className="screen-heading-icon" aria-hidden="true">{t("Ready")}</span></div>
    <article className="tool-card prep-checklist"><div className="tool-card-heading"><div><span className="tool-card-label">{t("Your gentle checklist")}</span><h3>{completed}{t(" of ")}{prepItems.length}{t(" ready")}</h3></div><span className="prep-progress" aria-hidden="true"><span style={{ width: `${(completed / prepItems.length) * 100}%` }} /></span></div><div className="prep-items">{prepItems.map((item, index) => <label key={item} className={checked[index] ? 'checked' : ''}><input type="checkbox" checked={Boolean(checked[index])} onChange={() => setChecked(current => current.map((value, itemIndex) => itemIndex === index ? !value : value))} /><span>{item}</span></label>)}</div></article>
    <article className="tool-card"><span className="tool-card-label">{t("Make it yours")}</span><h3>{t("One thing I want to notice")}</h3><textarea value={plan} onChange={event => setPlan(event.target.value)} placeholder={t("A person, verse, idea or feeling I would like to look out for...")} rows={5} /><small className="tool-saved">{t("Saved automatically")}</small></article>
    <article className="tool-card source-tool-card"><div><span className="tool-card-label">{t("Start with the official programme")}</span><h3>{meeting.material.title}</h3><p>{t("Open the source material, then return here whenever you are ready.")}</p></div><OfficialLinks url={meeting.material.appUrl} webUrl={meeting.material.sourceUrl ?? meeting.material.appUrl} /></article>
  </section>;
}

function SettingsScreen({ scheduleSettings, presentation, engagement, calmView, onPresentation, onEngagement, onCalmView, onOpenProfile, onOpenStudy, onOpenPrep }: { scheduleSettings?: ReactNode; presentation: Presentation; engagement: Engagement; calmView: boolean; onPresentation: (value: Presentation) => void; onEngagement: (value: Engagement) => void; onCalmView: (value: boolean) => void; onOpenProfile: () => void; onOpenStudy: () => void; onOpenPrep: () => void }) {
  return <section className="settings-screen">
    <div className="screen-heading">
      <div><p className="eyebrow">{t("Make the journey yours")}</p><h2>{t("Settings")}</h2><p>{t("Choose how much guidance, movement and visual detail feels helpful today.")}</p></div>
      <a className="settings-update-button" href="/refresh" title={t('Updates app files while keeping your journal.')}>{t('Update app')}</a>
    </div>
    <div className="settings-grid">
      {scheduleSettings}
      <div className="settings-card">
        <h3>{t("Presentation style")}</h3><p>{t("Change the amount of text and reflection without changing your place.")}</p>
        <div className="settings-choice-row">{(['simple', 'standard', 'reflective'] as const).map(value =>
          <button className={presentation === value ? 'selected' : ''} type="button" onClick={() => onPresentation(value)} key={value}>
            <strong>{value === 'reflective' ? t("Reflective") : value[0].toUpperCase() + value.slice(1)}</strong>
            <small>{value === 'simple' ? t("Less on screen") : value === 'standard' ? t("Balanced view") : t("More thinking space")}</small>
          </button>)}</div>
      </div>
      <div className="settings-card">
        <h3>{t("Engagement level")}</h3><p>{t("Activities are always optional, and Quiet Mode keeps your notes.")}</p>
        <div className="settings-choice-row">{(['quiet', 'guided', 'active'] as const).map(value =>
          <button className={engagement === value ? 'selected' : ''} type="button" onClick={() => onEngagement(value)} key={value}>
            <strong>{value[0].toUpperCase() + value.slice(1)}</strong>
            <small>{value === 'quiet' ? t("No prompts") : value === 'guided' ? t("Clues when needed") : t("More activities")}</small>
          </button>)}</div>
      </div>
      <div className="settings-card settings-toggle-card">
        <div><h3>{t("Calm view")}</h3><p>{t("Reduce decorative contrast and visual motion.")}</p></div>
        <button type="button" className={calmView ? 'toggle-on' : ''} onClick={() => onCalmView(!calmView)} aria-pressed={calmView}>{calmView ? t("On") : t("Off")}</button>
      </div>
      <div className="settings-card">
        <h3>{t("Your companion")}</h3><p>{t("Change their name, age range or appearance whenever you want.")}</p>
        <button className="settings-action" type="button" onClick={onOpenProfile}>{t("Customise companion ->")}</button>
      </div>
      <div className="settings-card tool-links-card">
        <h3>{t("Prepare and study")}</h3><p>{t("Use the official material alongside a quiet preparation checklist or your own study notes.")}</p>
        <div className="tool-links"><button className="settings-action" type="button" onClick={onOpenPrep}>{t("Meeting prep →")}</button><button className="settings-action" type="button" onClick={onOpenStudy}>{t("Personal study →")}</button></div>
      </div>
    </div>
  </section>;
}

function CharacterChooserV2({current,onChoose,onCancel}:{current:CharacterProfile|null;onChoose:(profile:CharacterProfile)=>void;onCancel?:()=>void}) {
  const [draft,setDraft]=useState<CharacterProfile>(current??defaultProfile);
  const looks=looksForAge(draft.ageGroup);
  const index=Math.max(0,looks.findIndex(look=>look.id===draft.style&&look.portrait===(draft.portrait??'original')));
  const choose=(next:number)=>{const look=looks[(next+looks.length)%looks.length];setDraft(profile=>({...profile,style:look.id,gender:look.gender,portrait:look.portrait,portraitRevision:1}));};
  return <main className="character-screen"><section className="character-chooser age-only-chooser"><LanguageSelector compact />
    <h1>{t('Choose your companion')}</h1>
    <div className="companion-choice-fields"><label>{t('Age')}<select value={draft.ageGroup} onChange={event=>setDraft(profile=>withCompanionAge(profile,event.target.value as AgeGroup))}>{ageOptions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
    <label>{t('Name (optional)')}<input value={draft.name} maxLength={24} onChange={event=>setDraft(profile=>({...profile,name:event.target.value}))} placeholder={t('Add a name (optional)')} /></label></div>
    <div className="companion-look-preview"><button type="button" aria-label={t('Previous appearance')} onClick={()=>choose(index-1)}>‹</button><div><CharacterAvatar profile={draft} size="hero" /><p>{t('Option {number}',{number:index+1})}</p></div><button type="button" aria-label={t('Next appearance')} onClick={()=>choose(index+1)}>›</button></div>
    <div className="companion-look-strip" role="group" aria-label={t('Choose an appearance')}>{looks.map((look,lookIndex)=><button key={look.id+look.portrait} type="button" aria-pressed={lookIndex===index} aria-label={t('Option {number}',{number:lookIndex+1})} onClick={()=>choose(lookIndex)}><CharacterAvatar profile={{...draft,style:look.id,gender:look.gender,portrait:look.portrait}} size="medium" /><span>{lookIndex+1}</span></button>)}</div>
    <p className="complete-look-note">{t('Glasses and carried items are part of each complete illustration. Choose the picture you prefer.')}</p>
    <button className="start-journey-button" type="button" onClick={()=>onChoose(draft)}>{t('Use this companion')} →</button>
    {onCancel&&<button className="text-button chooser-back" type="button" onClick={onCancel}>{t('Back to my journey')}</button>}
  </section></main>;
}

function CharacterAvatar({ profile, size, action = 'steady' }: { profile: CharacterProfile; size: 'small' | 'medium' | 'large' | 'hero'; action?: CharacterAction }) {
  const colour = genderColour(profile.gender);
  const hair = hairColourOptions.find(option => option.id === profile.hairColour)?.value ?? hairColourOptions[0].value;
  const eyes = eyeColourOptions.find(option => option.id === profile.eyeColour)?.value ?? eyeColourOptions[0].value;
  return <span className={`character-avatar avatar-${size} character-${profile.gender} age-${profile.ageGroup} variant-${profile.variant} character-style-${profile.style} character-action-${action}`} style={{ '--character-colour': colour, '--hair-colour': hair, '--eye-colour': eyes } as CSSProperties} aria-hidden="true"><span className="character-body"><span className="character-layer-stage"><CompanionPortrait asset={characterAsset(profile)} resolution={size === 'small' ? 180 : size === 'medium' ? 360 : 720} /></span></span></span>;
}

function JourneyTrail({ meeting, partIndex, onSelect }: { meeting: Meeting; partIndex: number; onSelect: (index: number) => void }) {
  const sections = [...new Set(meeting.parts.map(part => part.section))];
  return <section className="trail-card" aria-label={t("Adventure trail")}><div className="trail-heading"><div><p className="eyebrow">{t("The trail ahead")}</p><h2>{t("Follow the meeting journey")}</h2></div><span>{Math.round(((partIndex + 1) / meeting.parts.length) * 100)}{t("% explored")}</span></div><div className="trail-track">{sections.map((section, index) => { const first = meeting.parts.findIndex(part => part.section === section); const last = meeting.parts.map(part => part.section).lastIndexOf(section); const selected = partIndex >= first && partIndex <= last; const visited = partIndex > last; return <div className={`trail-stop ${selected ? 'selected' : ''} ${visited ? 'visited' : ''}`} key={section}><button type="button" onClick={() => onSelect(first)} aria-current={selected ? 'step' : undefined}><span className="trail-node">{visited ? '✓' : index + 1}</span><strong>{sectionLabel(section)}</strong><small>{selected ? t("You are here") : visited ? t("Complete when ready") : `${meeting.parts.filter(part => part.section === section).length} stops`}</small></button>{index < sections.length - 1 && <i aria-hidden="true" />}</div>; })}</div></section>;
}

function PartScreen({ profile, part, weekOf, quiet, characterAction, partIndex, totalParts, onMoveCharacter, onQuickAction, onSwipe, children }: { profile: CharacterProfile; part: MeetingPart; weekOf: string; quiet: boolean; characterAction: CharacterAction; partIndex: number; totalParts: number; onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void; onQuickAction: (action: CompanionQuickAction) => void; onSwipe: (delta: number) => void; children: ReactNode }) {
  const moment = storyMoment(part, weekOf);
  const scenePack = sceneSetForWeek(weekOf);
  const routeProgress = totalParts <= 1 ? 0 : partIndex / (totalParts - 1);
  const gestureStart = useRef<{ x: number; y: number } | null>(null);
  const gestureTarget = useRef<HTMLElement | null>(null);
  const beginGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    const target = event.target as HTMLElement;
    gestureTarget.current = target.closest('button, a, input, textarea, select, summary, canvas, [role="dialog"]');
    gestureStart.current = gestureTarget.current ? null : { x: event.clientX, y: event.clientY };
    if (gestureStart.current) event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = gestureStart.current;
    gestureStart.current = null;
    gestureTarget.current = null;
    if (!start || !event.isPrimary) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    onSwipe(deltaX < 0 ? 1 : -1);
  };
  return <div className="part-screen-shell" onPointerDown={beginGesture} onPointerUp={finishGesture} onPointerCancel={() => { gestureStart.current = null; gestureTarget.current = null; }}>
    {children}
    <details className="part-scene-details">
      <summary><NotebookIcon name="route" /><span>{t('Scenery and companion')}</span><NotebookIcon name="chevron-down" /></summary>
      <div className={`part-story-scene chapter-${part.section.toLowerCase()}`} style={{ '--route-progress': routeProgress, '--scene-x': `${moment.x}%`, '--scene-position': scenePack.backgroundPosition, '--scene-image': `url("${sceneImage(moment.image, window.innerWidth < 600 ? 480 : 960)}")` } as CSSProperties} aria-label={tt`${moment.place}, stop ${partIndex + 1} of ${totalParts}`}>
        <div className="journey-chapter-pill"><span aria-hidden="true">{moment.symbol}</span><span>{t(moment.place)}</span></div>
        <CompanionActionHub profile={profile} characterAction={characterAction} onMoveCharacter={onMoveCharacter} onQuickAction={onQuickAction} placement="scene" />
      </div>
    </details>
  </div>;
}

export function MeetingPartView({ meetingId, part, partIndex, songPart, material, profile, characterAction = 'steady', totalParts, engagement, presentation, onOpenMaterial, requestedTool, onToolOpened }: { meetingId: string; part: MeetingPart; partIndex: number; songPart?: MeetingPart; material: Meeting['material']; profile: CharacterProfile; characterAction?: CharacterAction; totalParts: number; engagement: Engagement; presentation: Presentation; onOpenMaterial: () => void; requestedTool?: CompanionQuickAction | null; onToolOpened?: () => void }) {
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackChoices, setFeedbackChoices] = useState<string[]>([]);
  const [sourceConfirmations, setSourceConfirmations] = useState<string[]>([]);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState<CompanionQuickAction | 'listen' | 'bingo' | null>(null);
  useEffect(()=>{if(requestedTool){setToolOpen(requestedTool);onToolOpened?.();}},[requestedTool,onToolOpened]);
  const [returnToBingo, setReturnToBingo] = useState(false);
  const [returnToActivities, setReturnToActivities] = useState(false);
  const [discoveryPage, setDiscoveryPage] = useState('0');
  const [savedAt, setSavedAt] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);
  useEffect(()=>{if(!toolOpen||toolOpen==='bingo')setReturnToBingo(false);},[toolOpen]);
  const closeTool = () => {
    setToolOpen(returnToBingo ? 'bingo' : returnToActivities ? 'activities' : null);
    if (!returnToBingo) setReturnToActivities(false);
    setReturnToBingo(false);
  };
  useEffect(() => {
    if (!toolOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.journey-tool-close')?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closeTool(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [toolOpen,returnToBingo,returnToActivities]);
  useEffect(() => { let active = true; const refresh = () => { void readNote(meetingId, part.id).then(saved => { if (!active) return; setNote(saved?.text ?? ''); setFeedback(saved?.feedback ?? ''); setFeedbackChoices(saved?.feedbackChoices ?? []); setSourceConfirmations(saved?.sourceConfirmations ?? []); setNoteLoaded(true); }).catch(() => { if (active) setSavedAt('Could not open notes on this device. Reopen this part to try again.'); }); }; refresh(); window.addEventListener('mj-note-updated', refresh); return () => { active = false; window.removeEventListener('mj-note-updated', refresh); }; }, [meetingId, part.id]);
  useEffect(() => {
    const openTool = (event: Event) => {
      const detail = (event as CustomEvent<{ partId?: string; action?: CompanionQuickAction }>).detail;
      if (detail?.partId !== part.id || !detail.action || detail.action === 'source') return;
      setToolOpen(detail.action);
    };
    window.addEventListener('mj-open-tool', openTool);
    return () => window.removeEventListener('mj-open-tool', openTool);
  }, [part.id]);
  const savePartContent = (nextNote: string, nextFeedback: string, nextChoices: string[], nextSourceConfirmations = sourceConfirmations) => saveNote({ meetingId, partId: part.id, text: nextNote, feedback: nextFeedback, feedbackChoices: nextChoices, sourceConfirmations: nextSourceConfirmations, updatedAt: new Date().toISOString() }).then(() => setSavedAt('Saved locally')).catch(() => setSavedAt('Could not save'));
  const updateNote = (value: string) => { if (!noteLoaded) return; setNote(value); savePartContent(value, feedback, feedbackChoices); };
  const updateFeedback = (value: string) => { if (!noteLoaded) return; setFeedback(value); savePartContent(note, value, feedbackChoices); };
  const toggleFeedbackChoice = (choice: string) => { if (!noteLoaded) return; const nextChoices = feedbackChoices.includes(choice) ? feedbackChoices.filter(item => item !== choice) : [...feedbackChoices, choice]; setFeedbackChoices(nextChoices); savePartContent(note, feedback, nextChoices); };
  const toggleSourceConfirmation = (confirmation: string) => { const nextConfirmations = sourceConfirmations.includes(confirmation) ? sourceConfirmations.filter(item => item !== confirmation) : [...sourceConfirmations, confirmation]; setSourceConfirmations(nextConfirmations); savePartContent(note, feedback, feedbackChoices, nextConfirmations); };
  const visibleActivities = engagement === 'quiet' ? [] : part.activities;
  const jumpTo = (target: 'summary' | 'discover' | 'notes' | 'source') => { if (target === 'source') return onOpenMaterial(); if (target === 'discover') { setDrawingOpen(true); document.getElementById(`${part.id}-doodle`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } document.getElementById(`${part.id}-${target}`)?.focus(); };
  const programmePart = part.section === 'Programme' || part.programmeTime !== undefined;
  const isStudy = ['WatchtowerStudy','CongregationBibleStudy','PublicTalk'].includes(part.type) || programmePart && hasListeningTools(part.type);
  const followLabel = part.type === 'PublicTalk' ? t('Follow the talk') : programmePart ? t('Follow this part') : t('Follow the study');
  const reflection = part.id==='part-1' && meetingId==='meeting-2026-10-19'
    ? {title:'What helped Baruch regain his hope?',prompt:part.summary,choices:['Trust in Jehovah','Be content with what we have','Focus on spiritual goals','My own thought']}
    : feedbackForPart(part);
  const sharingActivity = hasConnectIdeas(meetingId, part);
  const activity = part.activities[Number(discoveryPage)] ?? part.activities[0];
  const chooseActivity = (choice: PartActivityChoice) => {
    setReturnToActivities(true);
    if (choice.kind === 'bingo' || choice.kind === 'doodle') setToolOpen(choice.kind);
    else {
      setDiscoveryPage(choice.kind === 'supplied' ? String(choice.index) : choice.kind);
      setToolOpen('story');
    }
  };
  const findPlace = () => {
    setToolOpen(null); setReturnToActivities(false); setReturnToBingo(false);
    requestAnimationFrame(() => {
      const heading = document.getElementById(`${part.id}-heading`);
      heading?.focus(); heading?.scrollIntoView({block:'nearest'});
    });
  };
  const focusQuestion = part.id==='part-1' && meetingId==='meeting-2026-10-19' ? t('What helped Baruch regain his hope?') : t(reflection.title);
  return <article className="part-card" data-section={part.section}><div className="part-kicker"><span>{programmePart ? t(programmePartLabel(part.type)) : sectionLabel(part.section)}</span><span>{tt`Part ${partIndex + 1} of ${totalParts}`}</span></div><h2 id={`${part.id}-heading`} tabIndex={-1} aria-live="polite">{part.number ? part.number + '. ' : ''}{part.title}</h2><div className="part-place-row"><p className="part-duration"><NotebookIcon name="clock" />{partTiming(part)}</p><button type="button" className="find-my-place" onClick={findPlace}><NotebookIcon name="pin" /><span>{t('Find my place')}</span></button></div>
    {part.speakerName && <p className="part-speaker">{t('Speaker: {name}', {name:part.speakerName})}</p>}
    <div className="part-inline-sources"><PartReferenceLinks part={part} material={material} /></div>
    <div className="part-guided-content">
    <nav className="part-workspace-tabs" aria-label={t('Tools for this part')}>
      <button type="button" aria-label={t('Listen')} title={t('Listen')} onClick={()=>setToolOpen('listen')}><IllustratedIcon name="listen" /><span>{t('Listen')}</span></button>
      {engagement!=='quiet'&&<button type="button" aria-label={t('Discover')} title={t('Discover')} onClick={()=>setToolOpen('story')}><IllustratedIcon name="discover" /><span>{t('Discover')}</span></button>}
      <button type="button" aria-label={t('Notes')} title={t('Notes')} onClick={()=>setToolOpen(profile.ageGroup==='child'?'doodle':'note')}><IllustratedIcon name="notes" /><span>{t('Notes')}</span></button>
      {engagement!=='quiet'&&<button type="button" aria-label={t('Activities')} title={t('Activities')} onClick={()=>{setReturnToActivities(false);setToolOpen('activities');}}><IllustratedIcon name="connect" /><span>{t('Activities')}</span></button>}
      <button type="button" aria-label={t('References')} title={t('References')} onClick={()=>setToolOpen('source')}><IllustratedIcon name="references" /><span>{t('References')}</span></button>
    </nav>
    <section className="part-focus-panel" style={{'--focus-landscape':`url("${sceneImage(storyMoment(part).image,480)}")`} as CSSProperties}><h3>{focusQuestion}</h3><p className="part-summary">{part.summary}</p></section>
    {part.section==='Treasures'&&(part.id==='part-2'||part.title===t('Spiritual gems')) && <SpiritualGemsCard part={part} material={material} />}
    {part.assemblyQuestion && <aside className="assembly-question">
      <strong>{t('Listening goal · question {number}', {number:part.assemblyQuestion})}</strong>
      <p>{part.question}</p><BibleReferenceLinks reference={part.textReference} />
      <OfficialLinks url={part.researchUrl} appLabel="Read the official review question" />
      <p>{t('Keep your own answer or a sketch. These are personal listening notes, not audience comments.')}</p>
      <button type="button" onClick={() => setToolOpen('note')}>{t('Keep my answer')}</button>{' '}
      <button type="button" onClick={() => setToolOpen('doodle')}>{t('Draw quietly')}</button>
    </aside>}
    {engagement!=='quiet'&&<fieldset className="part-reflection-choices"><legend>{t('What I noticed')}</legend>{reflection.choices.map(choice=>choice==='My own thought'
      ? <button className="reflection-write-action" type="button" key={choice} disabled={!noteLoaded} onClick={()=>setToolOpen('note')}><NotebookIcon name="pen" />{t(choice)}<NotebookIcon name="next" /></button>
      : <label key={choice}><input type="checkbox" disabled={!noteLoaded} checked={feedbackChoices.includes(choice)} onChange={()=>toggleFeedbackChoice(choice)} /><span>{t(choice)}</span></label>)}</fieldset>}
    <aside className="part-guide" aria-label={t('Your guide for this part')} style={{'--guide-landscape':`url("${sceneImage(storyMoment(part).image,480)}")`} as CSSProperties}>
      <div className="part-guide-portrait"><CharacterAvatar profile={profile} size="hero" action={characterAction} /></div>
      <div className="part-guide-help"><h3>{t('Need a little help?')}</h3><p>{t(engagement==='quiet'?'You can just listen, draw or keep a thought.':'You can just listen, or choose a clue to get started.')}</p>
        <div className="part-guide-actions">{engagement!=='quiet'&&<button type="button" onClick={()=>{setDiscoveryPage('0');setReturnToActivities(false);setToolOpen('story');}}><IllustratedIcon name="clue" /><span>{t('Show a clue')}</span></button>}
        <button type="button" onClick={findPlace}><NotebookIcon name="pin" /><span>{t('Find my place')}</span></button>
        {engagement!=='quiet'&&<button type="button" onClick={()=>{setReturnToActivities(false);setToolOpen('activities');}}><IllustratedIcon name="connect" /><span>{t('Open activities')}</span></button>}</div>
      </div>
    </aside>
    </div>
    {songPart && <SongDetailsButton meetingId={meetingId} part={songPart} />}
    {toolOpen && <div className="journey-tool-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) closeTool(); }}>
      <section className="journey-tool-modal" data-tool={toolOpen} role="dialog" aria-modal="false" aria-labelledby={`${part.id}-tool-title`}>
        <button className="journey-tool-close" type="button" onClick={closeTool} aria-label={returnToBingo?t('Back to word bingo'):returnToActivities?t('Back to activities'):t("Close tool")}><NotebookIcon name={returnToBingo||returnToActivities?'back':'close'} /></button>
        <header className="illustrated-tool-heading">
          <IllustratedIcon name={toolOpen==='activities'?'connect':toolOpen==='listen'?'listen':toolOpen==='source'?'references':toolOpen==='story'&&discoveryPage==='connections'?'connect':toolOpen==='story'||toolOpen==='bingo'?'discover':toolOpen==='feelings'?'heart':'notes'} />
          <div><h3 id={`${part.id}-tool-title`}>{toolOpen==='activities'?t('Activities for this part'):toolOpen === 'listen' ? isStudy ? followLabel : t('Listen') : toolOpen==='source' ? t('References') : toolOpen === 'bingo' ? t('Word bingo') : toolOpen === 'story' ? t(discoveryPage==='connections'&&sharingActivity?'Connect the ideas':discoveryPage==='spot'?'Spot the clue':'Discovery mission') : toolOpen === 'feelings' ? t("How did this part feel?") : toolOpen === 'note' ? t("Keep a thought") : t("Doodle notes")}</h3><p>{part.title}</p>{part.speakerName && <p>{t('Speaker: {name}', {name:part.speakerName})}</p>}</div>
        </header>
        {toolOpen === 'activities' && <PartActivities meetingId={meetingId} part={part} quiet={engagement==='quiet'} onChoose={chooseActivity} />}
        {toolOpen !== 'activities' && <button type="button" className="tool-find-place" onClick={findPlace}><NotebookIcon name="pin" />{t('Find my place')}</button>}
        {['doodle','note','feelings'].includes(toolOpen)&&<nav className="notebook-tabs" aria-label={t("Your notebook")}><button type="button" aria-label={t("Draw")} title={t("Draw")} aria-pressed={toolOpen === 'doodle'} onClick={() => setToolOpen('doodle')}><NotebookIcon name="pen" /><span className="notebook-tab-label">{t("Draw")}</span></button><button type="button" aria-label={t("Write a note")} title={t("Write a note")} aria-pressed={toolOpen === 'note'} onClick={() => setToolOpen('note')}><NotebookIcon name="note" /><span className="notebook-tab-label">{t("Write")}</span></button><button type="button" aria-label={t("Feelings")} title={t("Feelings")} aria-pressed={toolOpen === 'feelings'} onClick={() => setToolOpen('feelings')}><NotebookIcon name="heart" /><span className="notebook-tab-label">{t("Feelings")}</span></button></nav>}
        {toolOpen === 'bingo' && engagement !== 'quiet' && <WordBingo key={`${meetingId}:${part.id}:${getLanguage()}`} meetingId={meetingId} part={part} older={detailedPrompts(profile.ageGroup)} onClue={()=>{setDiscoveryPage('0');setToolOpen('story');setReturnToBingo(true);}} onWrite={()=>{setToolOpen('note');setReturnToBingo(true);}} onDraw={()=>{setToolOpen('doodle');setReturnToBingo(true);}} />}
        {toolOpen === 'listen' && (isStudy ? <StudyTools meetingId={meetingId} part={part} teen={detailedPrompts(profile.ageGroup)} quiet={engagement === 'quiet'} onDraw={() => setToolOpen('doodle')} onWrite={() => setToolOpen('note')} /> : <><p>{part.summary}</p><ListeningActivities key={`${meetingId}:${part.id}`} meetingId={meetingId} part={part} /></>)}
        {toolOpen === 'source' && <OfficialPartSourceCard part={part} material={material} confirmations={sourceConfirmations} onToggle={toggleSourceConfirmation} onOpenGuide={()=>setToolOpen('story')} />}
        {toolOpen === 'story' && (engagement === 'quiet' ? <p>{t("Quiet Mode is on. Your notes and drawings are always available.")}</p> : <div className="discovery-mission-pages">
          {discoveryPage!=='connections'&&discoveryPage!=='spot'&&activity?.type!=='ClueCards'&&<p className="mission-introduction">{t('Choose a clue when you need one. Nothing is timed or scored.')}</p>}
          {discoveryPage==='connections'&&sharingActivity ? <ConnectIdeas meetingId={meetingId} partId={part.id} /> : discoveryPage==='spot' ? null : activity ? <ActivityCard key={activity.id} activity={activity} note={note} onOpenDrawing={() => setToolOpen('doodle')} onSaveThought={updateNote} /> : <p>{t(reflection.prompt)}</p>}
          {part.type==='Demonstration'&&<section className="activity-card"><h4>{t('Spot the clue')}</h4><p>{t('Watch how the speaker listens, asks a question or shows kindness.')}</p><div className="part-thought-tiles">{['Listened carefully','Asked a question','Showed empathy','Found a natural topic'].map((choice,index)=><button type="button" key={choice} disabled={!noteLoaded} aria-pressed={feedbackChoices.includes(choice)} onClick={()=>toggleFeedbackChoice(choice)}><NotebookIcon name={(['music','clue','heart','note'] as const)[index]} /><span>{t(choice)}</span></button>)}</div></section>}
          <div className="activity-action-row"><button type="button" className="activity-secondary-action" onClick={()=>setToolOpen('bingo')}><NotebookIcon name="grid" />{t('Word bingo')}</button>
          {!returnToBingo&&<button type="button" className="activity-secondary-action" onClick={()=>{setReturnToActivities(false);setToolOpen('activities');}}><IllustratedIcon name="connect" />{t('Activities for this part')}</button>}
          <button type="button" className="skip-button" onClick={findPlace}>{t("Back to the journey")}</button></div>
        </div>)}
        {toolOpen === 'feelings' && <PartFeedbackCard part={part} value={feedback} choices={feedbackChoices} savedAt={savedAt} onChange={updateFeedback} onToggleChoice={toggleFeedbackChoice} />}
        {toolOpen === 'note' && <div className="modal-note-editor"><p>{t("A word, question or feeling is enough.")}</p><textarea autoFocus disabled={!noteLoaded} id={`${part.id}-modal-note`} value={note} onChange={event => updateNote(event.target.value)} placeholder={t("Write or dictate a thought...")} rows={5} /><small role="status">{t(savedAt) || (noteLoaded ? t("Saved on this device automatically") : t("Opening your notes…"))}</small></div>}
        {toolOpen === 'doodle' && <Suspense fallback={<p role="status">{t("Opening your drawing page…")}</p>}><DrawingPad meetingId={meetingId} partId={part.id} /></Suspense>}
      </section>
    </div>}
  </article>;
}

function feedbackForPart(part: MeetingPart): { title: string; prompt: string; choices: string[] } {
  if (part.type === 'PublicTalk') return { title: 'One idea from the talk', prompt: 'Did a scripture, example or helpful idea catch your attention?', choices: ['A scripture', 'An example', 'Something helpful', 'A question'] };
  if (part.type === 'WatchtowerStudy') return { title: 'Your study discovery', prompt: 'What thought from the discussion would you like to keep?', choices: ['An encouraging thought', 'A scripture', 'Something to try', 'A question'] };
  if (part.type === 'Song') return { title: 'Song reflection', prompt: 'What words or feeling from the song stood out? You can also notice whether it connects to the meeting or is one of your favourites.', choices: ['Words stood out', 'Connects to the meeting', 'One of my favourites'] };
  if (part.type === 'BibleReading') return { title: 'What stayed with you?', prompt: 'Was there a word, picture or verse from the reading you would like to keep?', choices: ['A word or verse', 'A picture or idea', 'A question'] };
  if (part.type === 'Demonstration') return { title: 'What did you notice?', prompt: 'What felt helpful, kind or realistic about this example?', choices: ['Something helpful', 'A kind approach', 'A question'] };
  if (part.type === 'Comments') return { title: 'Your reaction', prompt: 'What stood out in the welcome or closing thought?', choices: ['Something encouraging', 'A word or phrase', 'A question'] };
  return { title: 'Your reaction', prompt: 'What stood out to you? A word, idea, question or feeling is enough.', choices: ['A word or phrase', 'An idea', 'A question', 'Something to remember'] };
}

function sourceConfirmationsForPart(part: MeetingPart): string[] {
  if (part.type === 'Song') return ['I listened or sang along', 'A word or feeling stood out', 'I want to remember something'];
  if (part.type === 'BibleReading') return ['I read or listened to the reading', 'A word, verse or picture stood out', 'I made a note or drawing'];
  if (part.type === 'Demonstration') return ['I watched or listened to the example', 'I noticed an approach', 'I want to remember something'];
  return ['I opened the official material', 'I followed this part', 'I saved a thought to return to'];
}

function OfficialPartSourceCard({ part, material, confirmations, onToggle, onOpenGuide }: { part: MeetingPart; material: Meeting['material']; confirmations: string[]; onToggle: (confirmation: string) => void; onOpenGuide: () => void }) {
  const options = sourceConfirmationsForPart(part);
  return <section className="official-part-card" aria-labelledby={`${part.id}-official-title`}>
    <div className="official-part-heading"><div><span className="activity-label">{t("Official source")}</span><h3 id={`${part.id}-official-title`}>{t("Follow this stop in JW Library")}</h3></div><button type="button" className="official-guide-button" onClick={onOpenGuide}>{t("Companion guide")}</button></div>
    <p>{t("Open the official meeting material, follow this item, then return here. Nothing is checked automatically.")}</p>
    <div className="official-part-links"><PartReferenceLinks part={part} material={material} /></div>
    <p className="official-app-help">{t('JW Library must be installed. If it does not open, use JW.org instead.')}</p>
    <div className="source-confirmations" aria-label={t("Your source check-in")}>{options.map(option => <label key={option}><input type="checkbox" checked={confirmations.includes(option)} onChange={() => onToggle(option)} /><span>{option}</span></label>)}</div>
    {confirmations.length > 0 && <small className="confirmation-saved">{t("Saved on this device. You can change this later.")}</small>}
  </section>;
}

function PartFeedbackCard({ part, value, choices, savedAt, onChange, onToggleChoice }: { part: MeetingPart; value: string; choices: string[]; savedAt: string; onChange: (value: string) => void; onToggleChoice: (choice: string) => void }) {
  const prompt = feedbackForPart(part);
  return <section className="feedback-card" aria-labelledby={`${part.id}-feedback-title`}><div className="feedback-icon" aria-hidden="true">♥</div><div className="activity-label">{t("Optional reflection")}</div><h3 id={`${part.id}-feedback-title`}>{t(prompt.title)}</h3><p>{t(prompt.prompt)}</p><div className="feedback-choices">{prompt.choices.map(choice => <button className={choices.includes(choice) ? 'selected' : ''} type="button" aria-pressed={choices.includes(choice)} onClick={() => onToggleChoice(choice)} key={choice}>{t(choice)}</button>)}</div><label className="feedback-input-label" htmlFor={`${part.id}-feedback`}>{t("Add your own words ")}<textarea id={`${part.id}-feedback`} value={value} onChange={event => onChange(event.target.value)} placeholder={part.type === 'Song' ? t("Write a word or line that stood out...") : t("A few words is enough...")} rows={2} /></label><small className="feedback-save" aria-live="polite">{t(savedAt) || t("Optional — skip this or come back later. Saved on this device.")}</small></section>;
}

function ActivityCard({ activity, note, onOpenDrawing, onSaveThought }: { activity: EngagementActivity; note: string; onOpenDrawing: () => void; onSaveThought: (value: string) => void }) {
  const [revealed, setRevealed] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const mission = activity.mission;
  if (activity.type === 'ClueCards' && mission) return <section className="activity-card clue-card" aria-label={mission.title}>
    <p className="clue-listening-goal">{mission.listeningObjective}</p>
    <div className="clues">{mission.clues.map((clue, index) => <div className={`clue-row ${index < revealed ? 'revealed' : ''}`} key={clue}>
      <IllustratedIcon name={(['discover','references','clue'] as const)[index%3]} />
      <div><strong>{t('Clue {number}',{number:index+1})}</strong>{index < revealed ? <p>{clue}</p> : <button type="button" onClick={() => setRevealed(current => Math.max(current, index + 1))}>{t("Reveal clue ")}{index + 1}</button>}</div>
    </div>)}</div>
    <div className="clue-actions">
      <button type="button" className="skip-button" onClick={() => setRevealed(mission.clues.length)}>{t("Show all clues")}</button>
      {mission.scriptureReference && <BibleReferenceLinks reference={mission.scriptureReference} />}
    </div>
  </section>;
  if (activity.type === 'SpotTheClue') return <section className="activity-card visual-activity"><div className="activity-icon" aria-hidden="true">◉</div><div className="activity-label">{t("Spot the clue")}</div><h3>{activity.title}</h3><p>{t(activity.prompt)}</p><div className="choice-row"><button className={selected === 'word' ? 'selected' : ''} type="button" onClick={() => setSelected('word')}>{t("A word")}</button><button className={selected === 'idea' ? 'selected' : ''} type="button" onClick={() => setSelected('idea')}>{t("An idea")}</button><button className={selected === 'question' ? 'selected' : ''} type="button" onClick={() => setSelected('question')}>{t("A question")}</button></div>{selected && <p className="gentle-confirmation">{t("Good place to start. Add it to your notes if you want to keep it.")}</p>}</section>;
  if (activity.type === 'DrawYourDiscovery') return <section className="activity-card visual-activity"><div className="activity-icon" aria-hidden="true">✎</div><div className="activity-label">{t("Draw your discovery")}</div><h3>{activity.title}</h3><p>{t(activity.prompt)}</p><button className="activity-action" type="button" onClick={onOpenDrawing}>{t("Open the doodle pad")}</button><span className="activity-hint">{t("There is no right picture. A shape, symbol or colour is enough.")}</span></section>;
  if (activity.type === 'MyThoughtBubble') return <section className="activity-card visual-activity"><div className="activity-icon" aria-hidden="true"><NotebookIcon name="note" /></div><div className="activity-label">{t("My thought bubble")}</div><h3>{activity.title}</h3><p>{t(activity.prompt)}</p><textarea className="thought-input" value={note} onChange={event => onSaveThought(event.target.value)} placeholder={t("A few words is enough…")} rows={2} /><span className="activity-hint">{t("Saved with your notes. You can leave this blank or skip it.")}</span></section>;
  return <section className="activity-card visual-activity"><div className="activity-label">{t("Optional activity")}</div><h3>{activity.title}</h3><p>{t(activity.prompt)}</p><span className="activity-hint">{t("You can skip this at any time.")}</span></section>;
}
