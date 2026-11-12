# Meeting Journey: uniform icon set

## What we need

Create one coherent, original icon family for Meeting Journey, a calm meeting companion with drawing, notes, listening activities and an optional character companion. It is used by children, teenagers and adults. Icons should feel friendly and reassuring, not babyish, game-like or visually busy.

The app currently mixes small outline controls with painted activity and movement icons. Replace that visual mismatch with a consistent family. The files in this folder are **current references, not approved final designs**. Keep the existing meanings and filenames in `inventory.csv`; do not copy existing inconsistencies.

## Recommended visual direction

- Simple, softly rounded outlines, balanced shapes and generous negative space.
- One consistent stroke weight and optical size across the entire family.
- Warm and approachable, complementing the app's illustrated notebook and scenery without becoming miniature scenes themselves.
- Transparent backgrounds. No button rectangles, circles, borders, paper panels or scenery baked into the artwork.
- No gradients, shadows, textures, lettering or tiny decorative details.
- Use a single ink colour for the main set. Supply editable SVGs using `currentColor` so the app can apply normal, selected, disabled and high-contrast colours.
- Start with the existing deep ink blue `#163b5c`. The artwork must also work in black and white. Colour must not be the only way to distinguish functions.
- Keep save and download clearly different: save means keeping work on this device; download means exporting a PNG.
- The save control should work as a small icon beside "Save changes", without a boxed button appearance. Button styling belongs to the app, not the asset.

Before completing the family, submit six samples together: pen, highlighter, save, download, listen and a movement icon. This is a proposed direction for approval, not permission to redesign the app's navigation or behaviour.

## Technical specification

- SVG master for every icon, with `viewBox="0 0 24 24"`.
- Target stroke: 1.8 units, rounded line caps and joins. Adjust geometry for optical balance, not arbitrary per-icon stroke weights.
- Keep ordinary artwork within roughly the central 20 x 20 area; allow optical adjustment for diagonals and rounded shapes. Nothing may be clipped by the viewBox.
- Check legibility at actual sizes: 16, 20, 22, 24, 32 and 48 CSS pixels. Small controls currently display around 22px; activity icons around 48px; movement icons around 32px.
- Use paths/basic SVG shapes only. No scripts, external resources, embedded images, font dependencies, filters or animations. Do not outline text to hide lettering.
- Export a transparent 96 x 96 PNG preview for each SVG, in ink blue. SVG remains the production master.
- Keep alignment, internal spacing and visual weight consistent; a plus or arrow should not look much smaller or heavier than a pen or book.
- The app supplies at least 44 x 44px interactive targets and accessible labels. Do not enlarge the drawing to fill the whole tap target, embed labels in icons, or rely on hover for meaning.

## Required icons

The accompanying CSV lists 49 current references: 34 controls, nine activity icons and six movement icons. Prefixes distinguish repeated concepts in different existing families; visually identical replacements may share a master where their meaning is genuinely the same.

### Drawing, notebook and controls

- `control-pen`, `control-highlighter`, `control-eraser`, `control-smudge`, `control-fill`: recognisable, distinct tools; smudge means blending existing colour, not adding paint.
- `control-save`, `control-download`: local save and exported file respectively.
- `control-undo`, `control-redo`: matched opposite-direction arrows.
- `control-pages`: a stack of drawing pages; any page-number badge is added by the app.
- `control-note`: a note/document; also currently used for paper options.
- `control-trash`: clear/remove, not an eraser tool.
- `control-plus`, `control-close`, `control-more`, `control-check`, `control-chevron-down`.
- `control-expand`: currently reused for fitting/resetting the canvas and using available paper; do not imply deleting or stretching the saved drawing.

### Navigation, meetings and discoveries

- `control-home`, `control-route`, `control-treasure`, `control-settings`.
- `control-book`, `control-grid`, `control-list`, `control-calendar`.
- `control-back`, `control-next`, `control-external`, `control-music`, `control-clock`, `control-pin`.
- `control-heart`, `control-clue`: feelings and a clue/search-like discovery aid.

### Activity and companion actions

Redraw the painted references into the same visual language as the controls:

- `activity-listen`: listening; not a microphone or recording action.
- `activity-discover`: explore/notice something.
- `activity-notes`: write or draw a thought.
- `activity-references`: source material/open book.
- `activity-clue`: a gentle hint.
- `activity-thought`: a personal thought.
- `activity-question`: a question.
- `activity-heart`: feelings/care.
- `activity-connect`: connecting ideas; also currently used for Activities.

### Companion movement

Use the same simple, neutral human figure and proportions throughout. Show the difference through pose and a few clear motion marks, not expressions or elaborate scenes:

- `movement-fidget`: small hand/body movement.
- `movement-bounce`: bounce/jump.
- `movement-stretch`: gentle stretch.
- `movement-sway`: sway/rock.
- `movement-shake`: shake hands/arms/body.
- `movement-dance`: a relaxed dance pose.

These are optional comfort actions, not instructions to perform, fitness targets or reward badges.

### Additional embedded visuals to consider separately

The current app also draws a breathing ring, a spin arrow, a silent rotating fidget shape, a sparkle and an open/closed discoveries chest directly in components. These are **not included in the exported icon count**. Review them after the main family is approved:

- Breathing and spin graphics have interactive/animated behaviour; replacements must preserve that behaviour.
- An open/closed chest needs two aligned states if redesigned.
- Decorative foliage, connection lines, scene artwork, companion portraits and app-install icons are outside this icon brief.

## Content and tone

- Make every icon original; no copied publication artwork, branded UI glyphs or recognisable copyrighted characters.
- Use ordinary objects and neutral gestures, with no religious symbols invented for decoration.
- Do not add faces to the sun, plants, tools or other inanimate objects, or introduce false-god imagery.
- Avoid reward/score symbolism and anything suggesting an icon measures attention, understanding or achievement.
- Movement figures should be modestly dressed and non-stereotyped. Keep the brief focused on the intended positive subjects; do not add repetitive exclusion text to each icon prompt.

## Delivery

Place the approved replacements in `returns/svg/` using the requested filenames from `inventory.csv`, and matching PNG previews in `returns/png/`.

Also supply an editable master file if a design application was used, and one contact sheet showing the complete family on white, warm cream and dark backgrounds. Include examples at real 22px and 48px sizes, not just large presentation art.

Do not overwrite `reference-controls/` or `reference-painted/`. They document the current app. No replacement is installed in the application merely by being put in this handoff folder.

## Acceptance checklist

- Every CSV row has a corresponding SVG and PNG preview.
- The family looks like one set at actual mobile sizes.
- Save/download, pen/highlighter, undo/redo and all six movements remain distinguishable.
- No clipped strokes, baked-in backgrounds, labels or hidden external dependencies.
- Icons remain understandable with visible text labels and work in monochrome/high contrast.
- Normal, selected, disabled and keyboard-focus states can be supplied by the app without redrawing the assets.
- Existing actions and labels retain their meaning.

## Folder contents

- `BRIEF.md`: this designer/AI handoff.
- `inventory.csv`: current icon names, source references and requested return filenames.
- `reference-controls/`: exported current outline SVGs.
- `reference-painted/`: current painted activity/movement artwork converted to PNG for convenient reference.
- `returns/`: instructions and destination folders for the redesigned set.
