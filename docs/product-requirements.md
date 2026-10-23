# Meeting Journey — Working Requirements

## Product promise

“Follow the meeting, discover meaningful thoughts, and find your place whenever your attention wanders.”

Meeting Journey supports attention to the meeting rather than competing with it. A user must be able to follow a complete meeting without completing an activity.

## Audience

The application is for children, teenagers and adults, including people with ADHD, autism, attention difficulties or sensory sensitivities. It must remain welcoming to everyone and must never infer ability from age, diagnosis or presentation preference.

## Independent preferences

### Presentation

- **Simple Explorer:** large icons, short questions, one principal action and minimal text.
- **Standard Explorer:** the default balanced experience with outline, prompts and notes.
- **Reflective Explorer:** calmer, mature presentation with more room for notes and scripture connections.

### Engagement

- **Quiet Mode:** no automatic prompts, minimal animation and no attention reminders.
- **Guided Mode:** one optional listening objective or reflection per part.
- **Active Mode:** optional observation, key-point and comment-preparation activities.

These preferences must be independently selectable.

## Meeting experience

- Follow the actual meeting programme and original part sequence.
- Provide a clear visual journey and quick reconnection after distraction.
- Keep interaction optional and place it at natural pauses or transitions.
- Do not require registration for the initial experience.
- Avoid unnecessary interaction during talks, videos and readings.
- Support inexpensive weekly content publishing from approved programme references.

## Doodle notes and drawing

The reusable drawing component must support mouse, touch and stylus input on phones, tablets and desktop computers.

Phase 1 includes:

- Freehand pen, adjustable sizes, colour selection and highlighter.
- Eraser, undo, redo and confirmed clear.
- Text notes alongside editable drawings.
- Multiple pages per meeting part.
- Automatic saving and restoration after refresh or navigation.
- Offline saved drawings.
- IndexedDB storage of editable stroke data rather than flattened images only.
- Correct scaling after resize or orientation change.
- Full-screen tablet mode.
- PNG export.
- Blank and lined starter pages initially.

Phase 2/3 adds mind-map and clue-worksheet templates, combined note/drawing export and the full Discovery Book.

## Guided Discovery

Guided Discovery is an optional presentation layer and does not replace the three presentation preferences.

Each mission may contain:

- Short title.
- Main listening objective.
- Up to three on-demand clues.
- Optional icon or picture.
- Scripture reference.
- Optional answer suggestions.
- Drawing or note-taking activity.
- Personal discovery prompt.

Phase 1 includes one three-level clue mission per meeting part. Clues never appear automatically during a talk, are never graded, have no timer, do not reward speed, and never show failure messages. The user can skip or return to drawing at any time.

Reusable activity types:

- Spot the Clue.
- Connect the Ideas.
- Draw Your Discovery.
- My Thought Bubble.
- Clue Cards.
- My Discovery Book.

Connect the Ideas and the full Discovery Book are later-phase features.

## Admin content editor

Administrators need fields for mission title, listening objective, three clues, reference link, drawing template, answer options, meeting part and presentation-level suitability. Missions require preview and approval before publication and must be duplicable.

AI-assisted clue generation is not part of Phase 1. If added later, every clue must be reviewed before publication and must not invent details about a talk, video or demonstration.

## Accessibility and UX rules

- Large, understandable controls.
- Friendly, encouraging language.
- No failure, speed or falling-behind states.
- No automatic interruptions.
- Quiet Mode hides missions without deleting notes.
- Saved content is scoped to the correct meeting and meeting part.
- Drawing must not capture touch gestures intended for scrolling outside the drawing surface.
- Full-screen drawing must be easy to open and close.

## Phase 1 acceptance criteria

1. A user can draw with a finger, stylus or mouse.
2. Drawings survive refresh and navigation.
3. Undo and redo work.
4. Drawings remain editable.
5. Saved drawings work offline after the meeting is loaded.
6. A child can reveal all three clues independently.
7. Clues do not appear automatically during a talk.
8. Missions can be skipped.
9. Quiet Mode hides missions without deleting notes.
10. Every saved drawing belongs to the correct meeting and part.

## Phase 1 implementation status

The first runnable slice includes the responsive React/TypeScript PWA client and ASP.NET Core API, a curated sample meeting with all nine numbered parts plus opening, living and closing elements, journey-map navigation, presentation and engagement preferences, IndexedDB notes, a Konva editable doodle canvas, and the optional three-level clue flow. The client falls back to the bundled sample meeting when the API is unavailable.

## Later phases

- Phase 2: authenticated admin content management, authoring, duplication, review and publication workflow.
- Phase 2/3: advanced drawing templates, matching activities and the full Discovery Book.
- Phase 3: deeper accessibility/personalisation and export/delete controls.
- Phase 4: assisted clue generation with mandatory human review.
- Phase 5: authorised content-provider integration only; no production scraping.
- SQLite persistence for curated/admin content when the authoring surface is introduced.
