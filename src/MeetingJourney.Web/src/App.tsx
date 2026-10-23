import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { loadMeeting } from './api';
import { DrawingPad } from './DrawingPad';
import { sampleMeeting } from './sampleMeeting';
import { readDrawing, readNote, saveNote } from './storage';
import type { EngagementActivity, Meeting, MeetingPart } from './types';

type Presentation = 'simple' | 'standard' | 'reflective';
type Engagement = 'quiet' | 'guided' | 'active';
type CharacterGender = 'boy' | 'girl';
type AgeGroup = 'child' | 'preteen' | 'teen';
type CharacterVariant = 'standard' | 'tall' | 'short' | 'slim' | 'robust' | 'chunky';
type CharacterStyle = 'classic-boy' | 'classic-girl' | 'asian-boy' | 'asian-girl' | 'african-boy' | 'african-girl' | 'auburn-girl' | 'sandy-boy';
type CharacterAction = 'steady' | 'fidget' | 'bounce' | 'stretch' | 'sway' | 'shake' | 'dance';
type AppScreen = 'home' | 'overview' | 'journey' | 'discoveries' | 'settings';

type CharacterProfile = {
  gender: CharacterGender;
  ageGroup: AgeGroup;
  style: CharacterStyle;
  name: string;
  variant: CharacterVariant;
  glasses: boolean;
  cap: boolean;
  backpack: boolean;
};

const defaultProfile: CharacterProfile = { gender: 'boy', ageGroup: 'preteen', style: 'classic-boy', name: '', variant: 'standard', glasses: false, cap: false, backpack: true };
const genderOptions: { id: CharacterGender; label: string; colour: string }[] = [
  { id: 'boy', label: 'Boy', colour: '#5b61d6' },
  { id: 'girl', label: 'Girl', colour: '#d86d8d' }
];
const ageOptions: { id: AgeGroup; label: string; subtitle: string }[] = [
  { id: 'child', label: 'Child', subtitle: 'Younger explorer' },
  { id: 'preteen', label: 'Preteen', subtitle: 'Growing explorer' },
  { id: 'teen', label: 'Teen', subtitle: 'Older explorer' }
];
const variantOptions: { id: CharacterVariant; label: string }[] = [
  { id: 'standard', label: 'Just right' },
  { id: 'tall', label: 'Taller' },
  { id: 'short', label: 'Shorter' },
  { id: 'slim', label: 'Slim' },
  { id: 'robust', label: 'Robust' },
  { id: 'chunky', label: 'Chunkier' }
];
const characterStyles: { id: CharacterStyle; label: string; subtitle: string; gender: CharacterGender; teenOnly?: boolean }[] = [
  { id: 'classic-boy', label: 'Wavy hair', subtitle: 'Classic boy', gender: 'boy' },
  { id: 'classic-girl', label: 'Curly hair', subtitle: 'Classic girl', gender: 'girl' },
  { id: 'asian-boy', label: 'Kai', subtitle: 'Straight hair · slim', gender: 'boy', teenOnly: true },
  { id: 'asian-girl', label: 'Aiko', subtitle: 'Straight bob · slim', gender: 'girl', teenOnly: true },
  { id: 'african-boy', label: 'Noah', subtitle: 'Coils · fuller build', gender: 'boy', teenOnly: true },
  { id: 'african-girl', label: 'Zuri', subtitle: 'Coils + twists · robust', gender: 'girl', teenOnly: true },
  { id: 'auburn-girl', label: 'Ruby', subtitle: 'Auburn waves · slim', gender: 'girl', teenOnly: true },
  { id: 'sandy-boy', label: 'Theo', subtitle: 'Sandy waves · sturdy', gender: 'boy', teenOnly: true }
];

function readCharacterProfile(): CharacterProfile | null {
  const saved = localStorage.getItem('mj-character');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as Partial<CharacterProfile>;
    if (parsed.gender && parsed.ageGroup) {
      const style = parsed.style && characterStyles.some(option => option.id === parsed.style) ? parsed.style : parsed.gender === 'girl' ? 'classic-girl' : 'classic-boy';
      const savedVariant = (parsed.variant as string | undefined) === 'stocky' ? 'robust' : parsed.variant;
      return { ...defaultProfile, ...parsed, style, variant: savedVariant ?? defaultProfile.variant, name: parsed.name ?? '' };
    }
  } catch {
    const legacy = saved as CharacterGender | AgeGroup;
    const gender = legacy === 'girl' ? 'girl' : 'boy';
    return { ...defaultProfile, gender, style: gender === 'girl' ? 'classic-girl' : 'classic-boy', ageGroup: legacy === 'teen' || legacy === 'preteen' ? legacy : 'child' };
  }
  return null;
}

function profileName(profile: CharacterProfile) {
  return profile.name.trim() || 'Your companion';
}

function companionMessage(action: CharacterAction, partIndex = 0) {
  if (action === 'fidget') return 'Moving helps. Keep going in the way that works for you.';
  if (action === 'bounce') return 'Nice energy. We are ready when you are.';
  if (action === 'stretch') return 'Take a stretch. Your body can help you reset.';
  if (action === 'sway') return 'Sway, rock or settle in the way that feels good.';
  if (action === 'shake') return 'Shake it out. Come back when you are ready.';
  if (action === 'dance') return 'A little dance is welcome. We can keep going together.';
  if (partIndex === 0) return "You've got this. We can take it one step at a time.";
  return 'Look how far you have come. Take your time with this stop.';
}

function genderColour(gender: CharacterGender) {
  return genderOptions.find(option => option.id === gender)?.colour ?? '#5b61d6';
}

function characterAsset(profile: CharacterProfile) {
  if (profile.ageGroup !== 'teen' || profile.style === 'classic-boy' || profile.style === 'classic-girl') return `/assets/characters/${profile.gender}-${profile.ageGroup}.png`;
  return `/assets/characters/teen-${profile.style}.png`;
}

function sectionLabel(section: MeetingPart['section']) {
  return ({
    Opening: 'Opening',
    Treasures: "Treasures from God's Word",
    FieldMinistry: 'Apply Yourself to the Ministry',
    Living: 'Living as Christians',
    Closing: 'Closing'
  } as const)[section];
}

function materialSectionFor(part: MeetingPart) {
  return ({ Opening: 'theme', Treasures: 'treasures', FieldMinistry: 'ministry', Living: 'living', Closing: 'living' } as const)[part.section];
}

export default function App() {
  const [meeting, setMeeting] = useState<Meeting>(sampleMeeting);
  const [online, setOnline] = useState(navigator.onLine);
  const [partIndex, setPartIndex] = useState(0);
  const [presentation, setPresentation] = useState<Presentation>(() => (localStorage.getItem('mj-presentation') as Presentation | null) ?? 'standard');
  const [engagement, setEngagement] = useState<Engagement>(() => (localStorage.getItem('mj-engagement') as Engagement | null) ?? 'guided');
  const [calmView, setCalmView] = useState(() => localStorage.getItem('mj-calm-view') === 'true');
  const [character, setCharacter] = useState<CharacterProfile | null>(() => readCharacterProfile());
  const [characterAction, setCharacterAction] = useState<CharacterAction>('steady');
  const [showCharacterChooser, setShowCharacterChooser] = useState(() => !localStorage.getItem('mj-character'));
  const [screen, setScreen] = useState<AppScreen>('home');
  const [showMap, setShowMap] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);

  useEffect(() => {
    const onlineNow = () => setOnline(true);
    const offlineNow = () => setOnline(false);
    window.addEventListener('online', onlineNow);
    window.addEventListener('offline', offlineNow);
    const controller = new AbortController();
    loadMeeting(controller.signal).then(setMeeting).catch(() => undefined);
    return () => {
      controller.abort();
      window.removeEventListener('online', onlineNow);
      window.removeEventListener('offline', offlineNow);
    };
  }, []);

  useEffect(() => { localStorage.setItem('mj-presentation', presentation); }, [presentation]);
  useEffect(() => { localStorage.setItem('mj-engagement', engagement); }, [engagement]);
  useEffect(() => { localStorage.setItem('mj-calm-view', String(calmView)); }, [calmView]);

  const part = meeting.parts[partIndex];
  const progress = Math.round(((partIndex + 1) / meeting.parts.length) * 100);
  const sectionParts = useMemo(() => meeting.parts.reduce<Record<string, MeetingPart[]>>((groups, item) => { (groups[item.section] ??= []).push(item); return groups; }, {}), [meeting]);
  const move = (delta: number) => setPartIndex(current => Math.max(0, Math.min(meeting.parts.length - 1, current + delta)));
  const chooseCharacter = (profile: CharacterProfile) => { setCharacter(profile); localStorage.setItem('mj-character', JSON.stringify(profile)); setShowCharacterChooser(false); };
  const moveCharacter = (action: Exclude<CharacterAction, 'steady'>) => {
    setCharacterAction(action);
    const durations: Record<Exclude<CharacterAction, 'steady'>, number> = { fidget: 1200, bounce: 850, stretch: 1100, sway: 1200, shake: 900, dance: 1500 };
    window.setTimeout(() => setCharacterAction('steady'), durations[action]);
  };
  const openMaterial = () => {
    setShowMaterial(true);
    window.setTimeout(() => document.getElementById('meeting-material-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  if (!character || showCharacterChooser) return <CharacterChooserV2 current={character} onChoose={chooseCharacter} onCancel={character ? () => setShowCharacterChooser(false) : undefined} />;

  if (screen === 'home') return <div className={`app presentation-${presentation} ${calmView ? 'sensory-calm' : ''}`}><AppHeader profile={character} online={online} onOpenProfile={() => setShowCharacterChooser(true)} onOpenJourney={() => setScreen('overview')} /><main className="page-shell adventure-home-page"><AdventureHomeV2 meeting={meeting} profile={character} partIndex={partIndex} characterAction={characterAction} onMoveCharacter={moveCharacter} onStart={() => setScreen('journey')} onOverview={() => setScreen('overview')} onOpenMaterial={openMaterial} />{showMaterial && <MeetingMaterialPanelV2 material={meeting.material} activeSectionId={materialSectionFor(part)} onClose={() => setShowMaterial(false)} />}</main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={() => { setScreen('journey'); openMaterial(); }} onProfile={() => setShowCharacterChooser(true)} /><footer><p>Your notes and drawings stay on this device. <button type="button" className="text-button" onClick={() => alert('Local data controls will be expanded in the next phase. Your current notes and drawings are stored in this browser.')}>Privacy and data</button></p></footer></div>;

  if (screen === 'overview') return <div className={`app presentation-${presentation} ${calmView ? 'sensory-calm' : ''}`}><AppHeader profile={character} online={online} onOpenProfile={() => setShowCharacterChooser(true)} onOpenJourney={() => setScreen('overview')} /><main className="page-shell overview-page"><MeetingOverview meeting={meeting} partIndex={partIndex} onSelect={(index) => { setPartIndex(index); setScreen('journey'); }} onBack={() => setScreen('home')} /></main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={() => { setScreen('journey'); setShowMaterial(true); }} onProfile={() => setShowCharacterChooser(true)} /><footer><p>Your notes and drawings stay on this device. <button type="button" className="text-button" onClick={() => alert('Local data controls will be expanded in the next phase. Your current notes and drawings are stored in this browser.')}>Privacy and data</button></p></footer></div>;

  if (screen === 'discoveries') return <div className={`app presentation-${presentation} ${calmView ? 'sensory-calm' : ''}`}><AppHeader profile={character} online={online} onOpenProfile={() => setShowCharacterChooser(true)} onOpenJourney={() => setScreen('overview')} /><main className="page-shell discovery-page"><DiscoveriesScreen meeting={meeting} /></main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={() => { setScreen('journey'); setShowMaterial(true); }} onProfile={() => setShowCharacterChooser(true)} /><footer><p>Your notes and drawings stay on this device.</p></footer></div>;

  if (screen === 'settings') return <div className={`app presentation-${presentation} ${calmView ? 'sensory-calm' : ''}`}><AppHeader profile={character} online={online} onOpenProfile={() => setShowCharacterChooser(true)} onOpenJourney={() => setScreen('overview')} /><main className="page-shell settings-page"><SettingsScreen presentation={presentation} engagement={engagement} calmView={calmView} onPresentation={setPresentation} onEngagement={setEngagement} onCalmView={setCalmView} onOpenProfile={() => setShowCharacterChooser(true)} /></main><MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={() => { setScreen('journey'); setShowMaterial(true); }} onProfile={() => setShowCharacterChooser(true)} /><footer><p>Your notes and drawings stay on this device.</p></footer></div>;

  return <div className={`app presentation-${presentation} ${calmView ? 'sensory-calm' : ''}`}>
    <AppHeader profile={character} online={online} onOpenProfile={() => setShowCharacterChooser(true)} onOpenJourney={() => setScreen('overview')} />
    <main className="page-shell">
      <section className="welcome-card">
        <div className="adventure-scene" aria-hidden="true"><span className="scene-sun" /><span className="scene-cloud cloud-one" /><span className="scene-cloud cloud-two" /><span className="scene-mountain mountain-one" /><span className="scene-mountain mountain-two" /><span className="scene-path" /><CharacterAvatar profile={character} size="hero" action={characterAction} /></div>
        <div className="adventure-intro">
          <div className="adventure-kicker"><CharacterAvatar profile={character} size="medium" action={characterAction} /><div><p className="eyebrow">Your adventure · Week of {new Date(`${meeting.weekOf}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p><strong>{profileName(character)}'s journey</strong></div></div>
          <div className="character-movement" aria-label="Optional movement for your companion"><span>Need to move?</span><button type="button" onClick={() => moveCharacter('fidget')} aria-label="Let your companion fidget">Fidget</button><button type="button" onClick={() => moveCharacter('bounce')} aria-label="Let your companion bounce">Bounce</button><small aria-live="polite">{characterAction === 'steady' ? 'Your companion is ready.' : 'Movement is okay. Take your time.'}</small></div>
          <p className="companion-message" aria-live="polite">{companionMessage(characterAction, partIndex)}</p>
          <h2>{meeting.theme}</h2>
          <p className="lead">{meeting.bibleReading} · Follow the programme at your own pace.</p>
          <button className="source-link source-button" type="button" onClick={() => setShowMaterial(open => !open)} aria-expanded={showMaterial}>{showMaterial ? 'Hide meeting material' : 'Show meeting material'}</button>
          <small className="source-note">Stays in this app, so your place, notes and drawing are not interrupted.</small>
        </div>
        <div className="preference-controls">
          <label>View<select value={presentation} onChange={event => setPresentation(event.target.value as Presentation)}><option value="simple">Simple</option><option value="standard">Standard</option><option value="reflective">Reflective Explorer</option></select></label>
          <label>Activities<select value={engagement} onChange={event => setEngagement(event.target.value as Engagement)}><option value="quiet">Quiet</option><option value="guided">Guided</option><option value="active">Active</option></select></label>
          <button className={`calm-toggle ${calmView ? 'active' : ''}`} type="button" onClick={() => setCalmView(value => !value)} aria-pressed={calmView}>{calmView ? 'Calm view on' : 'Calm view'}</button>
        </div>
      </section>
      <section className="progress-card" aria-label="Your place in the meeting"><div><span className="progress-label">Your place</span><strong>Part {partIndex + 1} of {meeting.parts.length}</strong><small>No rush. You can move, pause or return whenever you need.</small></div><div className="progress-meter" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div><span className="progress-percent">{progress}%</span></section>
      <JourneyTrail meeting={meeting} partIndex={partIndex} onSelect={setPartIndex} />
      {showMaterial && <MeetingMaterialPanelV2 material={meeting.material} activeSectionId={materialSectionFor(part)} onClose={() => setShowMaterial(false)} />}
      <section className={`journey-layout ${showMap ? 'with-map' : 'focus-layout'}`}>
        {showMap && <aside className="journey-map" aria-label="Meeting journey"><div className="map-header"><div><p className="eyebrow">Your journey</p><h2>Meeting map</h2></div><button className="icon-button" type="button" aria-label="Hide journey map" onClick={() => setShowMap(false)}>×</button></div><p className="map-help">Choose any part, or use Next when you are ready.</p><div className="map-list">{Object.entries(sectionParts).map(([section, items]) => <div className="map-section" key={section}><h3>{sectionLabel(section as MeetingPart['section'])}</h3>{items.map(item => { const index = meeting.parts.indexOf(item); return <button key={item.id} type="button" className={`map-stop ${index === partIndex ? 'selected' : ''} ${index < partIndex ? 'visited' : ''}`} onClick={() => setPartIndex(index)}><span className="stop-number">{item.number ?? '•'}</span><span><strong>{item.title}</strong><small>{item.durationMinutes} min</small></span>{index < partIndex && <span aria-label="visited">✓</span>}</button>; })}</div>)}</div></aside>}
        <section className="part-column">
          <div className="part-toolbar">{!showMap && <button type="button" onClick={() => setShowMap(true)}>Show journey map</button>}<button type="button" onClick={openMaterial}>Meeting material</button><button type="button" onClick={() => setPartIndex(0)} disabled={partIndex === 0}>Find my place</button></div>
          <PartScreen profile={character} onMoveCharacter={moveCharacter}><MeetingPartView key={part.id} meetingId={meeting.id} part={part} material={meeting.material} profile={character} totalParts={meeting.parts.length} engagement={engagement} presentation={presentation} onOpenMaterial={openMaterial} /></PartScreen>
          <nav className="next-nav" aria-label="Meeting part navigation"><button type="button" onClick={() => move(-1)} disabled={partIndex === 0}>← Previous</button><span>Part {partIndex + 1} of {meeting.parts.length}</span><button type="button" onClick={() => move(1)} disabled={partIndex === meeting.parts.length - 1}>Next →</button></nav>
        </section>
      </section>
    </main>
    <MobileNav profile={character} screen={screen} onHome={() => setScreen('home')} onJourney={() => setScreen('overview')} onDiscoveries={() => setScreen('discoveries')} onSettings={() => setScreen('settings')} onMaterial={openMaterial} onProfile={() => setShowCharacterChooser(true)} />
    <footer><p>Your notes and drawings stay on this device. <button type="button" className="text-button" onClick={() => alert('Local data controls will be expanded in the next phase. Your current notes and drawings are stored in this browser.')}>Privacy and data</button></p></footer>
  </div>;
}

function AppHeader({ profile, online, onOpenProfile, onOpenJourney }: { profile: CharacterProfile; online: boolean; onOpenProfile: () => void; onOpenJourney: () => void }) {
  return <header className="app-header"><button className="brand-mark" type="button" onClick={onOpenJourney} aria-label="Open today's journey">✦</button><div><p className="eyebrow">Meeting Journey</p><h1>Today's adventure</h1></div><button className="header-character" type="button" onClick={onOpenProfile}><CharacterAvatar profile={profile} size="small" /><span>{profileName(profile)}</span></button><div className="connection-status" aria-live="polite"><span className={online ? 'status-dot online' : 'status-dot'} />{online ? 'Ready' : 'Offline'}<button className="text-button" type="button" onClick={onOpenJourney}>Journey</button></div></header>;
}

function MobileNav({ profile, screen, onHome, onJourney, onDiscoveries, onSettings, onProfile, onMaterial: _onMaterial }: { profile: CharacterProfile; screen: AppScreen; onHome: () => void; onJourney: () => void; onDiscoveries?: () => void; onSettings?: () => void; onProfile: () => void; onMaterial?: () => void }) {
  return <nav className="mobile-nav" aria-label="Meeting Journey navigation"><button className={screen === 'home' ? 'active' : ''} type="button" onClick={onHome} aria-current={screen === 'home' ? 'page' : undefined}><span aria-hidden="true">Home</span></button><button className={screen === 'overview' || screen === 'journey' ? 'active' : ''} type="button" onClick={onJourney} aria-current={screen === 'overview' || screen === 'journey' ? 'page' : undefined}><span aria-hidden="true">Journey</span></button><button className={screen === 'discoveries' ? 'active' : ''} type="button" onClick={() => onDiscoveries?.()} aria-current={screen === 'discoveries' ? 'page' : undefined}><span aria-hidden="true">Discoveries</span></button><button className={screen === 'settings' ? 'active' : ''} type="button" onClick={() => onSettings?.()} aria-current={screen === 'settings' ? 'page' : undefined}><span aria-hidden="true">Settings</span></button><button type="button" onClick={onProfile}><CharacterAvatar profile={profile} size="small" /><span>Me</span></button></nav>;
}

function AdventureHome({ meeting, profile, partIndex, characterAction, onMoveCharacter, onStart, onOverview }: { meeting: Meeting; profile: CharacterProfile; partIndex: number; characterAction: CharacterAction; onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void; onStart: () => void; onOverview: () => void }) {
  return <section className="adventure-home"><div className="home-scene"><span className="scene-sun" /><span className="scene-cloud cloud-one" /><span className="scene-cloud cloud-two" /><CharacterAvatar profile={profile} size="hero" action={characterAction} /><div className="scene-message" aria-live="polite">{companionMessage(characterAction)}</div></div><div className="home-copy"><p className="eyebrow">Welcome back, {profileName(profile)}</p><h2>Ready to explore<br />today's journey?</h2><p className="home-details">{meeting.weekOf} · Life and Ministry Meeting<br />Bible reading: {meeting.bibleReading}</p><div className="home-actions"><button className="primary-adventure-button" type="button" onClick={onStart}>Start journey <span aria-hidden="true">→</span></button><button className="secondary-adventure-button" type="button" onClick={onOverview}>Preview the meeting <span aria-hidden="true">▤</span></button></div><div className="movement-dock"><span>Need a movement break?</span><button type="button" onClick={() => onMoveCharacter('fidget')}>Fidget</button><button type="button" onClick={() => onMoveCharacter('bounce')}>Bounce</button></div></div></section>;
}

function AdventureHomeV2({ meeting, profile, partIndex, characterAction, onMoveCharacter, onStart, onOverview, onOpenMaterial }: { meeting: Meeting; profile: CharacterProfile; partIndex: number; characterAction: CharacterAction; onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void; onStart: () => void; onOverview: () => void; onOpenMaterial: () => void }) {
  const resumeLabel = partIndex > 0 ? 'Continue journey' : 'Start journey';
  return <section className="adventure-home"><div className="home-scene"><span className="scene-sun" /><span className="scene-cloud cloud-one" /><span className="scene-cloud cloud-two" /><CharacterAvatar profile={profile} size="hero" action={characterAction} /><div className="scene-message" aria-live="polite">{companionMessage(characterAction)}</div></div><div className="home-copy"><p className="eyebrow">Welcome back, {profileName(profile)}</p><h2>Ready to explore<br />today's journey?</h2><p className="home-details">{meeting.weekOf} - Life and Ministry Meeting<br />Bible reading: {meeting.bibleReading}</p><div className="home-actions"><button className="primary-adventure-button" type="button" onClick={onStart}>{resumeLabel} <span aria-hidden="true">-&gt;</span></button><button className="secondary-adventure-button" type="button" onClick={onOverview}>Preview the meeting <span aria-hidden="true">Map</span></button><button className="secondary-adventure-button material-home-button" type="button" onClick={onOpenMaterial}>View meeting material <span aria-hidden="true">Read</span></button>{partIndex > 0 && <button className="secondary-adventure-button continue-button" type="button" onClick={onStart}>Continue where I left off <small>Stop {partIndex + 1} of {meeting.parts.length}</small></button>}{meeting.material.appUrl && <a className="secondary-adventure-button official-home-link" href={meeting.material.appUrl} target="_blank" rel="noreferrer">Open in JW Library <span aria-hidden="true">-&gt;</span></a>}</div><MovementMenu onMoveCharacter={onMoveCharacter} /></div></section>;
}

function MovementMenu({ onMoveCharacter }: { onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void }) {
  return <details className="movement-menu"><summary>Need to move?</summary><p>Choose whatever your body feels like. Nothing is scored, and you can stop whenever you want.</p><div className="movement-options"><button type="button" onClick={() => onMoveCharacter('fidget')}>Fidget</button><button type="button" onClick={() => onMoveCharacter('bounce')}>Bounce / jump</button><button type="button" onClick={() => onMoveCharacter('stretch')}>Stretch</button><button type="button" onClick={() => onMoveCharacter('sway')}>Sway / rock</button><button type="button" onClick={() => onMoveCharacter('shake')}>Shake it out</button><button type="button" onClick={() => onMoveCharacter('dance')}>Dance</button></div></details>;
}

function MeetingOverview({ meeting, partIndex, onSelect, onBack }: { meeting: Meeting; partIndex: number; onSelect: (index: number) => void; onBack: () => void }) {
  const sections: MeetingPart['section'][] = ['Opening', 'Treasures', 'FieldMinistry', 'Living', 'Closing'];
  const sectionIcon: Record<MeetingPart['section'], string> = { Opening: '♫', Treasures: '◇', FieldMinistry: '✦', Living: '♧', Closing: '♡' };
  return <section className="meeting-overview"><button className="back-link" type="button" onClick={onBack}>← Home</button><div className="overview-heading"><div><p className="eyebrow">Today's journey</p><h2>{new Date(`${meeting.weekOf}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</h2><p>{meeting.theme}<br /><small>{meeting.bibleReading}</small></p></div><span className="overview-book" aria-hidden="true">▱</span></div><div className="overview-sections">{sections.map(section => <section className={`overview-section overview-${section.toLowerCase()}`} key={section}><div className="overview-section-icon" aria-hidden="true">{sectionIcon[section]}</div><div className="overview-section-content"><h3>{sectionLabel(section)}</h3>{meeting.parts.filter(part => part.section === section).map(item => { const index = meeting.parts.indexOf(item); return <button key={item.id} type="button" className={`overview-stop ${index === partIndex ? 'current' : ''}`} onClick={() => onSelect(index)}><span>{item.number ?? '·'}</span><strong>{item.title}</strong><small>{item.durationMinutes} min</small></button>; })}</div></section>)}</div><button className="overview-start" type="button" onClick={() => onSelect(Math.max(0, partIndex))}>Continue at stop {partIndex + 1} <span aria-hidden="true">→</span></button></section>;
}

function DiscoveriesScreen({ meeting }: { meeting: Meeting }) {
  const [items, setItems] = useState<{ part: MeetingPart; note?: string; feedback?: string; feedbackChoices: string[]; drawingCount: number }[]>([]);
  useEffect(() => {
    let active = true;
    Promise.all(meeting.parts.map(async part => { const saved = await readNote(meeting.id, part.id); return { part, note: saved?.text, feedback: saved?.feedback, feedbackChoices: saved?.feedbackChoices ?? [], drawingCount: (await readDrawing(meeting.id, part.id)).length }; })).then(result => { if (active) setItems(result.filter(item => item.note?.trim() || item.feedback?.trim() || item.feedbackChoices.length > 0 || item.drawingCount > 0)); }).catch(() => undefined);
    return () => { active = false; };
  }, [meeting]);
  return <section className="discoveries-screen"><div className="screen-heading"><div><p className="eyebrow">Your adventure journal</p><h2>My discoveries</h2><p>Notes, reactions and doodles you chose to keep from the meeting.</p></div><span className="screen-heading-icon" aria-hidden="true">Book</span></div>{items.length === 0 ? <div className="empty-discoveries"><span aria-hidden="true">*</span><h3>Your book is ready</h3><p>When you write, react or draw something during a stop, it will appear here. You can skip anything and come back later.</p></div> : <div className="discovery-grid">{items.map(item => <article className="discovery-card" key={item.part.id}><span className="discovery-card-label">Stop {item.part.number ?? item.part.id}</span><h3>{item.part.title}</h3>{item.feedbackChoices.length > 0 && <p className="discovery-feedback"><strong>Noticed:</strong> {item.feedbackChoices.join(' · ')}</p>}{item.feedback && <p className="discovery-feedback"><strong>Reflected:</strong> {item.feedback}</p>}{item.note && <p>{item.note}</p>}<small>{item.drawingCount > 0 ? `${item.drawingCount} saved drawing${item.drawingCount === 1 ? '' : 's'}` : 'Saved discovery'}</small></article>)}</div>}</section>;
}

function SettingsScreen({ presentation, engagement, calmView, onPresentation, onEngagement, onCalmView, onOpenProfile }: { presentation: Presentation; engagement: Engagement; calmView: boolean; onPresentation: (value: Presentation) => void; onEngagement: (value: Engagement) => void; onCalmView: (value: boolean) => void; onOpenProfile: () => void }) {
  return <section className="settings-screen"><div className="screen-heading"><div><p className="eyebrow">Make the journey yours</p><h2>Settings</h2><p>Choose how much guidance, movement and visual detail feels helpful today.</p></div><span className="screen-heading-icon" aria-hidden="true">Gear</span></div><div className="settings-grid"><div className="settings-card"><h3>Presentation style</h3><p>Change the amount of text and reflection without changing your place.</p><div className="settings-choice-row">{(['simple', 'standard', 'reflective'] as Presentation[]).map(value => <button className={presentation === value ? 'selected' : ''} type="button" onClick={() => onPresentation(value)} key={value}><strong>{value === 'reflective' ? 'Reflective' : value[0].toUpperCase() + value.slice(1)}</strong><small>{value === 'simple' ? 'Less on screen' : value === 'standard' ? 'Balanced view' : 'More thinking space'}</small></button>)}</div></div><div className="settings-card"><h3>Engagement level</h3><p>Activities are always optional, and Quiet Mode keeps your notes.</p><div className="settings-choice-row">{(['quiet', 'guided', 'active'] as Engagement[]).map(value => <button className={engagement === value ? 'selected' : ''} type="button" onClick={() => onEngagement(value)} key={value}><strong>{value[0].toUpperCase() + value.slice(1)}</strong><small>{value === 'quiet' ? 'No prompts' : value === 'guided' ? 'Clues when needed' : 'More activities'}</small></button>)}</div></div><div className="settings-card settings-toggle-card"><div><h3>Calm view</h3><p>Reduce decorative contrast and visual motion.</p></div><button type="button" className={calmView ? 'toggle-on' : ''} onClick={() => onCalmView(!calmView)} aria-pressed={calmView}>{calmView ? 'On' : 'Off'}</button></div><div className="settings-card"><h3>Your companion</h3><p>Change their name, age group, style or accessories whenever you want.</p><button className="settings-action" type="button" onClick={onOpenProfile}>Customise companion -&gt;</button></div></div></section>;
}

function MeetingMaterialPanelV2({ material, activeSectionId, onClose }: { material: Meeting['material']; activeSectionId: string; onClose: () => void }) {
  const activeSection = material.sections.find(section => section.id === activeSectionId) ?? material.sections[0];

  return <section id="meeting-material-panel" className="material-panel material-panel-adventure" aria-label="Meeting material" tabIndex={-1}>
    <div className="material-header"><div><p className="eyebrow">Your meeting map</p><h2>{material.title}</h2><p className="material-subtitle">Use these original companion prompts to keep your place. Official material opens in JW Library or on JW.org.</p></div><button className="icon-button" type="button" aria-label="Close meeting material" onClick={onClose}>X</button></div>
    <p className="companion-notice">Meeting Journey is an independent companion guide. It does not replace, reproduce or redistribute official meeting material.</p>
    <div className="material-current"><span className="material-label">You are here</span><h3>{activeSection.heading}</h3><p>{activeSection.body}</p>{activeSection.reference && <span className="material-reference">Reference: {activeSection.reference}</span>}{activeSection.sourceUrl && <a className="material-inline-link" href={activeSection.sourceUrl} target="_blank" rel="noreferrer">Open official source -&gt;</a>}</div>
    <div className="material-route"><div className="material-route-heading"><div><p className="eyebrow">The meeting trail</p><h3>Everything in one place</h3></div><span>{material.sections.length} stops</span></div><div className="material-sections">{material.sections.map(section => <article className={section.id === activeSection.id ? 'active' : ''} key={section.id}><span className="material-stop-marker" aria-hidden="true">{section.id === activeSection.id ? 'Here' : 'Stop'}</span><h3>{section.heading}</h3><p>{section.body}</p>{section.reference && <span className="material-reference">Reference: {section.reference}</span>}{section.sourceUrl && <a className="material-inline-link" href={section.sourceUrl} target="_blank" rel="noreferrer">Open source -&gt;</a>}</article>)}</div></div>
    {(material.appUrl || material.sourceUrl) && <div className="material-link-card"><div><strong>Open the official meeting material</strong><small>Use JW Library for the app handoff, or JW.org for the web version. Your place and notes stay saved here when you return.</small></div><div className="official-link-actions">{material.appUrl && <a href={material.appUrl} target="_blank" rel="noreferrer">Open in JW Library <span aria-hidden="true">-&gt;</span></a>}{material.sourceUrl && <a href={material.sourceUrl} target="_blank" rel="noreferrer">Open on JW.org <span aria-hidden="true">-&gt;</span></a>}</div></div>}
  </section>;
}

function CharacterChooser({ current, onChoose, onCancel }: { current: CharacterProfile | null; onChoose: (profile: CharacterProfile) => void; onCancel?: () => void }) {
  const [draft, setDraft] = useState<CharacterProfile>(() => current ?? defaultProfile);
  const changeVariant = (delta: number) => setDraft(profile => { const index = variantOptions.findIndex(option => option.id === profile.variant); const next = (index + delta + variantOptions.length) % variantOptions.length; return { ...profile, variant: variantOptions[next].id }; });
  const toggleAccessory = (key: 'glasses' | 'cap' | 'backpack') => setDraft(profile => ({ ...profile, [key]: !profile[key] }));
  return <main className="character-screen"><section className="character-chooser"><div className="character-sparkle" aria-hidden="true">✦</div><p className="eyebrow">Start your adventure</p><h1>Meet your companion</h1><p className="character-intro">Choose someone who feels right for your journey. You can change their look whenever you want.</p><div className="companion-preview"><CharacterAvatar profile={draft} size="large" /><div><strong>{draft.name.trim() || 'Your companion'}</strong><small>{ageOptions.find(option => option.id === draft.ageGroup)?.label} explorer</small></div></div><label className="name-field">What should we call them?<input value={draft.name} maxLength={24} onChange={event => setDraft(profile => ({ ...profile, name: event.target.value }))} placeholder="Add a name (optional)" /></label><div className="chooser-group"><span className="chooser-label">Choose a companion</span><div className="character-options character-gender-options">{genderOptions.map(option => <button key={option.id} style={{ '--character-colour': option.colour } as CSSProperties} className={`character-option ${draft.gender === option.id ? 'selected' : ''}`} type="button" onClick={() => setDraft(profile => ({ ...profile, gender: option.id }))}><CharacterAvatar profile={{ ...draft, gender: option.id }} size="medium" /><span className="character-label">{option.label}</span></button>)}</div></div><div className="chooser-group"><span className="chooser-label">Age group</span><div className="age-options">{ageOptions.map(option => <button key={option.id} className={`age-option ${draft.ageGroup === option.id ? 'selected' : ''}`} type="button" onClick={() => setDraft(profile => ({ ...profile, ageGroup: option.id }))}><strong>{option.label}</strong><small>{option.subtitle}</small></button>)}</div></div><details className="customise-panel" open={Boolean(current)}><summary>Customise their look</summary><div className="variant-picker"><button className="look-arrow" type="button" onClick={() => changeVariant(-1)} aria-label="Previous body shape">‹</button><div><CharacterAvatar profile={draft} size="medium" /><strong>{variantOptions.find(option => option.id === draft.variant)?.label}</strong></div><button className="look-arrow" type="button" onClick={() => changeVariant(1)} aria-label="Next body shape">›</button></div><div className="accessory-options"><button className={draft.glasses ? 'selected' : ''} type="button" onClick={() => toggleAccessory('glasses')} aria-pressed={draft.glasses}>Glasses</button><button className={draft.cap ? 'selected' : ''} type="button" onClick={() => toggleAccessory('cap')} aria-pressed={draft.cap}>Cap</button><button className={draft.backpack ? 'selected' : ''} type="button" onClick={() => toggleAccessory('backpack')} aria-pressed={draft.backpack}>Backpack</button></div></details><button className="start-journey-button" type="button" onClick={() => onChoose(draft)}>Start with {draft.name.trim() || 'this companion'} <span aria-hidden="true">→</span></button><p className="character-note">Your choices stay on this device. They change the look of the journey, not what you are able to do.</p>{onCancel && <button className="text-button chooser-back" type="button" onClick={onCancel}>Back to my journey</button>}</section></main>;
}

function CharacterChooserV2({ current, onChoose, onCancel }: { current: CharacterProfile | null; onChoose: (profile: CharacterProfile) => void; onCancel?: () => void }) {
  const [draft, setDraft] = useState<CharacterProfile>(() => current ?? defaultProfile);
  const changeVariant = (delta: number) => setDraft(profile => { const index = variantOptions.findIndex(option => option.id === profile.variant); const next = (index + delta + variantOptions.length) % variantOptions.length; return { ...profile, variant: variantOptions[next].id }; });
  const toggleAccessory = (key: 'glasses' | 'cap' | 'backpack') => setDraft(profile => ({ ...profile, [key]: !profile[key] }));
  const availableStyles = characterStyles.filter(option => !option.teenOnly || draft.ageGroup === 'teen');
  const chooseStyle = (style: CharacterStyle) => setDraft(profile => { const option = characterStyles.find(item => item.id === style); return option ? { ...profile, style, gender: option.gender } : profile; });
  return <main className="character-screen"><section className="character-chooser"><div className="character-sparkle" aria-hidden="true">✦</div><p className="eyebrow">Start your adventure</p><h1>Meet your companion</h1><p className="character-intro">Choose someone who feels right for your journey. Look for a face, hair style and body shape that feels like you.</p><div className="companion-preview"><CharacterAvatar profile={draft} size="large" /><div><strong>{draft.name.trim() || 'Your companion'}</strong><small>{ageOptions.find(option => option.id === draft.ageGroup)?.label} explorer</small><span className="preview-detail">{characterStyles.find(option => option.id === draft.style)?.subtitle}</span></div></div><label className="name-field">What should we call them?<input value={draft.name} maxLength={24} onChange={event => setDraft(profile => ({ ...profile, name: event.target.value }))} placeholder="Add a name (optional)" /></label><div className="chooser-group"><span className="chooser-label">Choose their look</span><div className="character-catalog">{availableStyles.map(option => <button key={option.id} style={{ '--character-colour': genderColour(option.gender) } as CSSProperties} className={`character-card ${draft.style === option.id ? 'selected' : ''}`} type="button" onClick={() => chooseStyle(option.id)}><CharacterAvatar profile={{ ...draft, style: option.id, gender: option.gender }} size="medium" /><strong>{option.label}</strong><small>{option.subtitle}</small></button>)}</div><p className="catalog-hint">Teen companions include more heritage, hair and body-shape choices.</p></div><div className="chooser-group"><span className="chooser-label">Age group</span><div className="age-options">{ageOptions.map(option => <button key={option.id} className={`age-option ${draft.ageGroup === option.id ? 'selected' : ''}`} type="button" onClick={() => setDraft(profile => ({ ...profile, ageGroup: option.id }))}><strong>{option.label}</strong><small>{option.subtitle}</small></button>)}</div></div><details className="customise-panel" open={Boolean(current)}><summary>Customise further</summary><div className="variant-picker"><button className="look-arrow" type="button" onClick={() => changeVariant(-1)} aria-label="Previous body shape">&lt;</button><div><CharacterAvatar profile={draft} size="medium" /><strong>{variantOptions.find(option => option.id === draft.variant)?.label}</strong></div><button className="look-arrow" type="button" onClick={() => changeVariant(1)} aria-label="Next body shape">&gt;</button></div><div className="accessory-options"><button className={draft.glasses ? 'selected' : ''} type="button" onClick={() => toggleAccessory('glasses')} aria-pressed={draft.glasses}>Glasses</button><button className={draft.cap ? 'selected' : ''} type="button" onClick={() => toggleAccessory('cap')} aria-pressed={draft.cap}>Cap</button><button className={draft.backpack ? 'selected' : ''} type="button" onClick={() => toggleAccessory('backpack')} aria-pressed={draft.backpack}>Book bag</button></div></details><button className="start-journey-button" type="button" onClick={() => onChoose(draft)}>Start with {draft.name.trim() || 'this companion'} <span aria-hidden="true">-&gt;</span></button><p className="character-note">Your choices stay on this device. They change the look of the journey, not what you are able to do.</p>{onCancel && <button className="text-button chooser-back" type="button" onClick={onCancel}>Back to my journey</button>}</section></main>;
}

function CharacterAvatar({ profile, size, action = 'steady' }: { profile: CharacterProfile; size: 'small' | 'medium' | 'large' | 'hero'; action?: CharacterAction }) {
  const colour = genderColour(profile.gender);
  return <span className={`character-avatar avatar-${size} character-${profile.gender} age-${profile.ageGroup} variant-${profile.variant} character-action-${action}`} style={{ '--character-colour': colour } as CSSProperties} aria-hidden="true"><img className="character-art" src={characterAsset(profile)} alt="" draggable="false" />{profile.glasses && <span className="character-accessory character-glasses" aria-hidden="true" />}{profile.cap && <span className="character-accessory character-cap" aria-hidden="true" />}</span>;
}

function JourneyTrail({ meeting, partIndex, onSelect }: { meeting: Meeting; partIndex: number; onSelect: (index: number) => void }) {
  const sections: MeetingPart['section'][] = ['Opening', 'Treasures', 'FieldMinistry', 'Living', 'Closing'];
  return <section className="trail-card" aria-label="Adventure trail"><div className="trail-heading"><div><p className="eyebrow">The trail ahead</p><h2>Follow the meeting journey</h2></div><span>{Math.round(((partIndex + 1) / meeting.parts.length) * 100)}% explored</span></div><div className="trail-track">{sections.map((section, index) => { const first = meeting.parts.findIndex(part => part.section === section); const last = meeting.parts.map(part => part.section).lastIndexOf(section); const selected = partIndex >= first && partIndex <= last; const visited = partIndex > last; return <div className={`trail-stop ${selected ? 'selected' : ''} ${visited ? 'visited' : ''}`} key={section}><button type="button" onClick={() => onSelect(first)} aria-current={selected ? 'step' : undefined}><span className="trail-node">{visited ? '✓' : index + 1}</span><strong>{sectionLabel(section)}</strong><small>{selected ? 'You are here' : visited ? 'Complete when ready' : `${meeting.parts.filter(part => part.section === section).length} stops`}</small></button>{index < sections.length - 1 && <i aria-hidden="true" />}</div>; })}</div></section>;
}

function PartScreen({ profile, onMoveCharacter, children }: { profile: CharacterProfile; onMoveCharacter: (action: Exclude<CharacterAction, 'steady'>) => void; children: ReactNode }) {
  return <div className="part-screen-shell"><div className="part-story-scene" aria-hidden="true"><span className="story-sun" /><span className="story-path" /><CharacterAvatar profile={profile} size="medium" /></div><div className="part-movement-strip"><MovementMenu onMoveCharacter={onMoveCharacter} /></div>{children}</div>;
}

function MeetingPartView({ meetingId, part, material, profile, totalParts, engagement, presentation, onOpenMaterial }: { meetingId: string; part: MeetingPart; material: Meeting['material']; profile: CharacterProfile; totalParts: number; engagement: Engagement; presentation: Presentation; onOpenMaterial: () => void }) {
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackChoices, setFeedbackChoices] = useState<string[]>([]);
  const [sourceConfirmations, setSourceConfirmations] = useState<string[]>([]);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  useEffect(() => { readNote(meetingId, part.id).then(saved => { setNote(saved?.text ?? ''); setFeedback(saved?.feedback ?? ''); setFeedbackChoices(saved?.feedbackChoices ?? []); setSourceConfirmations(saved?.sourceConfirmations ?? []); }).catch(() => undefined); }, [meetingId, part.id]);
  const savePartContent = (nextNote: string, nextFeedback: string, nextChoices: string[], nextSourceConfirmations = sourceConfirmations) => saveNote({ meetingId, partId: part.id, text: nextNote, feedback: nextFeedback, feedbackChoices: nextChoices, sourceConfirmations: nextSourceConfirmations, updatedAt: new Date().toISOString() }).then(() => setSavedAt('Saved locally')).catch(() => setSavedAt('Could not save'));
  const updateNote = (value: string) => { setNote(value); savePartContent(value, feedback, feedbackChoices); };
  const updateFeedback = (value: string) => { setFeedback(value); savePartContent(note, value, feedbackChoices); };
  const toggleFeedbackChoice = (choice: string) => { const nextChoices = feedbackChoices.includes(choice) ? feedbackChoices.filter(item => item !== choice) : [...feedbackChoices, choice]; setFeedbackChoices(nextChoices); savePartContent(note, feedback, nextChoices); };
  const toggleSourceConfirmation = (confirmation: string) => { const nextConfirmations = sourceConfirmations.includes(confirmation) ? sourceConfirmations.filter(item => item !== confirmation) : [...sourceConfirmations, confirmation]; setSourceConfirmations(nextConfirmations); savePartContent(note, feedback, feedbackChoices, nextConfirmations); };
  const visibleActivities = engagement === 'quiet' ? [] : part.activities;
  const jumpTo = (target: 'summary' | 'discover' | 'notes' | 'source') => { if (target === 'source') return onOpenMaterial(); if (target === 'discover') { setDrawingOpen(true); document.getElementById(`${part.id}-doodle`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } document.getElementById(`${part.id}-${target}`)?.focus(); };
  return <article className="part-card"><div className="quest-banner"><span className="quest-gem" aria-hidden="true">✦</span><div><span>Current quest</span><strong>Stop {part.number ?? part.id} of {totalParts}</strong></div><small>{sectionLabel(part.section)}</small></div><div className="part-kicker"><span>{sectionLabel(part.section)}</span><span>{part.durationMinutes} min</span></div><h2>{part.number ? `${part.number}. ` : ''}{part.title}</h2><div className="quest-actions" aria-label="Quest actions"><button type="button" onClick={() => jumpTo('summary')}>Listen</button><button type="button" onClick={() => jumpTo('discover')}>Discover</button><button type="button" onClick={() => jumpTo('notes')}>Notes</button><button type="button" onClick={() => jumpTo('source')}>Reference</button></div><p id={`${part.id}-summary`} className="part-summary" tabIndex={-1}>{part.summary}</p><div id={`${part.id}-doodle`} className="source-card"><div><strong>Keep this stop close</strong><span>Meeting material and your discoveries stay inside the journey.</span></div><button className="source-link source-button" type="button" onClick={onOpenMaterial}>Open guide</button></div>{part.references.length > 0 && <div className="references"><strong>Part reference</strong>{part.references.map(reference => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer"><span>{reference.label} -&gt;</span>{reference.note && <small>{reference.note}</small>}</a>)}</div>}
    <OfficialPartSourceCard part={part} material={material} confirmations={sourceConfirmations} onToggle={toggleSourceConfirmation} onOpenGuide={onOpenMaterial} />
    {engagement !== 'quiet' && <PartFeedbackCard part={part} value={feedback} choices={feedbackChoices} savedAt={savedAt} onChange={updateFeedback} onToggleChoice={toggleFeedbackChoice} />}
    {presentation !== 'simple' && <div className="notes-card"><label htmlFor={`${part.id}-notes`}>My notes</label><textarea id={`${part.id}-notes`} value={note} onChange={event => updateNote(event.target.value)} placeholder="Write a thought, question or encouragement…" rows={presentation === 'reflective' ? 6 : 4} /><small aria-live="polite">{savedAt || 'Saved on this device automatically'}</small></div>}
    {presentation !== 'simple' && <div className="drawing-actions"><button type="button" onClick={() => setDrawingOpen(open => !open)}>{drawingOpen ? 'Close doodle page' : 'Open doodle page'}</button><span>Draw with a finger, stylus or mouse.</span></div>}
    {drawingOpen && <DrawingPad meetingId={meetingId} partId={part.id} />}
    {visibleActivities.map(activity => <ActivityCard key={activity.id} activity={activity} onOpenDrawing={() => setDrawingOpen(true)} onSaveThought={updateNote} />)}
    {engagement === 'active' && part.id === 'part-8' && <ConnectTheIdeasCard onSaveThought={updateNote} />}
    {engagement === 'quiet' && part.activities.length > 0 && <p className="quiet-note">Quiet Mode is on. Your notes are still here; optional activities are hidden.</p>}
  </article>;
}

function feedbackForPart(part: MeetingPart): { title: string; prompt: string; choices: string[] } {
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
  return <section className="official-part-card" aria-labelledby={`${part.id}-official-title`}><div className="official-part-heading"><div><span className="activity-label">Official source</span><h3 id={`${part.id}-official-title`}>Open “{part.title}” in the official source</h3></div><button type="button" className="official-guide-button" onClick={onOpenGuide}>See companion guide</button></div><p>This opens the official meeting source. Find this programme item there, then return and tell us what happened for you. Nothing is checked automatically.</p><div className="official-part-links">{material.appUrl && <a href={material.appUrl} target="_blank" rel="noreferrer">Open this meeting in JW Library <span aria-hidden="true">-&gt;</span></a>}{material.sourceUrl && <a href={material.sourceUrl} target="_blank" rel="noreferrer">Open this meeting on JW.org <span aria-hidden="true">-&gt;</span></a>}</div><div className="source-confirmations" aria-label="Your source check-in">{options.map(option => <label key={option}><input type="checkbox" checked={confirmations.includes(option)} onChange={() => onToggle(option)} /><span>{option}</span></label>)}</div>{confirmations.length > 0 && <small className="confirmation-saved">Saved on this device. You can change this later.</small>}</section>;
}

function PartFeedbackCard({ part, value, choices, savedAt, onChange, onToggleChoice }: { part: MeetingPart; value: string; choices: string[]; savedAt: string; onChange: (value: string) => void; onToggleChoice: (choice: string) => void }) {
  const prompt = feedbackForPart(part);
  return <section className="feedback-card" aria-labelledby={`${part.id}-feedback-title`}><div className="feedback-icon" aria-hidden="true">♥</div><div className="activity-label">Optional reflection</div><h3 id={`${part.id}-feedback-title`}>{prompt.title}</h3><p>{prompt.prompt}</p><div className="feedback-choices">{prompt.choices.map(choice => <button className={choices.includes(choice) ? 'selected' : ''} type="button" aria-pressed={choices.includes(choice)} onClick={() => onToggleChoice(choice)} key={choice}>{choice}</button>)}</div><label className="feedback-input-label" htmlFor={`${part.id}-feedback`}>Add your own words <textarea id={`${part.id}-feedback`} value={value} onChange={event => onChange(event.target.value)} placeholder={part.type === 'Song' ? 'Write a word or line that stood out...' : 'A few words is enough...'} rows={2} /></label><small className="feedback-save" aria-live="polite">{savedAt || 'Optional — skip this or come back later. Saved on this device.'}</small></section>;
}

function ConnectTheIdeasCard({ onSaveThought }: { onSaveThought: (value: string) => void }) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [example, setExample] = useState('');
  const choices = [
    ['Time', 'Visit someone who is unwell'],
    ['Encouragement', 'Offer to help with a practical task'],
    ['Practical help', 'Share a scripture'],
    ['Spiritual things', 'Give a listening ear']
  ];
  return <section className="activity-card connect-activity"><div className="activity-icon" aria-hidden="true">+</div><div className="activity-label">Connect the ideas</div><h3>How can we share with others?</h3><p>Choose a related idea on the right. There is no timer and you can change an answer whenever you want.</p><div className="connect-grid">{choices.map(([left, right]) => <button className={selected[left] === right ? 'selected' : ''} type="button" onClick={() => setSelected(current => ({ ...current, [left]: right }))} key={left}><strong>{left}</strong><span>{right}</span></button>)}</div><label className="connect-note">Add my own example<textarea value={example} onChange={event => setExample(event.target.value)} onBlur={() => onSaveThought(example)} placeholder="A kind thing I could share..." rows={2} /></label><span className="activity-hint">You can skip this activity or leave it unfinished.</span></section>;
}

function ActivityCard({ activity, onOpenDrawing, onSaveThought }: { activity: EngagementActivity; onOpenDrawing: () => void; onSaveThought: (value: string) => void }) {
  const [revealed, setRevealed] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [thought, setThought] = useState('');
  const mission = activity.mission;
  if (activity.type === 'ClueCards' && mission) return <section className="activity-card clue-card"><div className="activity-icon" aria-hidden="true">?</div><div className="activity-label">Optional discovery mission</div><h3>{mission.title}</h3><p><strong>Listen for:</strong> {mission.listeningObjective}</p>{mission.scriptureReference && <p className="reference-line">Reference: {mission.scriptureReference}</p>}<div className="clue-steps" aria-label="Three optional clue levels"><span className={revealed >= 1 ? 'active' : ''}>Notice</span><i /> <span className={revealed >= 2 ? 'active' : ''}>Connect</span><i /> <span className={revealed >= 3 ? 'active' : ''}>Remember</span></div><div className="clues">{mission.clues.map((clue, index) => <div className={`clue-row ${index < revealed ? 'revealed' : ''}`} key={clue}><span>{index + 1}</span>{index < revealed ? <p>{clue}</p> : <button type="button" onClick={() => setRevealed(current => Math.max(current, index + 1))}>Reveal clue {index + 1}</button>}</div>)}</div><button type="button" className="skip-button" onClick={() => setRevealed(mission.clues.length)}>Show all clues</button></section>;
  if (activity.type === 'SpotTheClue') return <section className="activity-card visual-activity"><div className="activity-icon" aria-hidden="true">◉</div><div className="activity-label">Spot the clue</div><h3>{activity.title}</h3><p>{activity.prompt}</p><div className="choice-row"><button className={selected === 'word' ? 'selected' : ''} type="button" onClick={() => setSelected('word')}>A word</button><button className={selected === 'idea' ? 'selected' : ''} type="button" onClick={() => setSelected('idea')}>An idea</button><button className={selected === 'question' ? 'selected' : ''} type="button" onClick={() => setSelected('question')}>A question</button></div>{selected && <p className="gentle-confirmation">Good place to start. Add it to your notes if you want to keep it.</p>}</section>;
  if (activity.type === 'DrawYourDiscovery') return <section className="activity-card visual-activity"><div className="activity-icon" aria-hidden="true">✎</div><div className="activity-label">Draw your discovery</div><h3>{activity.title}</h3><p>{activity.prompt}</p><button className="activity-action" type="button" onClick={onOpenDrawing}>Open the doodle pad</button><span className="activity-hint">There is no right picture. A shape, symbol or colour is enough.</span></section>;
  if (activity.type === 'MyThoughtBubble') return <section className="activity-card visual-activity"><div className="activity-icon" aria-hidden="true">💭</div><div className="activity-label">My thought bubble</div><h3>{activity.title}</h3><p>{activity.prompt}</p><textarea className="thought-input" value={thought} onChange={event => setThought(event.target.value)} onBlur={() => onSaveThought(thought)} placeholder="A few words is enough…" rows={2} /><span className="activity-hint">Saved with your notes. You can leave this blank or skip it.</span></section>;
  return <section className="activity-card visual-activity"><div className="activity-label">Optional activity</div><h3>{activity.title}</h3><p>{activity.prompt}</p><span className="activity-hint">You can skip this at any time.</span></section>;
}
