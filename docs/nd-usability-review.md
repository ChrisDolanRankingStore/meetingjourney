# Neurodivergent usability and engagement review

Reviewed: 3 November 2026  
Application baseline: `c9abbe90c31dc50a484db1ef72beaade48fac7fe`

## Approved implementation follow-through

The five delivery phases below were approved for implementation. The updated
app now includes:

1. Draft-safe starter insertion and Undo, explicit length-limit errors, native
   modal notebook focus, persistent Close/Back and protection against meeting
   swipes inside tools.
2. Comfort-first settings, a Home comfort shortcut, pre-companion comfort
   options, grouped administration and a non-repeating Home import disclosure
   without changing consent.
3. Standard/Large/Larger text, larger supporting labels, optional icon names,
   accurate mode descriptions and distinct Simple/Reflective/Active behaviour.
   Settings uses one scrolling surface at enlarged text sizes.
4. An optional neutral notebook and Continue without a companion; optional
   hidden activity counts, Bingo completion feedback and review/prep totals.
   These settings do not delete stored content or infer support needs.
5. Sequential connection choices, selection state and Undo, optional examples
   per connection, labelled historical notebooks, title/reference/example search
   and remembered discovery view/history search within the current browser tab.

All changes retain English/Spanish support and existing notebook keys. New
connection examples and comfort/title preferences are included in editable
backups. The original findings below document the review baseline, not a claim
that these issues remain unchanged.

Validation includes automated regressions for preserved drafts and length
limits, neutral entry, hidden counters, translated controls, title/page labels
and backup round trips. The production build, all 132 tests and packaged runtime
smoke check pass. Browser checks cover Settings at the four viewport sizes listed
below, 200% root text at 320px with administration expanded, Spanish enlarged
labels, native-modal background focus blocking and focus restoration. Drawing
labels use a horizontally scrolling toolbar without narrowing the paper; both
labelled and compact layouts and paper options were checked at 320px.
Real Tab/Escape input was not verifiable in the hidden automation page; native
focus blocking and the dialog cancel-handler path were tested instead.

Sampled comfort-label text/background contrast minima were Journey 4.77:1,
Ocean 5.50:1, Meadow 4.97:1, Sunset 5.59:1 and High contrast 14.05:1. This is
a scoped computed-colour check, not an audit of every image-backed surface.
Physical-device, VoiceOver and participant co-design checks remain outstanding;
implementation does not constitute validation of clinical or learning outcomes.

## Overall conclusion

Meeting Journey has a useful foundation: optional participation, several ways to
express a thought, saved place, private notebooks and no competitive ranking.
Its purpose should remain **helping someone return to listening**, not keeping
them interacting with the app.

The next priorities are protecting existing writing, making notebook focus
behaviour predictable, putting comfort controls within easy reach and reducing
repeated setup text. Adding more activities is less important than making the
existing ones easy to choose, leave and resume.

This is an implementation and expert usability review, not a clinical
assessment, formal WCAG conformance audit or participant study. There is no
single neurodivergent preference profile. Recommendations are hypotheses to
validate with people with different sensory, attention, language and motor needs.
No numerical "ND friendliness" score is justified by the available evidence.

## Scope and evidence

Reviewed Home/onboarding, programme import, meeting navigation, notebook tools,
study support, listening activities, connections, Bingo, drawing, discoveries,
history, settings, backups and meeting review.

The implementation work preceding this review passed the production build, all
128 automated tests and the packaged runtime smoke check. Browser checks covered
320 x 568, 390 x 844, 768 x 1024 and 1024 x 768 CSS-pixel viewports.
These are browser emulations, not physical iPhone/iPad validation.

Observed checks included:

- Gallery, Map, List and History select the visible view, including when leaving
  history. The four targets measure 44 x 44 CSS pixels.
- Discovery heading-to-content gaps are 12px in all four views. No horizontal
  overflow was found in the sampled layouts.
- Saved discoveries open with reachable close/return controls and scrollable
  content at all four sizes.
- Historical notes, study drafts/comments and original drawing pages reopen for
  editing. Saves retain other stored fields and original record keys.
- Unsaved historical text can block navigation when discard is cancelled.
  Closing the editor restores focus to history search.
- New drawing strokes retain coalesced pointer samples; original strokes retain
  their prior rendering. Fast physical finger/stylus input still needs testing.
- Settings cards had consistent 18px padding in the sample. Fifteen rendered
  Settings text/control elements measured under 12px at the default base size.
  This is a readability concern, not a font-size-only WCAG failure.
- Keyboard focus could move from an open notebook tool into surrounding
  navigation. The source explicitly declares the tool non-modal.

## Strengths to preserve

- Activities, comments and finishing a meeting are optional.
- Drawing, writing, listening and association provide alternatives rather than
  requiring one form of expression.
- Saved place and private notebooks reduce memory demands.
- Connections remain available on request in Quiet mode and during public
  talks. General listening prompts are distinguished from prepared metadata.
- Public talks do not offer audience-comment preparation or sharing controls.
- Rehearsal uses available offline voices; haptics are opt-in.
- No countdowns, leaderboard or automatic judgement of readiness.
- English/Spanish support, local data and editable backups.
- Compact icons save space while retaining accessible names and selected states.

## Findings and recommended changes

### 1. Protect drafts from sentence-starter replacement

**Priority: next. Confirmed in source.**

[StudyTools](../src/MeetingJourney.Web/src/StudyTools.tsx) assigns a new draft when
a sentence starter is selected. Existing writing can therefore be replaced by a
single tap. This is especially costly when a user has worked hard to formulate
a thought. Listening-point choices already preserve the draft through an append
helper.

Recommend inserting at the cursor or appending without removing existing words,
with an undoable insertion. Do not silently truncate text at the field limit.

Acceptance: enter a draft, choose each starter and verify the original words
remain; cover English/Spanish, length limits, persistence and Undo.

### 2. Make notebook focus and modality agree with presentation

**Priority: next. Browser observation plus source confirmation.**

The notebook panel in [App](../src/MeetingJourney.Web/src/App.tsx) is explicitly
`aria-modal="false"`. Tab can reach the navigation and header behind/around it.
That is not automatically a focus-trap defect: non-modal dialogs may legitimately
allow this. However, the dialog-like presentation can make focus movement
surprising.

Choose a deliberate model. If a tool blocks the workspace visually, use a native
modal with an inert background. If intentional meeting navigation remains
available, keep it non-modal and provide a clear keyboard route between the
notebook and surrounding content. The native home-guide dialog is existing prior
art for the modal case.

Acceptance: appearance, announced modality and focus movement agree. Every tool
and nested drawing menu works with keyboard and screen reader. Escape and Close
restore an appropriate focus target. Do not trap focus without also providing a
clear exit.

### 3. Put comfort controls before administration

**Priority: next. Source-based usability recommendation.**

[Settings](../src/MeetingJourney.Web/src/App.tsx) places substantial scheduling,
import and offline configuration ahead of some comfort controls. The person
needing less stimulation must first process a long page.

Recommend an initial comfort group for reading, Quiet and visual detail, with
programme administration progressively disclosed. Make comfort controls reachable
before companion setup. Keep backup and recovery discoverable.

Acceptance: reach the principal comfort controls within two intentional actions
from the meeting and first-use entry. Changes preserve place and saved work.

### 4. Stop repeating the expanded import explanation

**Priority: next. Confirmed in source; impact needs user validation.**

The successful-import notice is now one-time, but
[ProgrammeImport](../src/MeetingJourney.Web/src/ProgrammeImport.tsx) independently
opens its full explanation whenever import is disabled. Returning Home can
therefore repeat a large block of setup copy.

Keep informed, explicit opt-in and the independent-companion explanation. After
first presentation, offer a compact optional entry with the full information
available on demand. Dismissing an explanation must never enable imports.

Acceptance: postponing import does not require rereading the expanded disclosure
on each visit. The user can still inspect the explanation, enable import and
stop future imports from Settings.

### 5. Align mode descriptions with visible behaviour

**Priority: soon. Source-based recommendation.**

Quiet is described as "No prompts", although some guidance remains and activities
are intentionally available on request. Guided/Active share much of their
current chooser; Simple/Reflective styling changes less than their descriptions
may suggest.

Describe concrete effects, such as "Fewer suggestions; activities available when
you choose". Define and test each mode's differences; merge modes if they do not
offer a meaningful distinction. Keep Connect the ideas available in Quiet mode.

Acceptance: each setting has a short, accurate preview. Switching modes does not
hide saved work or change the current meeting part.

### 6. Improve legibility without enlarging every button

**Priority: soon. Measured small text; contrast/resize audit outstanding.**

[Icon styles](../src/MeetingJourney.Web/src/iconActions.css) include captions
around .62-.7rem. Small supporting text and detailed painted backgrounds can
increase decoding effort.

Keep compact controls, but establish readable supporting text and an independent
text-size option. Measure contrast in each palette rather than relying on a
palette name. A 14-16px supporting-text target would be a product choice, not a
WCAG-mandated font size.

Acceptance: test 200% text enlargement, text-spacing overrides and narrow
reflow. Instructions, Save and Back remain reachable; contrast is measured.

### 7. Offer help with icon recognition, not permanent extra copy

**Priority: soon. Usability hypothesis.**

The requested compact discovery controls have accessible names and tooltips,
but tooltips are not a complete explanation for touch users.

Retain the compact default. Offer optional labels or a single dismissible legend.
Test whether first-time users recognise Gallery, Map, List and History without
guessing. Avoid recurring overlays.

### 8. Allow a neutral route without companion setup

**Priority: soon. Confirmed entry constraint; preference needs co-design.**

[App](../src/MeetingJourney.Web/src/App.tsx) requires a chosen companion before
the main experience. Personalisation can help engagement but also creates a
decision barrier. A neutral notebook may suit some users better.

Offer Continue without a companion, later customisation and a hide-companion
option. Do not infer support needs from age or appearance.

Acceptance: a new user can reach a usable notebook without appearance decisions;
changing presentation never changes journal contents.

### 9. Avoid turning listening into an output target

**Priority: soon. Design risk, not a demonstrated participant outcome.**

Bingo progress, scripture counts and saved-item totals are optional, but counts
can still feel like expectations. More taps or saved items are not evidence of
attention, understanding or spiritual engagement.

Offer a hide-counts preference and a low-demand "listen for one thing" route.
Review a user-selected thought rather than implying more entries are better.
Never remind someone to finish a board or catch up on missed words.

Acceptance: someone can use the app throughout a meeting without counters,
writing, completion requirements or pressure to share.

### 10. Keep connections personal and optional

**Priority: soon. Methodology recommendation.**

General category matching can scaffold noticing and association. A completed
connection does not establish comprehension. Prepared metadata and general
prompts must remain distinguishable.

Allow an optional word or sketch example and later revisiting one self-chosen
connection. Preserve use without typing, easy deselection and changing one's
mind. Do not score personal associations.

### 11. Continue spacing, history and recovery improvements

**Priority: later, with immediate attention to any reproduced clipping.**

The recent discovery fixes resolve the reported uneven row and clipped detail.
Very small historical drawing workspaces still have limited canvas height.
Historical editors can show record IDs when old programme titles are unavailable.

Recommend a shared spacing scale, optional expanded drawing workspace and cached
human-readable meeting/part labels. Distinguish meeting date from last-edited
date in history. Improve title/reference search and preserve useful view state.

Acceptance: repeat portrait, landscape, Spanish and enlarged-text checks on
every principal view. Original drawing page, visible exit and reachable actions
are preserved. A user can return after an interruption or official-library
handoff without reconstructing their place.

## Engagement methodology

The intended loop should be:

1. Choose one manageable focus.
2. Notice something while listening.
3. Optionally capture it in a preferred form.
4. Return to the speaker.
5. Revisit only if useful.

Drawing and notes externalise memory; connections can support association;
sentence starters can support expression; paragraph position can aid orientation.
Bingo can supply a selective-attention cue, but can also divide attention.
Movement and pauses support user-chosen regulation, not a prescribed treatment.

Offer these as alternatives, not simultaneous obligations. Do not infer
comprehension from a connection, attention from app interaction or success from
completed pages. A helpful meeting may result in less screen use and no saved
output. Meeting Journey remains a companion, not a replacement for official
material or a tool for monitoring attendees.

## Delivery order

1. Protect drafts and settle/test the notebook focus model.
2. Reduce repeated setup and surface comfort controls.
3. Validate text enlargement, contrast, mode descriptions and icon recognition.
4. Co-design optional neutral presentation and hidden counters.
5. Refine connections, historical labels and recovery based on observed need.

These were the baseline recommendations, not changes silently included in the
earlier history/drawing update. Their approved implementation is recorded above.

## Validation still required

- Physical iPhone/iPad: fast finger/stylus curves, undo/redo, palm/multi-touch,
  onscreen keyboard, landscape and safe areas.
- VoiceOver and keyboard/switch-compatible task flows, including nested tools.
- Measured contrast, 200% text enlargement and text-spacing/reflow checks.
- Explicit failure/retry cases and a backup/restore on a spare device.
- Short, voluntary sessions with users with varied preferences: enter a meeting,
  return after distraction, capture one idea and recover an old drawing.

Ask what felt effortful, distracting or reassuring. Assess task recovery and
perceived effort, not diagnosis, attendance or inferred attention telemetry.
No participant study, clinical outcome assessment or full accessibility
conformance assessment has been performed.

## Reference guidance

- [W3C Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/):
  predictable navigation, understandable content, memory support, customisation
  and participation by users.
- [CAST UDL Guidelines 3.0](https://udlguidelines.cast.org/):
  agency and alternatives for engagement, representation and expression.
- [WCAG 2.2 target-size minimum guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html):
  24px minimum with exceptions. The app's 44px comfort target is a separate
  product choice, not a claim that every smaller target fails WCAG.
