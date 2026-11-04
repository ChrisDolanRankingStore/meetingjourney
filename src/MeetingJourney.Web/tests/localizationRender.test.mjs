import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from '../node_modules/vite/dist/node/index.js';
import React from '../node_modules/react/index.js';
import {renderToStaticMarkup} from '../node_modules/react-dom/server.node.js';
import {getMeeting} from '../../../node-app/meeting-catalog.js';
import {readPublishedMeeting} from '../../../node-app/published-content.js';
import {assemblyMeeting} from '../src/circuitAssembly.ts';
import {conventionDates,conventionMeeting} from '../src/convention.ts';

const testProfile={gender:'boy',ageGroup:'teen',name:'',style:'classic-boy',variant:'standard',hairColour:'natural',eyeColour:'brown',glasses:false,cap:false,backpack:true,tablet:false,phone:false};

test('welcome, character choice and home render in Spanish and still render in English', async()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const server=await createServer({root,configFile:false,server:{middlewareMode:true,hmr:false},logLevel:'error'});
 const data=new Map();
 const previousStorage=globalThis.localStorage, previousWindow=globalThis.window, previousSessionStorage=globalThis.sessionStorage;
 globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 globalThis.sessionStorage={getItem:()=>null,setItem:()=>{}};
 globalThis.window={innerWidth:1024,matchMedia:()=>({matches:false})};
 try{
  const {default:App,MeetingPartView}=await server.ssrLoadModule('/src/App.tsx');
  data.set('mj-language','es');
  let html=renderToStaticMarkup(React.createElement(App));
  assert.match(html,/Una pequeña ayuda para seguir la reunión/);
  assert.match(html,/Español/);
  assert.match(html,/\/es\/privacy.html/);
  data.set('mj-welcome-seen','true');
  html=renderToStaticMarkup(React.createElement(App));
  assert.match(html,/Elige a tu compañero/);
  assert.match(html,/Nombre \(opcional\)/);
  const visibleText=html.replace(/<[^>]*>/g,' ');
  assert.doesNotMatch(visibleText,/\b(?:Teen|Boy|Girl|Preteen|Taller|Slim|Chunkier|Chico|Chica|Adolescente|Delgado)\b/i);
  for(const range of ['20–34','35–39','40–59','60+'])assert.ok(visibleText.includes(range));
  const {CompanionPortrait}=await server.ssrLoadModule('/src/CompanionPortrait.tsx');
  const {MovementIcon}=await server.ssrLoadModule('/src/MovementIcon.tsx');
  for(const action of ['fidget','bounce','stretch','sway','shake','dance']){
    const movement=renderToStaticMarkup(React.createElement(MovementIcon,{action}));
    assert.match(movement,new RegExp(`src="/assets/painted-icons-v1/move-${action}\\.webp"`));
    assert.match(movement,/<img /);
    assert.match(movement,/alt=""/);
    assert.match(movement,/aria-hidden="true"/);
  }
  const {IllustratedIcon}=await server.ssrLoadModule('/src/IllustratedIcon.tsx');
  for(const name of ['listen','discover','notes','references','clue','thought','question','heart','connect']){
    const icon=renderToStaticMarkup(React.createElement(IllustratedIcon,{name}));
    assert.match(icon,new RegExp(`src="/assets/painted-icons-v1/${name}\\.webp"`));
    assert.match(icon,/alt="" aria-hidden="true"/);
    assert.doesNotMatch(icon,/<svg/);
  }
  const portrait=renderToStaticMarkup(React.createElement(CompanionPortrait,{asset:'/assets/characters/adult60-1-ready-clean.png',resolution:720}));
  assert.match(portrait,/<img /);assert.doesNotMatch(portrait,/<svg/);
  data.set('mj-character',JSON.stringify({gender:'boy',ageGroup:'teen',name:'My Own Name',style:'classic-boy'}));
  html=renderToStaticMarkup(React.createElement(App));
  assert.doesNotMatch(html.replace(/<[^>]*>/g,' '),/adventure|treasure|aventura|tesoro/i);
  assert.match(html,/Inicio/);assert.match(html,/Recorrido/);assert.match(html,/Descubrimientos/);assert.match(html,/Ajustes/);
  assert.doesNotMatch(html,/class="header-character"|class="companion-action-hub companion-dock/);
  const navigation=html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(navigation);assert.equal((navigation.match(/<button/g)??[]).length,4);
  for(const label of ['Inicio','Recorrido','Descubrimientos','Ajustes'])assert.ok(navigation.includes(`aria-label="${label}"`));
  assert.match(navigation,/aria-label="Descubrimientos"[\s\S]*?<span class="icon-action-label">Explorar<\/span>/);
  assert.doesNotMatch(navigation,/nav-profile|character-avatar/);
  assert.match(html,/companion-nameplate[^>]*>My Own Name<\/span>/);assert.doesNotMatch(html,/>Start journey</);
  assert.match(html,/teen-1-ready-clean-\d+\.webp\?v=portraits-/);
  assert.match(html,/De nuevo aquí, My Own Name/);
  assert.match(html,/artwork-painted/);
  assert.match(html,/home-redesign/);
  assert.doesNotMatch(html,/comfort-shortcut|>Personalizar compañero<\/button>/);
  assert.match(html,/home-screen" style="--scene-home-image:/);
  assert.match(html,/aria-haspopup="dialog" aria-controls="home-guide-dialog"/);
  assert.match(html,/Pregunta a tu guía/);
  assert.doesNotMatch(html,/class="action-bubble/);
  assert.match(html,/Ver el recorrido/);
  assert.match(html,/compact-v1\/journey-[a-z]+-v1-960.webp/);
  const {DisplaySettings}=await server.ssrLoadModule('/src/OfflineMeeting.tsx');
  const settings=renderToStaticMarkup(React.createElement(DisplaySettings));
  assert.doesNotMatch(settings,/scene-artwork|worlds-v1|Paisajes vectoriales/);
  assert.match(settings,/Aspecto para la lectura/);
  const originalSettings=[...data];
  renderToStaticMarkup(React.createElement(DisplaySettings));
  assert.deepEqual([...data],originalSettings);
  data.set('mj-scene-artwork','vector');
  const migratedHtml=renderToStaticMarkup(React.createElement(App));
  assert.match(migratedHtml,/artwork-painted/);
  assert.doesNotMatch(migratedHtml,/worlds-v1/);
  assert.match(migratedHtml,/painted-welcome-copy/);
  data.delete('mj-scene-artwork');
  assert.match(html,/Comenzar recorrido/);
  data.set('mj-character',JSON.stringify({gender:'boy',ageGroup:'adult35',name:'Christopher',style:'classic-boy'}));
  html=renderToStaticMarkup(React.createElement(App));
  assert.match(html,/Cuando estés listo/);
  assert.doesNotMatch(html,/Let us take the next step| back, |Start journey|aventura|tesoro/i);
  const {WordBingo}=await server.ssrLoadModule('/src/WordBingo.tsx');
  const bingoPart=getMeeting('weekend','2026-10-25').parts[3];
  for(const older of [false,true]){
   const bingo=renderToStaticMarkup(React.createElement(WordBingo,{meetingId:'weekend-2026-10-19',part:bingoPart,older,onClue:()=>{},onWrite:()=>{},onDraw:()=>{}}));
   assert.equal((bingo.match(/aria-pressed="false"/g)??[]).length,older?17:10);
   assert.match(bingo,older?/aria-pressed="true">4 × 4/:/aria-pressed="true">3 × 3/);
   assert.match(bingo,/Bingo de palabras/);assert.match(bingo,/Jehová/);
   assert.match(bingo,older?/0 de 16 encontradas/:/0 de 9 encontradas/);
   assert.match(bingo,/Mis notas/);assert.match(bingo,/Dibujar/);
   assert.match(bingo,/<progress value="0" max="/);
   assert.match(bingo,/¿Necesitas una pista/);
  }
  data.set('mj-language','en');
  html=renderToStaticMarkup(React.createElement(App));
  assert.match(html,/Start journey/);assert.match(html,/Discoveries/);assert.match(html,/Christopher/);
  const {StudyTools}=await server.ssrLoadModule('/src/StudyTools.tsx');
  const {ComfortSettings}=await server.ssrLoadModule('/src/ComfortSettings.tsx');
  const {IconAction}=await server.ssrLoadModule('/src/IconAction.tsx');
  const {ProgrammeImport}=await server.ssrLoadModule('/src/ProgrammeImport.tsx');
  const {ParentPinGate}=await server.ssrLoadModule('/src/ParentAccess.tsx');
  const {QuietPauseTools}=await server.ssrLoadModule('/src/QuietPauseTools.tsx');
  const pauseTools=renderToStaticMarkup(React.createElement(QuietPauseTools));
  assert.match(pauseTools,/aria-label="Hands-only pause tools"/);
  assert.match(pauseTools,/aria-label="Breathe"/);
  assert.match(pauseTools,/aria-label="Spin"/);
  assert.match(pauseTools,/aria-pressed="false"/);
  data.set('mj-parent-pin',JSON.stringify({salt:'00',digest:'00'}));
  const gated=renderToStaticMarkup(React.createElement(ParentPinGate,null,React.createElement('p',null,'Protected settings')));
  assert.match(gated,/Parent or carer 4-digit code/);
  assert.match(gated,/inputMode="numeric"/);
  assert.doesNotMatch(gated,/Protected settings/);
  data.delete('mj-parent-pin');
  data.set('mj-comfort',JSON.stringify({neutral:true,hideCounts:true,iconLabels:true,textSize:'larger'}));
  const quietBingo=renderToStaticMarkup(React.createElement(WordBingo,{meetingId:'weekend-2026-10-19',part:bingoPart,older:true}));
  assert.doesNotMatch(quietBingo,/<progress|bingo-progress|of 16 found|is-line/);
  const quietStudy=renderToStaticMarkup(React.createElement(StudyTools,{meetingId:'test',part:{...bingoPart,type:'WatchtowerStudy'},teen:true,quiet:true,onDraw:()=>{},onWrite:()=>{}}));
  assert.doesNotMatch(quietStudy,/scripture-spotter/);
  assert.match(quietStudy,/Your own words/);
  const historyIcon=renderToStaticMarkup(React.createElement(IconAction,{icon:'calendar',label:'Previous notes'}));
  assert.match(historyIcon,/icon-action-hint/);
  assert.doesNotMatch(historyIcon,/icon-action-label/);
  assert.match(historyIcon,/title="Previous notes"/);
  assert.match(renderToStaticMarkup(React.createElement(IconAction,{icon:'home',label:'Home',showLabel:true})),/icon-action-label/);
  const characterBefore=data.get('mj-character');data.delete('mj-character');
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(App)),/age-only-chooser/);
  data.set('mj-character',characterBefore);
  data.set('mj-language','es');
  const comfortEs=renderToStaticMarkup(React.createElement(ComfortSettings));
  assert.match(comfortEs,/Comodidad diaria|Tamaño del texto/);
  assert.match(comfortEs,/Ocultar contadores/);
  data.set('mj-language','en');
  data.delete('mj-comfort');
  data.set('mj-import-explanation-seen','true');
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(ProgrammeImport,{home:true})),/<details open/);
  assert.match(renderToStaticMarkup(React.createElement(ProgrammeImport)),/<details open/);
  data.delete('mj-import-explanation-seen');
  const {CircuitVisitSettings}=await server.ssrLoadModule('/src/CircuitVisitSettings.tsx');
  const {LocalPartTitles}=await server.ssrLoadModule('/src/MeetingDetails.tsx');
  const {applyCircuitVisit}=await server.ssrLoadModule('/src/circuitVisit.ts');
  const {CircuitAssemblySettings}=await server.ssrLoadModule('/src/CircuitAssemblySettings.tsx');
  const {ConventionSettings}=await server.ssrLoadModule('/src/ConventionSettings.tsx');
  const {ListeningActivities}=await server.ssrLoadModule('/src/ListeningActivities.tsx');
  const {ConnectIdeas}=await server.ssrLoadModule('/src/ConnectIdeas.tsx');
  const {PartActivities}=await server.ssrLoadModule('/src/PartActivities.tsx');
  const {DrawingToolbar}=await server.ssrLoadModule('/src/DrawingToolbar.tsx');
  const drawingToolbar=renderToStaticMarkup(React.createElement(DrawingToolbar,{
   tool:'pen',colour:'#163b5c',size:5,canUndo:false,canRedo:false,
   onTool:()=>{},onColour:()=>{},onSize:()=>{},onUndo:()=>{},onRedo:()=>{},onClear:()=>{},onExport:()=>{},onExtendPaper:()=>{},
   zoom:1,onZoom:()=>{},onResetZoom:()=>{},
   pages:{page:0,count:1,onSelect:()=>{},onAdd:()=>{},template:'blank',onTemplate:()=>{}}
  }));
  assert.equal((drawingToolbar.match(/role="toolbar"/g)??[]).length,1);
  assert.match(drawingToolbar,/aria-orientation="vertical"/);
  assert.equal((drawingToolbar.match(/<button/g)??[]).length,11);
  assert.equal((drawingToolbar.match(/aria-expanded="false"/g)??[]).length,8);
  assert.match(drawingToolbar,/aria-label="Pen"/);
  assert.match(drawingToolbar,/aria-label="Highlighter"/);
  assert.match(drawingToolbar,/aria-label="Eraser"/);
  assert.match(drawingToolbar,/aria-label="Smudge"/);
  assert.match(drawingToolbar,/aria-label="Red"/);
  assert.match(drawingToolbar,/aria-label="Gold"/);
  assert.match(drawingToolbar,/aria-label="More colours"/);
  assert.doesNotMatch(drawingToolbar,/aria-label="Undo last stroke"|aria-label="Redo last stroke"/);
  assert.doesNotMatch(drawingToolbar,/type="color"|drawing-options-panel/);
  const {OfficialLinks,BibleReferenceLinks}=await server.ssrLoadModule('/src/OfficialLinks.tsx');
  const {PartReferenceLinks}=await server.ssrLoadModule('/src/PartReferenceLinks.tsx');
  const {HomeGuidePanel}=await server.ssrLoadModule('/src/HomeGuidePanel.tsx');
  const {StoryJourneyMap}=await server.ssrLoadModule('/src/StoryJourneyMap.tsx');
  const {DiscoveriesMap,savedDiscoveryLabel}=await server.ssrLoadModule('/src/DiscoveriesMap.tsx');
  const {localizeMeeting}=await server.ssrLoadModule('/src/meetingLocale.ts');
  for(const language of ['en','es']){
   data.set('mj-language',language);
   const discoveryMap=renderToStaticMarkup(React.createElement(DiscoveriesMap,{meeting:localizeMeeting(getMeeting('midweek','2026-10-19'),language),onReturn:()=>{},teen:true,standardRegister:true}));
   assert.doesNotMatch(discoveryMap.replace(/<[^>]*>/g,' '),/adventure|treasure|aventura|tesoro/i);
   assert.match(savedDiscoveryLabel(true),language==='es'?/Tu descubrimiento guardado · Parada/:/Your saved discovery · Stop/);
   assert.doesNotMatch(savedDiscoveryLabel(true),/treasure|tesoro/i);
   for(const contentNotice of ['The public talk topic and opening and closing songs are chosen locally.','El tema del discurso y las canciones inicial y final se eligen en cada congregación.']){
    const cached=localizeMeeting({...getMeeting('weekend','2026-10-25'),contentNotice},language);
    assert.equal(cached.contentNotice,undefined);
   }
   const general=localizeMeeting(getMeeting('weekend','2027-01-03'),language);
   assert.match(general.contentNotice,language==='es'?/añadido/:/not been added/);
  }
  const regularMap=renderToStaticMarkup(React.createElement(StoryJourneyMap,{meeting:getMeeting('midweek','2026-10-19'),current:0,onSelect:()=>{},onBack:()=>{},listView:()=>null}));
  assert.match(regularMap,/artwork-painted/);
  assert.match(regularMap,/journey-discovery-map-v1-960.webp/);
  for(const language of ['en','es']){
   data.set('mj-language',language);
   const props={meeting:getMeeting('midweek','2026-10-19'),current:0,onSelect:()=>{},onBack:()=>{},listView:()=>null,companion:React.createElement('span',null,'Companion')};
   const draggable=renderToStaticMarkup(React.createElement(StoryJourneyMap,props));
   assert.match(draggable,/class="map-companion-cursor/);
   assert.match(draggable,/data-journey-stop="0"/);
   assert.match(draggable,language==='es'?/Arrastra a tu compañero/:/Drag your companion/);
   assert.doesNotMatch(renderToStaticMarkup(React.createElement(StoryJourneyMap,{...props,initialList:true})),/class="map-companion-cursor/);
   data.set('mj-comfort','{"neutral":true}');
   assert.doesNotMatch(renderToStaticMarkup(React.createElement(StoryJourneyMap,props)),/class="map-companion-cursor/);
   data.delete('mj-comfort');
  }
  const outline=renderToStaticMarkup(React.createElement(StoryJourneyMap,{meeting:getMeeting('midweek','2026-10-19'),current:0,initialList:true,onSelect:()=>{},onBack:()=>{},listView:indices=>React.createElement('p',null,`outline stops: ${indices.length}`)}));
  assert.match(outline,/story-map-list/);
  assert.match(outline,/outline stops: 14/);
  assert.doesNotMatch(outline,/illustrated-journey-map|role="dialog"/);
  assert.ok(Number(regularMap.match(/min-height:(\d+)px/)?.[1])>=Math.ceil(getMeeting('midweek','2026-10-19').parts.length/2)*150);
  for(const language of ['en','es']){
   data.set('mj-language',language);
   const guideProps={open:false,onClose:()=>{},onAction:()=>{},onMove:()=>{},quiet:false,hasSource:true};
   const guide=renderToStaticMarkup(React.createElement(HomeGuidePanel,guideProps));
   assert.match(guide,/<dialog[^>]+aria-labelledby="home-guide-title"/);
   for(const label of language==='es'?['¿Adónde vamos?','Continuar recorrido','Programa de la reunión','Notas y dibujos','Actividades','Volver a mi lugar','Más acciones']:['Where shall we go?','Continue journey','Meeting outline','Doodle notes','Activities','Find my place','More actions'])assert.ok(guide.includes(label),label);
   assert.equal((guide.match(/class="movement-icon movement-icon-/g)??[]).length,6);
   assert.doesNotMatch(guide,/action-bubble|speech-bubble/);
   assert.match(guide,/home-guide-sprig/);
   assert.match(guide,/painted-icons-v1\/discover.webp/);
   assert.match(guide,/painted-icons-v1\/connect.webp/);
   const quietGuide=renderToStaticMarkup(React.createElement(HomeGuidePanel,{...guideProps,quiet:true}));
   assert.doesNotMatch(quietGuide,language==='es'?/>Actividades</:/>Activities</);
   assert.match(quietGuide,language==='es'?/Notas y dibujos/:/Doodle notes/);
   const noSourceGuide=renderToStaticMarkup(React.createElement(HomeGuidePanel,{...guideProps,hasSource:false}));
   assert.doesNotMatch(noSourceGuide,/JW Library/);
   const linkedMeeting=localizeMeeting(getMeeting('midweek','2026-10-19'),language);
   const linkedPart=linkedMeeting.parts.find(part=>part.id==='part-3');
   const panel=renderToStaticMarkup(React.createElement(MeetingPartView,{
    meetingId:linkedMeeting.id,part:linkedPart,partIndex:4,material:linkedMeeting.material,
    profile:testProfile,totalParts:linkedMeeting.parts.length,engagement:'quiet',presentation:'standard',onOpenMaterial:()=>{}
   }));
   assert.doesNotMatch(panel,/class="part-inline-sources"/);
   assert.match(panel,/class="part-single-focus"/);
   assert.doesNotMatch(panel.replace(/<[^>]*>/g,' '),/adventure|treasure|aventura|tesoro/i);
   const reflectionPanel=renderToStaticMarkup(React.createElement(MeetingPartView,{
    meetingId:linkedMeeting.id,part:linkedPart,partIndex:4,material:linkedMeeting.material,
    profile:testProfile,totalParts:linkedMeeting.parts.length,engagement:'guided',presentation:'reflective',onOpenMaterial:()=>{}
   }));
   const checks=reflectionPanel.match(/<fieldset class="part-reflection-choices">[\s\S]*?<\/fieldset>/)?.[0];
   assert.ok(checks);
   assert.match(checks,/<legend>/);
   assert.match(checks,/<input type="checkbox"/);
   assert.doesNotMatch(checks,/illustrated-icon|aria-pressed/);
   assert.doesNotMatch(panel,/part-reflection-choices/);
   assert.match(reflectionPanel,/<div class="part-guided-content"><nav class="part-workspace-tabs"[\s\S]*?illustrated-icon/);
   const partTools=reflectionPanel.match(/<nav class="part-workspace-tabs"[\s\S]*?<\/nav>/)?.[0];
   assert.ok(partTools);
   for(const label of language==='es'?['Escuchar','Descubrir','Notas','Actividades','Referencias']:['Listen','Discover','Notes','Activities','References']){
    assert.ok(partTools.includes(`aria-label="${label}" title="${label}"`),label);
   }
   assert.match(reflectionPanel,/class="find-my-place"/);
   assert.match(reflectionPanel,/class="part-guide"/);
   assert.match(reflectionPanel,/part-guide-portrait[\s\S]*?character-avatar/);
   assert.match(reflectionPanel,language==='es'?/¿Necesitas un poco de ayuda\?/:/Need a little help\?/);
   assert.doesNotMatch(reflectionPanel.replace(/<[^>]*>/g,' '),/adventure|treasure|aventura|tesoro/i);
   assert.match(reflectionPanel,language==='es'?/Ver una pista/:/Show a clue/);
   assert.doesNotMatch(panel,/Show a clue|Ver una pista|Open activities|Abrir actividades/);
   assert.match(panel,language==='es'?/Puedes escuchar, dibujar o guardar una idea/:/You can just listen, draw or keep a thought/);
   assert.match(reflectionPanel,language==='es'?/>Actividades</:/>Activities</);
   const sharingPart=linkedMeeting.parts.find(part=>part.id==='part-8');
   const chooser=renderToStaticMarkup(React.createElement(PartActivities,{meetingId:linkedMeeting.id,part:sharingPart,quiet:false,onChoose:()=>{}}));
   assert.match(chooser,language==='es'?/Actividades para esta parte/:/Activities for this part/);
   assert.match(chooser,language==='es'?/Conecta las ideas/:/Connect the ideas/);
   assert.match(chooser,language==='es'?/Bingo de palabras/:/Word bingo/);
   const otherWeek=renderToStaticMarkup(React.createElement(PartActivities,{meetingId:'meeting-2026-10-26',part:sharingPart,quiet:false,onChoose:()=>{}}));
   assert.match(otherWeek,language==='es'?/Conecta las ideas/:/Connect the ideas/);
   const noSupplied=renderToStaticMarkup(React.createElement(PartActivities,{meetingId:linkedMeeting.id,part:{...linkedPart,activities:[]},quiet:false,onChoose:()=>{}}));
   assert.equal((noSupplied.match(/<button/g)??[]).length,3);
   assert.doesNotMatch(noSupplied,/Spot the clue|Encuentra la pista/);
   const quietChooser=renderToStaticMarkup(React.createElement(PartActivities,{meetingId:linkedMeeting.id,part:sharingPart,quiet:true,onChoose:()=>{}}));
   assert.equal((quietChooser.match(/<button/g)??[]).length,2);
   assert.match(quietChooser,language==='es'?/Conecta las ideas/:/Connect the ideas/);
   assert.doesNotMatch(quietChooser,/Word bingo|Bingo de palabras/);
   const quietTalk=renderToStaticMarkup(React.createElement(PartActivities,{meetingId:'weekend-2026-11-02',part:{...sharingPart,type:'PublicTalk'},quiet:true,onChoose:()=>{}}));
   assert.match(quietTalk,language==='es'?/Conecta las ideas/:/Connect the ideas/);
   const detailedMeeting=localizeMeeting(readPublishedMeeting('midweek','2026-10-26'),language);
   for(const id of ['part-1','part-2','part-4','part-5','part-6','part-8']){
    const item=detailedMeeting.parts.find(part=>part.id===id);
    const detailPanel=renderToStaticMarkup(React.createElement(MeetingPartView,{
     meetingId:detailedMeeting.id,part:id==='part-2'?{...item,title:'Custom gems title'}:item,partIndex:detailedMeeting.parts.indexOf(item),
     material:detailedMeeting.material,profile:testProfile,totalParts:detailedMeeting.parts.length,
     engagement:'quiet',presentation:'standard',onOpenMaterial:()=>{}
    }));
    const summary=detailPanel.match(/class="part-summary">([^<]+)</)?.[1];
    assert.match(detailPanel,/class="part-title-link" href="https:\/\/www.jw.org\/finder\?/);
    assert.doesNotMatch(detailPanel,/href="jwlibrary:/);
    assert.match(detailPanel,language==='es'?/wtlocale=S/:/wtlocale=E/);
    assert.equal(summary,item.summary.replace(/&/g,'&amp;').replace(/'/g,'&#x27;'));
    if(id==='part-2'){
     assert.match(detailPanel,/class="spiritual-gems-question"/);
     assert.match(detailPanel,language==='es'?/comparación con el enebro/:/juniper-tree comparison/);
     assert.match(detailPanel,/bible=24048006/);
     assert.match(detailPanel,/docid=1200002555&amp;par=4/);
    }
    const referencePanel=renderToStaticMarkup(React.createElement(PartReferenceLinks,{part:item,material:detailedMeeting.material}));
    if(item.type==='Demonstration')for(const reference of item.references)assert.ok(referencePanel.includes(reference.url.replace(/wtlocale=E/,`wtlocale=${language==='es'?'S':'E'}`).replace(/&/g,'&amp;')));
    if(item.type==='CongregationBibleStudy')assert.match(referencePanel,/docid=1102025914/);
   }
   for(const compact of [false,true]){
    const sources=renderToStaticMarkup(React.createElement(PartReferenceLinks,{part:linkedPart,material:linkedMeeting.material,compact}));
    assert.match(sources,/href="https:\/\/www.jw.org\/finder\?[^"]*bible=24046013-24046024/);
    assert.match(sources,/docid=202026258/);
    assert.match(sources,language==='es'?/wtlocale=S/:/wtlocale=E/);
    if(!compact)assert.match(sources,language==='es'?/Abrir en JW Library/:/Open in JW Library/);
    assert.match(sources,/target="_blank"/);
    assert.equal((sources.match(/<a /g)??[]).length,(sources.match(/class="official-link-pair"/g)??[]).length);
    assert.doesNotMatch(sources,/href="jwlibrary:/);
    if(compact)assert.match(sources,language==='es'?/Textos bíblicos y publicaciones/:/Scriptures and publications/);
   }
   const publication=renderToStaticMarkup(React.createElement(PartReferenceLinks,{part:{...linkedPart,references:[{label:'Publication chapter',url:'https://www.jw.org/finder?pub=lmd&docid=1102023301&par=5'}]},material:linkedMeeting.material}));
   assert.match(publication,/https:\/\/www.jw.org\/finder\?pub=lmd&amp;docid=1102023301&amp;par=5/);
   assert.match(publication,/Publication chapter/);
   const officialLinks=renderToStaticMarkup(React.createElement(OfficialLinks,{url:'https://www.jw.org/finder?docid=202026258&par=5'}));
   assert.match(officialLinks,/href="https:\/\/www.jw.org\/finder\?docid=202026258&amp;par=5&amp;wtlocale=/);
   assert.equal((officialLinks.match(/<a /g)??[]).length,1);
   assert.match(officialLinks,/href="https:\/\/www.jw.org\/finder/);
   assert.match(officialLinks,language==='es'?/Abrir en JW Library/:/Open in JW Library/);
   const nativeSource=renderToStaticMarkup(React.createElement(OfficialLinks,{url:'jwlibrary:///finder?bible=43003016-43003018',webUrl:'https://www.jw.org/en/library/'}));
   assert.equal((nativeSource.match(/<a /g)??[]).length,1);
   assert.match(nativeSource,/href="https:\/\/www.jw.org\/finder\?bible=43003016-43003018/);
   const exactFallback=renderToStaticMarkup(React.createElement(OfficialLinks,{url:'https://www.jw.org/en/library/',webUrl:'https://www.jw.org/finder?docid=202026258&par=5'}));
   assert.match(exactFallback,/href="https:\/\/www.jw.org\/finder\?docid=202026258&amp;par=5&amp;wtlocale=/);
   assert.equal((exactFallback.match(/<a /g)??[]).length,1);
   const bibleLinks=renderToStaticMarkup(React.createElement(BibleReferenceLinks,{reference:language==='es'?'Juan 3:16–18':'John 3:16–18'}));
   assert.match(bibleLinks,/href="https:\/\/www.jw.org\/finder\?[^"]*bible=43003016-43003018/);
   assert.equal((bibleLinks.match(/<a /g)??[]).length,1);
   assert.doesNotMatch(bibleLinks,/bible-web-fallback|jwlibrary:/);
   const webOnly=renderToStaticMarkup(React.createElement(OfficialLinks,{url:'https://www.jw.org/en/library/'}));
   assert.doesNotMatch(webOnly,/jwlibrary:/);
   assert.equal((webOnly.match(/<a /g)??[]).length,1);
   for(const name of ['listen','discover','notes','references','clue','thought','question','heart','connect']){
    const icon=renderToStaticMarkup(React.createElement(IllustratedIcon,{name}));
    assert.match(icon,/class="illustrated-icon"/);
    assert.match(icon,/aria-hidden="true"/);
   }
   data.set('mj-circuit-visit:2026-10-26',JSON.stringify({enabled:true,overseerName:'Visiting Overseer',midweekTitle:'My own title'}));
   const visitSettings=renderToStaticMarkup(React.createElement(CircuitVisitSettings,{weekOf:'2026-10-26'}));
   assert.match(visitSettings,/My own title/);
   assert.match(visitSettings,/Visiting Overseer/);
   assert.match(visitSettings,language==='es'?/Nombre del superintendente de circuito \(opcional\)/:/Circuit overseer name \(optional\)/);
   const speakerMeeting=getMeeting('weekend','2026-10-19');
   const speakerForm=renderToStaticMarkup(React.createElement(LocalPartTitles,{meeting:{...speakerMeeting,parts:speakerMeeting.parts.filter(part=>part.type==='PublicTalk')}}));
   assert.match(speakerForm,language==='es'?/Nombre del orador \(opcional\)/:/Speaker name \(optional\)/);
   assert.match(visitSettings,language==='es'?/Guardar programa de la visita/:/Save visit programme/);
   assert.match(visitSettings,language==='es'?/Fecha de la visita/:/Visit date/);
   assert.match(visitSettings,/type="date" required="" value="2026-10-27"/);
   assert.match(visitSettings,language==='es'?/reunión de entre semana pasa al martes/:/midweek meeting moves to Tuesday/);
   assert.match(renderToStaticMarkup(React.createElement(CircuitAssemblySettings)),language==='es'?/Fecha de la asamblea/:/Assembly date/);
   assert.match(renderToStaticMarkup(React.createElement(ConventionSettings)),language==='es'?/Viernes de inicio de la asamblea regional/:/Convention opening Friday/);
   const connections=renderToStaticMarkup(React.createElement(ConnectIdeas,{meetingId:'meeting-2026-10-19',partId:'part-8'}));
   assert.match(connections,language==='es'?/Conecta las ideas/:/Connect the ideas/);
   assert.equal((connections.match(/data-connection-source=/g)??[]).length,4);
   assert.equal((connections.match(/data-connection-target=/g)??[]).length,4);
   assert.match(connections,/<svg class="connection-lines"[^>]*aria-hidden="true"/);
   assert.doesNotMatch(connections,/connection-source-picker/);
   const generalConnections=renderToStaticMarkup(React.createElement(ConnectIdeas,{meetingId:'weekend-2026-11-02',partId:'public-talk'}));
   assert.match(generalConnections,language==='es'?/Ayudas generales para escuchar/:/General listening prompts/);
   assert.match(generalConnections,language==='es'?/no se puntúan/:/not scored/);
   assert.equal((generalConnections.match(/<button/g)??[]).length,8);
   for(const kind of ['midweek','weekend']){
    const visitProgramme=applyCircuitVisit(getMeeting(kind,'2026-10-26'),globalThis.localStorage,language);
    for(const part of visitProgramme.parts.filter(part=>part.id.startsWith('co-'))){
     const namedPanel=renderToStaticMarkup(React.createElement(MeetingPartView,{meetingId:visitProgramme.id,part,partIndex:0,material:visitProgramme.material,profile:{gender:'boy',ageGroup:'teen',name:'',style:'classic-boy'},totalParts:visitProgramme.parts.length,engagement:'guided',presentation:'standard',onOpenMaterial:()=>{}}));
     assert.match(namedPanel,language==='es'?/Orador: Visiting Overseer/:/Speaker: Visiting Overseer/);
     const talkTools=renderToStaticMarkup(React.createElement(StudyTools,{meetingId:visitProgramme.id,part,teen:true,quiet:false,onDraw:()=>{},onWrite:()=>{}}));
     assert.match(talkTools,/talk-listening-kit/);
     assert.doesNotMatch(talkTools,/comment-builder|sentence-starters|rehearsal-controls|pick-the-point|paragraph-tracker/);
    }
   }
   const programme=localizeMeeting(getMeeting('weekend','2026-10-25'),language);
   const renderPart=part=>renderToStaticMarkup(React.createElement(StudyTools,{meetingId:programme.id,part,teen:true,quiet:false,onDraw:()=>{},onWrite:()=>{}}));
   const talk=renderPart(programme.parts.find(part=>part.type==='PublicTalk'));
   assert.doesNotMatch(talk,/comment-builder|sentence-starters|rehearsal-controls|pick-the-point/);
   assert.match(talk,/talk-listening-kit/);assert.match(talk,/scripture-spotter/);
   const study=renderPart(programme.parts.find(part=>part.type==='WatchtowerStudy'));
   assert.match(study,/comment-builder/);assert.match(study,/pick-the-point/);assert.match(study,/rehearsal-controls/);
   if(language==='es'){
    assert.match(study,/Elegir perdonar|Personas que buscan la paz/);
    assert.match(study,/Preparar un comentario/);assert.doesNotMatch(study,/Rehearse aloud|Pick a point to keep/);
   }
   const reading=getMeeting('midweek','2026-10-28').parts.find(part=>part.type==='BibleReading');
   const prediction=renderToStaticMarkup(React.createElement(ListeningActivities,{meetingId:'meeting-2026-10-26',part:reading}));
   assert.match(prediction,language==='es'?/Antes de la lectura/:/Before the reading/);
  }
  const today=new Date(),dateKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  for(const language of ['en','es']){
   data.set('mj-language',language);
   data.set('mj-meeting-choice',JSON.stringify({type:'weekend',date:'2026-10-25',chosenOn:dateKey}));
   const weekendHome=renderToStaticMarkup(React.createElement(App));
   assert.doesNotMatch(weekendHome,/home-bible-links|chosen locally|se eligen en cada congregación/);
   data.set('mj-meeting-choice',JSON.stringify({type:'midweek',date:'2026-10-21',chosenOn:dateKey}));
   assert.match(renderToStaticMarkup(React.createElement(App)),/home-source-details/);
  }
  const assemblies=[{date:'2026-11-21',type:'circuit-overseer',programme:'2026-2027'},{date:'2027-03-14',type:'branch-representative',programme:'2026-2027'}];
  const convention={date:'2026-07-24',programme:'2026'};
  const meetings=[...assemblies.map(assemblyMeeting),...conventionDates(convention.date).map(day=>conventionMeeting(convention,day))];
  for(const record of assemblies)data.set(`mj-circuit-assembly:${record.date==='2026-11-21'?'2026-11-16':'2027-03-08'}`,JSON.stringify(record));
  data.set('mj-convention:2026-07-20',JSON.stringify(convention));
  for(const meeting of meetings){
   data.set('mj-meeting-choice',JSON.stringify({type:meeting.kind,date:meeting.eventDate,chosenOn:dateKey}));
   for(const language of ['en','es']){
    data.set('mj-language',language);
    const markup=renderToStaticMarkup(React.createElement(App));
    assert.match(markup,language==='es'?/Asamblea/:/Assembly|Convention/);
    assert.doesNotMatch(markup,/Week of |Semana del /);
    assert.match(markup,language==='es'?/sustituye a ambas reuniones/:/replaces both congregation meetings/);
    const map=renderToStaticMarkup(React.createElement(StoryJourneyMap,{meeting,current:meeting.parts.length-1,onSelect:()=>{},onBack:()=>{},listView:()=>null,companion:React.createElement('span',null,'Companion')}));
    assert.match(map,/has-day-sessions/);
    assert.match(map,language==='es'?/Mapa del programa de la tarde/:/Afternoon programme map/);
    assert.doesNotMatch(map,/morning-music/);
    assert.match(map,/class="map-companion-cursor/);
    assert.ok(map.includes(`data-journey-stop="${meeting.parts.length-1}"`));
    for(const part of localizeMeeting(meeting,language).parts.filter(part=>!['Song','Music','MusicVideo'].includes(part.type))){
     const tools=renderToStaticMarkup(React.createElement(StudyTools,{meetingId:meeting.id,part,teen:true,quiet:false,onDraw:()=>{},onWrite:()=>{}}));
     assert.match(tools,/talk-listening-kit/);
     assert.doesNotMatch(tools,/comment-builder|paragraph-tracker|rehearsal-controls/);
     if(part.type!=='PublicTalk')assert.match(tools,language==='es'?/Sigue esta parte del programa/:/Follow this programme part/);
    }
   }
  }
 }finally{
  globalThis.localStorage=previousStorage;globalThis.window=previousWindow;globalThis.sessionStorage=previousSessionStorage;await server.close();
 }
});
