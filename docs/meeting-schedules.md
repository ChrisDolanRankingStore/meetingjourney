# Meeting choice and weekly content

The header opens a small Midweek / Weekend and date picker. Congregation days can be set there or in Settings. Defaults are Wednesday and Sunday; both can be changed to any local weekday. Automatic chooses the nearest meeting day (including today). Date calculations use the device's local calendar, with a Monday-based publication week. The app checks the date on return from another app and every minute while open.

A manual selection is remembered for the current local day, allowing preparation and review. The next day returns to Automatic. The picker also has an explicit Automatic action. Meeting choice and day settings stay on the device.

**Update app / Actualizar app** is a normal button at the top of Settings. It opens the existing `/refresh` flow to replace app files and cached images without clearing the journal. Journal export/import and the version remain in the journal section below.

The weekend journey has opening, public talk, study song, Watchtower study and closing stops. Public talk titles and locally selected songs are not guessed. Original prompts support listening, optional three-level clues, writing, drawing and reflection. Official study links use JW finder document IDs when a dated entry is known.

**Settings > Your meeting details** stores an optional speaker name with each non-song part, alongside its local title. Names appear on the part card, notebook/tool heading, outline and painted route, and remain exactly as entered when switching English/Spanish. Clearing the name removes it without changing the title or notebook. Assembly/convention parts also accept speaker names, but their published titles cannot be replaced. Older title-only and song records remain supported; speaker details are included with device settings in local journal backups and are never uploaded.

Notes, editable drawings, preparation and position remain keyed by meeting ID. The existing October 19 midweek ID is retained. The weekend uses a different ID for the same publication week. Changing a meeting remounts its workspace so old component state cannot save into the new meeting. Previously saved weeks can be opened through the date picker.

## JW Library and Bible links

The successful WOL programme-import notice appears only on the first Home view on a device. It is not repeated in the journey or meeting picker, or after returning/reloading. Refresh-failure notices and other programme information remain visible. On phones, opening a saved discovery replaces its gallery, map or list and browsing controls with a full-height scrollable detail view and a persistent close button; closing restores the previous view and keyboard focus.

**Connect the ideas** is available through Activities for every meeting part, including public talks and Quiet mode. Reviewed bilingual connections take priority; otherwise clearly labelled general listening prompts connect an idea, scripture, quality or action to something familiar, new, applicable or worth thinking about. There is no scoring or expected audience response. Each part keeps its own connections and personal example on the device.

Each source has a single **Open in JW Library** link using the official HTTPS `/finder` app-link route, retaining publication/document IDs, paragraphs, media IDs and the meeting language (`E` / `S`). Supported devices can hand it to JW Library; without the app it remains a working web link. There is no separate web button or installation-detection timer. Pages without a known Library identifier remain web-only instead of presenting a misleading app button.

Bible links preserve the requested verse or complete verse range, including passages crossing chapter boundaries. Comma-separated verses have separate links; whole-chapter ranges expose each chapter rather than silently dropping later chapters. Full English and Spanish Bible book names are recognised. A chapter uses verse `000`; verses use the eight-digit book/chapter/verse finder identifier.

Notebook writing and study drafts detect references immediately as the text changes; no save, space or Enter is required. Common English/Spanish abbreviations, optional spaces and abbreviation periods, and colon or dot chapter/verse separators are accepted: `Jn3.16`, `Jn. 3:16`, `John 3:16`, `1Jn4.8`, `2Cor8.2-4` and `Sal37.4`. Saved-note scripture links use the same parser. Equivalent references are deduplicated; links appear below the editor rather than replacing the user's text. Scripture text is not downloaded or displayed inline.

Song metadata includes verified document IDs for all 164 songs in both languages, alongside the original web pages. Regenerate titles and identifiers using `node node-app/scripts/refresh-song-catalog.mjs`; it validates each official song page before replacing the bundled catalogue. No publication text is copied. Notes, drawings and source return check-ins retain their existing notebook IDs.

App handoff requires JW Library to be installed and the device/browser to permit supported app links. Automated checks verify exact link targets and bilingual rendering, not successful opening of a native app; physical iOS/Android testing is still required.

## Circuit overseer visits

In **Settings** or the header meeting picker, use **Circuit overseer visit > Visit date** to enter any date in the visit week, enable the visit and save the programme. Future visits can be saved without changing the meeting currently being viewed. **Saved visits** lists stored dates for editing or disabling. The extra parts appear only when the selected meeting belongs to a saved visit week.

A visit covers Tuesday through Sunday: Automatic uses Tuesday for the midweek meeting and Sunday for the weekend meeting, without changing the congregation's saved usual days. Manual choices within a visit week use those same dates.

The midweek visit talk replaces the Congregation Bible Study. The weekend programme has the overseer's public talk, the usual study song, a 30-minute Watchtower study, a separate 30-minute concluding talk, and the closing song. Each talk has an optional personal title and its own notes and drawing pages. Like other public talks, these talks provide listening tools, not audience-comment preparation.

The saved visit also accepts an optional circuit overseer name, shared by all three visit talks in that week. Edit or clear it in the visit settings; it does not replace the ordinary public talk speaker, carry into another week, or change any talk/notebook ID. Older saved visits open with a blank name.

Visits are device-only, scoped to the Monday-based publication week, and included when journal backups restore device settings. Separate `co-midweek-talk`, `co-public-talk` and `co-concluding-talk` part IDs prevent visit notes from overwriting the regular Bible study or public talk. Turning a visit off restores the usual outline without deleting either set of notes; turn it on again to reopen the visit notebooks. Edit these three titles in the visit settings rather than the ordinary local-title editor.

## Assemblies and conventions

**Settings** and the header picker store congregation-specific event dates on this device. Both the normal midweek and weekend meetings are replaced during an event week. Automatic selects the assembly, or the next convention day (Friday, Saturday, then Sunday); normal days resume the following week. Manual dates within an event week open the event instead of a cancelled meeting. The convention picker also offers its three day buttons.

Full-day routes and discoveries split into **Morning / Afternoon** at the afternoon music presentation. Maps scroll with generously spaced stops instead of squeezing the whole programme into one viewport; list view uses the same session. Global stop numbers, saved place and notebook IDs are preserved.

- **Circuit assemblies:** save a Saturday or Sunday and select either the circuit-overseer or branch-representative programme. Both reviewed 2026–2027 programmes are bundled, covering the September 2026–August 2027 service year. Each includes all published programme stops, songs and individual symposium sub-talks.
- **Three-day convention:** save its opening Friday. The 2026 “Eternal Happiness” programme has separate Friday, Saturday and Sunday journeys and notebooks. Other years are explicitly rejected until their own reviewed programme is added; the 2026 schedule is not silently reused.

Dates can be saved ahead or for retrospective notes. Dates are editable through their saved entry; remove an incorrect assembly first before changing its type/date, avoiding accidental notebook relabelling. Removal never deletes notes or drawings. Saving the same date/programme again reopens them. Visits, assemblies and conventions cannot overlap in the same week; the app asks the user to remove/disable the conflicting event first.

Every event/day/talk has a stable independent notebook ID. Event preferences, notes and editable drawings are included in local journal backups. Programmes and original listening prompts work offline; official programme pages and exact question wording open separately on JW.org/JW Library. Assembly review-question numbers are matched to relevant talks, with scripture references, original listening goals and a personal answer/sketch action. They do not generate answers or audience comments. Symposium sub-talk start times/durations are not invented: only the published group start is shown on its first stop.

Event outlines group the main items under **Programme**, not **Public talk**. Individual cards distinguish talks, symposium parts, baptism talks, experiences, Watchtower summaries, the chairman's address, video/music presentations, review and songs. Only the actual public Bible discourse is classified as a public talk. Listening tools remain available for spoken/video items without enabling congregation-study comment preparation. Category changes preserve existing meeting and part IDs and all saved notebooks.

Programme metadata and Spanish titles checked against these official sources on October 27, 2026 (titles, order, times and links only; not talk text or official artwork):

- [2026–2027 circuit-overseer programme](https://www.jw.org/finder?wtlocale=E&docid=1102027246) and [review questions](https://www.jw.org/finder?wtlocale=E&docid=1102027247)
- [2026–2027 branch-representative programme](https://www.jw.org/finder?wtlocale=E&docid=1102027242) and [review questions](https://www.jw.org/finder?wtlocale=E&docid=1102027243)
- 2026 convention: [Friday](https://www.jw.org/finder?wtlocale=E&docid=1102026194), [Saturday](https://www.jw.org/finder?wtlocale=E&docid=1102026195), [Sunday](https://www.jw.org/finder?wtlocale=E&docid=1102026196). Equivalent Spanish sources use `wtlocale=S`.

## Weekly catalogue maintenance

`node-app/meeting-catalog.js` is shared by the Node endpoint and bundled client. The browser requests `/api/meetings/current?type=weekend&date=2026-10-25` (or midweek). Only responses matching the requested ID, type and week are accepted; an old server returning a fixed midweek response cannot overwrite the selection. Successful matching responses are kept locally. The bundled outlines also work offline. The service worker caches API requests by their complete URL and prefers the network.

This is not an automatic publication importer. Dated entries have been checked for the weeks of October 19 and October 26, 2026. Later weeks deliberately show a clearly labelled general outline with the correct week and links to official publication indexes. They never reuse a previous week's title or song number. The local public talk topic is unknown. Weekly content needs a maintained catalogue or a future reviewed content management flow; do not claim universal live weekly coverage.

When enriching an existing outline, preserve its part IDs to keep notes and drawings attached. A future change of the programme structure requires explicit migration rather than silently discarding saved part IDs.

Sources checked October 25, 2026 (outline metadata and links only; no article text or official images imported):

- [Meeting format](https://www.jw.org/en/library/brochures/jehovahs-will/meetings-of-jehovahs-witnesses/)
- [October 19–25 midweek programme](https://www.jw.org/en/library/jw-meeting-workbook/september-october-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-October-19-25-2026/)
- [October 26–November 1 midweek programme](https://www.jw.org/en/library/jw-meeting-workbook/september-october-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-October-26-November-1-2026/)
- [October study dates](https://www.jw.org/en/library/magazines/watchtower-study-august-2026/)
- [Study document 2026522](https://www.jw.org/en/library/magazines/watchtower-study-august-2026/An-Appeal-on-the-Basis-of-Love/)
- [Study document 2026523](https://www.jw.org/en/library/magazines/watchtower-study-august-2026/Cherish-the-Privilege-of-Fearlessly-Rendering-Sacred-Service/)

## Device review

On a real iPad/Android tablet, check header picker opening and dismissal, custom days, both journeys, switching while the notebook is open, saved discoveries when switching back, offline launch, date rollover and returning from JW Library. Build and data tests do not replace this visual/device check.
## Updating weekly material in version 0.3.0

The running Node server now checks `node-app/content/midweek-YYYY-MM-DD.json` and `weekend-YYYY-MM-DD.json` before using the bundled fallback. The date is the Monday of the publication week. Each file wraps a complete meeting in `{ "approved": true, "reviewedAt": "YYYY-MM-DD", "meeting": { ... } }`.

Use an existing reviewed file as the structural example. Keep meeting and part IDs stable. Update official links, dates, song numbers, paragraph counts and original cues only after checking them. Do not copy article text or official artwork. Validate with `node node-app/scripts/publish-week.mjs path/to/file.json --check`; omit `--check` to write it into the local content directory. Upload the resulting single file to the same directory on the host. The API reads it on the next request; no app rebuild or server restart is needed for a content-only update. The app refreshes on launch, return to the window and periodically while open.

The first known Watchtower studies include reviewed paragraph-range cues and counts. For studies without reviewed counts, the user can set the paragraph total locally. The public talk topic remains locally editable. Full publication text importing, native store packaging and device reminder delivery are not included in this release.

### Automatic programme metadata

Import is off until the user checks the personal-use confirmation and chooses **Confirm and enable import** on Home or in Settings. The explanation identifies Meeting Journey as an independent focus aid for neurodivergent users, not a replacement for JW.org, JW Library or WOL. It describes server-mediated metadata retrieval and distinguishes user preference from publisher authorization. The checkbox is never preselected; users can continue with general notebooks. Settings can stop future imports without removing saved programmes or journal entries.

The choice is local to this device and excluded from journal backups. API requests without `import=personal` neither trigger WOL retrieval nor expose the shared server metadata cache; selected-meeting, month, detail, parts and journey routes all respect that distinction. Offline preparation uses the same choice. Confirming or stopping triggers an immediate refresh and cancels outstanding client requests. In-flight server retrieval may finish after a cancellation; stopping prevents subsequent requests rather than deleting previously imported programmes.

For authorized use of WOL metadata, the Node API now retrieves the selected week's programme when no reviewed or bundled dated outline exists. It checks the ISO publication week against WOL's returned date before reading the matching workbook or study. Only item names, numbers, timings, song numbers, Bible-reading headings and scripture/publication reference labels and links enter the programme. Article paragraphs, study questions, answers, illustrations and lyrics are not stored or returned. This metadata path does not generate reviewed connections or paragraph-based activities.

English and Spanish are fetched and checked together; switching language uses the corresponding titles and references without changing notebook IDs. Local public-talk details and opening/closing weekend songs are not guessed. General midweek notebooks retain their existing IDs when individual items arrive, including the first ministry/living item and the congregation study.

Completed programme requests are cached in server memory for 24 hours, with concurrent requests shared and failed requests limited to one retry per 15 minutes. Responses have time/size limits; unexpected or incomplete formats produce an explicit notice and log rather than mislabelling another week's programme. A previous complete server/browser copy is retained when refreshing fails. The browser's existing automatic refresh and local meeting cache provide subsequent offline access. First-time offline use still has only general notebooks. Month previews use already cached data rather than crawling every week.

The host must allow outbound HTTPS to `wol.jw.org`. No credentials or personal notes are sent. Reviewed files in `node-app/content` take precedence, so original approved activities can still be published separately. This integration relies on the operator's authorization; WOL is not an official public programme API, and upstream format changes can require a parser update.

The October 19 and 26 midweek JSON programmes also supply the bundled offline versions, so their topics, assignment references and Congregation Bible Study chapters do not revert to generic placeholders without a network connection. The October 26 gems stop includes an original prompt about Jeremiah 48:6 and a link to the specific research paragraph; the separate general Bible-reading discovery remains in its summary. The item panel displays the actual part summary instead of replacing it with an activity prompt. Gems cards use the stable part ID/section as well as a title fallback, so a changed or translated title does not hide the question. Titles, order, assignments and source IDs were checked against both official workbook pages on October 28; the app uses original summaries/prompts, not copied question text or generated answers. All existing meeting and part IDs are retained.

## Listening word bingo

The optional **Word bingo** activity uses 3×3 for child/preteen companions and 4×4 for teen/adult companions. Quiet Mode hides the activity. Tapping toggles a word; complete rows, columns and diagonals receive a static highlight. There are no scores, sounds or required completions.

Each part may supply original, reviewed vocabulary as `listeningWords: { "en": ["love", "forgive"], "es": ["amor", "perdonar"] }` (up to 40 short words/phrases per language). The board prioritises these, then familiar terms found in the part metadata, then common meeting vocabulary. The UI explains that not every word will be heard. Boards remain stable for the same metadata, age band and language. Taps stay on-device by meeting, part and language and are included in journal backups; they do not mark a part complete or create discovery chests.

Study guide cues may also include `pointChoices`, an array of exactly three original short phrases (maximum 300 characters each). The existing known study cues receive matching original choices from `node-app/study-guides.js`; weekly reviewed content may supply its own. These are optional ways to express what the user noticed, not automatically graded answers. Add Spanish UI translations for new public phrases. Unknown cues retain general prompts, clearly labelled in the app. Public talks never use the study comment builder.

## Weekend song details

On each weekend song card, choose **Song details** to enter the announced number and an optional song title. The same details are also available under **Settings > Your meeting details**. **Find the title in the official songbook** opens JW.org; the user enters the title on returning. There is no automatic lyric download or inferred song theme.

Entries use the existing device-only meeting preferences, scoped to the meeting ID and stable part ID. Cards, journey maps, discoveries and review labels use the saved title. Changing or restoring song details preserves notes and editable drawings. A local journal backup includes these preferences. Other weeks retain their own songs.

## English and Spanish (0.4.0)

A language choice is saved on the device as `mj-language`. Public programme fields are localized separately from journal records; stable meeting and part IDs stay unchanged. The offline song catalogue supplies the official English or Spanish title for a number without sending the chosen song to a server. New saved song entries use `titleMode: catalogue` unless the user explicitly chooses a custom title. Legacy custom song titles remain unchanged. See `docs/release-0.4.0.md` for the upload and metadata maintenance process.
