# Meeting Journey engagement principles

Meeting Journey is designed to support attention, processing and participation. It is not a treatment or a diagnostic tool. The principles below turn accessibility guidance into product behaviour that can be tested with young people, parents and congregation members.

## Product decisions

### Seasonal scenery integration (awaiting final location artwork)

Six supplied landscapes rotate by calendar week, with the same selection from
Monday through Sunday and a six-week cycle across year boundaries. Spring,
summer, autumn and winter use separate supplied artwork, not recoloured
versions of the old valley. Settings offers a device-local Northern/Southern
hemisphere choice, defaulting to Northern; no location permission or live
weather service is used.

The full landscapes are map/Home backgrounds. Five temporary framed locations
are derived from each matching landscape; separate location artwork is pending,
except Scene 1 spring, which now uses the six supplied preliminary standalone
views. These are draft artwork, not the final set.
The current week and hemisphere also select scenery for part guidance and
offline preparation. Offline packs cache only the selected set, not all worlds.
The main meeting background uses the current section's location, not the Home
overview: gate, riverside, bridge, village and garden. Consecutive items within
one section share that location; changing section changes the background.
An optional parchment handle above the card reveals the scenery on tap or a
downward pull. The collapsed strip keeps the current part title visible.
Scenery stays revealed through Previous/Next navigation; tap, upward pull or
Escape restores the panel. Content stays mounted while hidden. Pull gestures
are limited to the handle; tools hide it. Plain and neutral modes omit it.
No animation or automatic collapse is used.
A compact Map button opens the full meeting map from either the panel or the
revealed scenery, keeping the current meeting position.

PNG masters remain in the untracked artwork directory. Run
`node node-app/scripts/prepare-seasonal-artwork.mjs` to regenerate optimized
WebP/JPEG delivery images from the 24 extracted masters. Map and crop outputs
use 480/960/1600 delivery names without upscaling the native image resolution.
Standalone sources in `artwork/seasonal-views/scene-N-SEASON-VIEW.png` take
precedence over landscape crops. To rebuild just this draft, run
`node node-app/scripts/prepare-seasonal-artwork.mjs 1 spring`.
Release 0.5.13 includes the spring draft and Map button; deployment remains a
separate step.

### Colour fill and roomier drawing paper (0.5.10)

The drawing rail includes a paint-bucket Fill tool using the selected colour.
A tap fills one connected area; open outlines let the colour spread. Each fill
is one Undo/Redo action and stays editable in the device journal and local
backups. Previews and PNG exports replay the same operations. A fill remembers
its original paper bounds so extending the sheet does not spread old colour
into newly revealed paper.

Zoom ranges from 25% to 400%, including on an empty page. Zooming out reveals
usable paper instead of a border around a small sheet. Drawing beyond the
original bounds grows the saved paper without changing the current coordinate
scale or shrinking earlier marks. Two-finger gestures still roll back the
first contact's tentative stroke or fill.

Settings keeps a subtly filled parchment backing as well as its inset cards;
the outer panel is not left as an empty border over the painted scene.

### Matching phone chrome (0.5.9)

The browser theme hint, installed launch background, header, navigation and
outer page use matching parchment. Neutral and high-contrast choices update
the runtime theme hint and chrome colour without changing the saved journal.
The header reserves the top safe area; navigation keeps its bottom inset and
landscape layouts reserve side safe areas without covering the painted scene.
iOS uses the default readable status bar rather than forcing translucent
status-bar content. Browser/OS support determines actual system-bar tinting;
installed launch colours may update later than the page.

Slim parchment chevrons at the part view's left/right edges offer an alternative
to swiping without restoring the bottom navigation row or stop counter. Their
visual chevron is 24px wide and 80px tall with no panel behind it, inside a
44px-wide, 88px-tall target. Shapes overlap the paper and background without
narrowing the paper; a subtle outline shadow separates parchment on parchment. Previous is
unavailable on the first part; the final Next opens Review. They use the same
save-before-navigation path as swipes and disappear while a notebook/tool is
open. Text receives extra side clearance.

Home no longer repeats Reading comfort or Customise companion: both remain in
Settings. Its notice, current-place control and journey actions have consistent
12px separation, with matching 12px padding around the action panel so the
Preview and Meeting outline buttons do not touch its bottom edge.
A part's title is the official-material link when a source is
known, retaining keyboard focus and the return check-in without adding another
text action. All official source links share the HTTPS Finder handoff where a
publication, Bible or media identifier is available; this allows JW Library
opening and a web fallback without app-install detection or timed redirects.
Generic official landing pages remain ordinary web links when no precise
Library target is known. Local talks with no source do not get invented links.

Programme notices have a labelled 44px Close target. Dismissal is saved on the
device for the meeting and notice, shared across Home, parts and the picker,
including language changes. A different meeting or changed notice appears
again. Storage failures are shown and do not pretend dismissal was saved.

### Optional map companion and translucent paper (0.5.8)

The journey map companion can be dragged onto a stop to open it. Direct stop
buttons, List and Continue remain available; activating the companion without
dragging continues the current session. Invalid drops and Escape do not move
the user's place. Dragging near the map edges scrolls it. The cursor is absent
in List and neutral views, and does not store a position or journal entry.

Painted panels use subtly translucent paper backgrounds, not reduced text
opacity. Writing/drawing surfaces and modal tools retain their solid paper.
Plain, Calm, neutral and high-contrast modes keep their existing treatment.
The tool close/back button occupies its own header column with consistent
padding and a 44px target; the heading stays visible while scrolling.

### Preserve the notebook visual language (0.5.7)

Connect the ideas again shows both sets of choices with visible linking curves.
Users still choose an idea before an example; selection, deselection, Undo,
personal examples and a readable connection summary remain available. Curves
follow measured button centres after resizing or text enlargement instead of
assuming fixed-height labels. The lines are decorative; accessible button
states and the text summary communicate the same connections.

Listening styles are loaded with the app, and new comfort, parent-access,
backup and pause controls share the existing warm paper, ink and framed-button
treatment. Neutral and high-contrast preferences remain explicit alternatives.
Compact controls keep their size when icon hints are enabled: hints appear on
hover or keyboard focus, not beside the icons. Drawing tools retain their
compact rail and native hover titles. The history search has an explicit
four-sided border, internal padding and a visible focus outline.

### Optional attention supports (0.5.5)

Discovery and Review stamps represent kept thoughts, drawings, feelings,
comments or an explicit "I followed this part"; skipped parts are unlabelled
outlines, not negative results. Hide activity counts removes the entire strip.
Readiness remains an explicit choice after keeping a comment. "I said it"
updates that comment; the meeting's shared total is derived from these flags
so repeat taps, reopening and undo cannot double-count a contribution.

The optional elapsed bar measures foreground time, not attention or actual
speaker timing. It pauses when hidden or tapped, has no countdown, and is
removed by Hide activity counts. Show minutes is a separate opt-in. Reduced
motion uses 30-second steps. Song estimates are planned durations only.

Study imports retain paragraph totals, not paragraph text. The wcg chapter for
2 November yields eight prose paragraphs; review questions and pull quotes are
excluded. Content-specific lenses use extracted nouns with generic fallbacks.

### Calm part views (0.5.4)

Simple and Standard show one cue, one part-specific primary action and More.
Reflective retains the toolbox. References live in the References tool rather
than above the cue. Swipes and arrow keys change parts; the journey route
provides direct access. Navigation waits for journal writes and announces the
new place.

Opt-in imports extract a bounded bilingual noun vocabulary from cited passages
on the server. Only words and programme metadata reach the device; article and
verse text do not. Passage and familiar bingo words have distinct labelled
styles. Failed extraction is reported; familiar words remain available.

Release acceptance: 134 tests, production build and packaged runtime; 768px,
Simple/Standard/Reflective, neutral on/off, high contrast, 13 Next taps to Review.
Simple/Standard had at most two visible controls inside the part card. Entry JS
was 184.57 KB gzip; drawing is a separate 104.88 KB gzip chunk.
These are browser checks, not physical-device or screen-reader certification.

### Calm setup, self-regulation and portable journals (0.5.6)

First-run setup can be resumed after a refresh, and age/register choices use
plain, non-judgmental copy. Breathe and Spin are optional, hands-only pause
tools; Spin is unavailable with reduced motion. Neither activity tracks
attention or participation.

An optional four-digit parent code is a convenience gate for Settings, import
and restore, not encryption. It remains on the device and is never exported.
Backups keep stable record IDs and edit times so merge can add missing entries,
prefer newer edits and retain independently written study comments. Replace
everything is explicit, confirmed, and restores exported settings as well as
journal records; the parent code and import consent remain device-local.

Acceptance checks cover English and Spanish teen copy, reduced-motion pause
tools, parent-code storage and gating, merge and replace behavior, and the
production bundle's compressed size.

### Make the next step obvious

Every screen has one current meeting part, a short summary and a clear next action. The journey map is available when someone needs to understand the whole meeting, but the default view stays focused on the current part.

### Keep structure visible and predictable

The app shows the user's place, section, approximate duration and progress without turning progress into a score. Users can pause, move backwards, jump to another part or return to their place. Optional discovery clues are revealed only when requested.

The current item shows its reviewed topic and assignment summary, not a generic activity prompt in their place. Spiritual gems keeps its verse-specific original question prompt and research source visible alongside the general reading discovery. Ministry assignments and Congregation Bible Study retain their lesson/chapter references. The reviewed midweek metadata is also bundled offline; completing these details does not rename notebook IDs or change saved notes.

### Reduce competing demands

The companion outline and programme titles are available inside the app. Official source material opens through its JW.org finder link, which can hand off to JW Library where supported. Activities are optional. Quiet Mode leaves notes and drawings available while hiding optional prompts. Calm view reduces decorative intensity and motion without deleting content.

The homepage keeps one painted background with a compact meeting plaque and a clear Start/Continue action. The companion's optional guide panel groups navigation, notebooks and activities instead of leaving action bubbles over the scene. The panel traps keyboard focus, closes with Escape or a backdrop tap, and restores focus on dismissal. Quiet Mode still offers notes and drawings. Guide actions use the current meeting and selected part, so opening a notebook or returning to one's place does not start a second journey.

The current part continues that painted setting with readable parchment content and a visible companion helper. Help is optional: no automatic speech, prompts or movement. Clues and activities open only when chosen. Find my place is independently available beside the part duration and inside tools, closes the tool and focuses the selected part. The contextual activity chooser lists only implemented activities for that part; returning from an activity restores the chooser, and a notebook opened from Bingo returns to Bingo first. Quiet Mode hides clues and Bingo while retaining notebooks and the explicitly requested Connect the ideas activity. General connections are labelled as listening prompts, not reviewed answers.

### Support different kinds of attention

Simple collapses the listening guidance without hiding notebook tools; Standard opens the main guidance; Reflective also offers a reflection question. Quiet reduces suggestions while leaving activities available on request. Guided opens listening guidance, and Active adds a direct activity shortcut. All choices remain optional and retain the user's place. The companion character is a reversible visual preference, not a performance or identity label.

Everyday comfort is the first Settings group, with a quick Quiet toggle, three text sizes, optional hover/focus icon hints, a neutral notebook without scenery/companion, and hidden activity counts/completion feedback. Reading comfort is also available before companion selection and directly from Home. A companion is optional; skipping it does not create or overwrite a profile. Meeting administration, offline packs and backups are grouped separately. Settings uses a single scrolling surface instead of a fixed heading above a second short scroll area.

Notebook tools use native modal dialogs with inert background controls, a persistent close/back button and focus restoration. Swiping inside a dialog never changes the meeting part. Sentence starters insert without replacing existing or selected words and offer Undo; an insertion that exceeds the text limit reports an error without truncating the draft.

Connections use an idea-then-example choice with visible linking lines and a readable text summary. Each connection can have an optional personal example, can be removed or undone, and remains available through historical notebooks. Examples and connections survive local backup/restore. Activity totals, Bingo line feedback, scripture counters and meeting-review counts can be hidden without deleting their saved values. A separate, optional one-thing listening cue requires no written response or completion.

### Encourage interest without pressure

Activities invite noticing, drawing, connecting and remembering. They do not use countdowns, rankings, failure states or speed rewards. A response can be a word, symbol, sketch or question.

Optional listening word bingo has two sizes: 3×3 for children and preteens, 4×4 for teens and adults. Users tap and untap words they hear. A completed line gets a quiet static highlight, without scores or sound. Quiet Mode hides the activity. Vocabulary can be supplied per part in English and Spanish; common meeting words fill remaining cells, with a clear note that not every word may be heard. Selections stay on-device by meeting part and language.

Study parts offer three original listening points for known paragraph-range cues. A choice adds to the comment draft without erasing existing writing. Where specific options are unavailable, general listening lenses are explicitly described as prompts rather than a quiz. Keeping a comment does not announce readiness: the user separately chooses **Ready to comment**, which shows a clear, reversible badge. Marking a comment as shared removes its ready signal.

Public talks are listening-only. Their tools offer personal notes, sketches and scripture spotting, without audience comment preparation, readiness or sharing controls. Previously saved talk drafts and thoughts remain readable, but do not count as prepared study comments in the meeting review.

Before a Bible reading, users can optionally choose what they expect to notice, then reflect on what they heard afterwards. Up to two interest lenses can be selected in Settings; prompts use conditional wording when a person, place, animal or object might not be mentioned. Settings also allow a pause suggestion after every 3, 5 or 7 paragraphs, based on the user's par6agraph changes, with no automatic paragraph tracking or interruption. Quiet Mode hides these optional prompts. The pause view offers a silent shape that turns only when tapped; optional brief vibration is off by default and only used where supported.

Spoken comment rehearsal is explicit and uses only browser-reported installed offline voices in the chosen language. Personal text must never be sent to a remote voice service. If no suitable offline voice is available, speech is disabled and reading quietly remains available. Rehearsal has volume and stop controls, and stops when the text changes or the view closes. All new choices, drafts and readiness signals stay on-device and are included in local backup files.

### Give movement a safe place

The companion has optional, user-triggered movement actions: fidget, bounce, stretch, sway, shake and dance. They are silent, do not change progress, do not autoplay and settle automatically. The same actions are available to wheelchair companions. Calm view reduces visual intensity while still honouring an explicit movement request.

### Let the companion feel personal

The first-use profile now separates gender from age group and lets the user add a display name. The companion artwork uses distinct original storybook characters with different faces, skin tones, hair textures, hair colours, silhouettes and comfortable meeting clothes; gender is not communicated by colour alone. Teen users can choose a wider catalogue that includes Asian and African companions, slim, robust and fuller natural builds, and different hair styles. Optional look controls provide additional body-shape variants and accessories. These are cosmetic choices only: they do not assign ability, maturity, progress or behaviour to the user.

### Keep external memory close

Notes and editable drawings are saved locally by meeting and meeting part. The current part, source summary and optional doodle pad are available together so a user does not need to remember where a thought belongs.

## Evidence-informed rationale

These choices are informed by guidance that recommends predictable structure, visual supports, sensory adjustments, processing time, clear communication and reduced choice overload for autistic people, and by ADHD guidance that includes visual reminders and environmental adaptations. They are design hypotheses to validate with real users, not clinical claims.

- [NICE: autism support and key priorities](https://www.nice.org.uk/guidance/cg170/chapter/key-priorities-for-implementation)
- [NICE: ADHD recommendations](https://www.nice.org.uk/guidance/ng87/chapter/recommendations)
- [National Autistic Society: predictability and routine](https://www.autism.org.uk/advice-and-guidance/about-autism/preference-for-order-predictability-or-routine)
- [National Autistic Society: visual and communication supports](https://www.autism.org.uk/learn/knowledge-hub/professional-practice/speech-therapy)
- [National Autistic Society: sensory and school adjustments](https://www.autism.org.uk/advice-and-guidance/education/getting-help-at-school/what-can-my-autistic-child-get-support-with-at-school)

## Validation checklist

### Device-only personal data

All personal content belongs on the user's device: editable drawings, notes, reflections and feelings, personal study and preparation, avatar choices, accessibility preferences, congregation day settings and journey position. Keep it in device storage; do not add server accounts, cloud sync, personal-content upload endpoints, remote AI processing of personal content, or analytics containing this information. This is an explicit product requirement, not a temporary prototype limitation.

The server may distribute shared meeting outline metadata, official links and original app assets. Fetching those public resources must not include notes, drawings, feelings, avatar names or personal progress. Ordinary hosting/request logs are separate from saved personal content and must not capture it. Links to official external material leave the app and are governed by that destination.

Any future backup/restore must use a file the user explicitly exports or imports on their device. Do not introduce an automatic cloud backup. Clearing device website/app data may erase local discoveries; changing devices does not automatically transfer them. Describe these facts clearly in data controls without suggesting that a server copy exists.

### Story-card design contract

Use the supplied Meeting Journey App Infographic Mockup as the visual reference, together with the later request to keep the companion visible on meeting cards.

- One visible story card fits between the header and bottom navigation. The main meeting card does not require page scrolling.
- A large, fully visible companion belongs in the illustrated scene. Touching the companion reveals thought bubbles; the feelings action has a heart-shaped background with readable text.
- Each part has a title, a short listening prompt when enabled, and immediate access to Doodle, Note and the official JW Library finder link.
- Compact navigation and meeting tools use consistent line icons with translated accessible names, keyboard focus and at least 44-pixel touch targets. Primary actions retain text. A single background-free profile avatar sits in the bottom bar and extends slightly above it; no separate floating dock or header avatar duplicates it. Song details sit beside the primary action so the six meeting-tool icons fit one row on narrow phones.
- Finger swipes change the part; buttons remain available. Drawing gestures and notebook controls must not change the meeting part.
- The journey map shows labelled stops on an illustrated path. A simple list remains available.
- Clues are optional and revealed on request. Quiet Mode hides the clue action without removing personal notes or drawings.
- Drawing and writing share a notebook that can be closed and reopened. Its pages belong to the current meeting and part; resizing uses a stable drawing coordinate space.
- Movement is user-triggered and available to standing and wheelchair companions. It does not score participation or advance the meeting.

The current portrait renderer shares one SVG coordinate system for the portrait and accessories. Per-portrait anchors still require visual calibration at phone and tablet sizes. Hair and eye-colour changes need matching editable artwork layers; do not present those as finished through a tint over the face. Browser screenshot review and touch-device checks are required before calling the redesign complete.

Tablet is the primary target. In a wide tablet window, the open notebook and the companion occupy separate panes. In a narrower window, a shorter companion scene sits above the notebook. The companion must never cover the canvas, reflection choices or text input. Users can drag the companion horizontally within its scene, or move it with the left and right arrow keys when it has focus. These gestures are separate from meeting-card swipes.

On phones and narrow tablet windows, the notebook uses one short header with icon tabs and one six-icon drawing toolbar. Pen options, size, pages, paper, clear and export are revealed on demand, so page count and extra controls cannot push the canvas down into a thin strip. Each icon has a labelled accessible action and a 44-pixel touch target. The companion scene is compact while drawing; opening the companion's thoughts can temporarily expand it. Existing drawings can gain blank paper below their strokes without stretching or deleting their saved content.

The five meeting sections now have distinct original backgrounds: garden gate, riverside, bridge, village lane and quiet garden. The place label must describe the visible scene. Backgrounds change on navigation, without ambient animation. Matching scenes are fetched for offline caching after the meeting loads.

My Discoveries is an illustrated map of the same terrain. A chest represents actual saved words, a reflection or drawing pages from a meeting part; listening confirmations alone do not create chests. Hover or keyboard focus previews the contents, and tapping opens the notes and actual drawing pages. Additional drawing pages are included, rather than counting strokes as drawings. Each chest stays at its own meeting stop regardless of how many earlier stops have saved content. A brief opening animation respects Calm view and reduced motion. There are no locked chests, scores, speed rewards or required treasures.

The current meeting part is saved by meeting ID, so returning from the official material or refreshing restores the same place. Opening material never marks a part complete. A floating character over another native app is a separate future platform feature: Android has an opt-in native overlay API; iPhone has no equivalent general companion overlay. On supported iPads, side-by-side app windows are the practical approach. The web app itself does not draw over JW Library.

Test whether a user can answer these questions without adult help:

1. Where am I in the meeting?
2. What is happening now?
3. What can I do if I need less stimulation?
4. Can I skip this and come back later?
5. Where did my note or drawing go?

The next research step should be short, moderated usability sessions with autistic and ADHD young people, including users who prefer no character, low colour, larger text or no optional activities.
