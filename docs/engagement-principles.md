# Meeting Journey engagement principles

Meeting Journey is designed to support attention, processing and participation. It is not a treatment or a diagnostic tool. The principles below turn accessibility guidance into product behaviour that can be tested with young people, parents and congregation members.

## Product decisions

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

Simple, Standard and Reflective views change the amount of writing and reflection. Guided and Active activities add prompts without making participation compulsory. The companion character is a reversible visual preference, not a performance or identity label.

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
