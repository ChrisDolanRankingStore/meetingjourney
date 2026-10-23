# Meeting Journey

Meeting Journey is a standalone responsive web application/PWA that helps people follow a congregation Bible meeting, reconnect when attention wanders, and record meaningful discoveries.

This project is intentionally separate from AffiliateTrafficFactory and Site Building Factory. It has its own API, web client, data model and deployment path.

## Technology

- ASP.NET Core and C# API
- React and TypeScript client
- Progressive Web App shell with an offline cache
- IndexedDB for editable offline notes and drawing stroke data
- Konva-backed drawing surface for mouse, finger and stylus input
- Accessible, responsive interface for phone, tablet and desktop

## Phase 1

1. Meeting outline and part navigation.
2. Simple, Standard and Reflective presentation preferences.
3. Quiet, Guided and Active engagement preferences.
4. Basic freehand doodle notes with local persistence.
5. Editable drawing pages with pen, colour, highlighter, eraser, undo, redo and clear.
6. One optional three-level clue mission per meeting part.
7. Skip, save and resume behaviour without failure states.

The full product brief supplied for this project is reflected in [the working requirements](docs/product-requirements.md). Phase 1 intentionally uses a curated sample meeting and does not scrape or copy publication content.

## Run the API

```powershell
dotnet run --project src/MeetingJourney.Api/MeetingJourney.Api.csproj
```

In a second terminal:

```powershell
cd src/MeetingJourney.Web
npm.cmd install
npm.cmd run dev
```

Set `VITE_API_BASE_URL` if the API is not running at `http://localhost:5080`. If the API is unavailable, the client starts from its bundled sample meeting and keeps local notes/drawings usable offline.

## Phase 1 delivered

- Opening, all nine numbered parts, Living as Christians and closing elements.
- Journey map with section grouping, part selection and previous/next navigation.
- Simple, Standard and Reflective Explorer presentation preferences.
- Quiet, Guided and Active engagement preferences; Quiet hides activities without deleting notes.
- Local notes stored in IndexedDB and restored by meeting/part.
- Editable drawing pages with pen, colour, highlighter, eraser, undo, redo, clear confirmation and PNG export.
- Optional three-level clue mission with independently revealed clues and no score, timer or failure state.
