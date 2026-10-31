# Meeting Journey 0.4.0 — English and Spanish

- Choose English or Español during first use, in the companion chooser, or in Settings. Spanish device language selects Spanish initially; an explicit saved choice takes precedence.
- Navigation, meeting cards, original listening prompts, clues, drawing controls, notes, settings and public help/privacy pages have Spanish text. Dates use the selected language.
- Enter a weekend song number to see its official title immediately. The checked catalogue contains numbers 1–164 in English and Spanish, taken from the public official indexes. It contains titles and links only, not lyrics, recordings or artwork.
- Song titles work offline and automatically follow the app language. There is an explicit custom-title option; older manually entered titles remain custom and are preserved.
- Existing numbered midweek songs also display their official localized titles. Official finder links use wtlocale=S for Spanish. Song links use the actual localized URLs from the official index.
- Personal notes, drawings, names and custom titles are never translated or uploaded. Changing language preserves meeting and part IDs. Preferences are included in local journal backups.

## Upload

Upload all contents of `C:\Users\chris\source\repos\MeetingJourney\publish-node\` to the existing Node app root and restart Node after transfers complete. Close and reopen the installed web app. Settings > Your journal shows **0.4.0**; do not clear website data to update.

## Maintaining translations and song metadata

Translations live in `src/MeetingJourney.Web/src/data/spanishUi.json`; the original English interface text is the lookup key. New reviewed programme headings and original listening prompts must receive Spanish entries when they are added. Unknown future content retains its supplied text rather than inventing a translation or programme detail.

Run `node node-app/scripts/refresh-song-catalog.mjs` only when deliberately updating the public title/link catalogue, then review the changed metadata and run the tests. Ordinary builds and runtime song lookup make no requests to JW.org. Sources are recorded in `songCatalog.json`.

## Validation

Production TypeScript/Vite build; automated data, language, song-catalogue, source-link and journal-preservation checks; real React rendering checks for welcome, companion choice and home in both languages; packaged Node runtime checks. No interactive browser surface was available for a visual tablet review in this session.
