# Meeting Journey 0.5.1 — Portrait refresh

The deployed 0.5.0 package was confirmed live. Existing saved profiles were still mapped to the original portrait set, and original pictures appeared first in the chooser. This patch moves legacy default companions to the prepared illustrations and shows prepared looks first. Explicit choices made after the migration are respected. Existing diverse original looks remain available rather than being silently replaced with another identity; use Me to select a new complete look.

- New profiles default to prepared artwork. Names, meeting positions, notes and drawings are preserved.
- Character-image URLs include an artwork revision, preventing an immutable browser cache from retaining a replaced image.
- Offline preparation and the service worker now use the same release cache.
- Worker registration bypasses the HTTP script cache.
- Settings includes Refresh app and character images. `/refresh.html` provides the same recovery flow for an older installed app.
- Recovery checks the live app server first, then clears only Meeting Journey public file caches and replaces its root service worker. It never clears IndexedDB or localStorage. Other apps' caches and worker registrations are kept.

Upload the contents of `publish-node`, restart Node, then open `https://meetingjourney.com/refresh.html` and tap **Update app / Actualizar app**. Reopen the installed app. Settings shows 0.5.1. The new complete looks are first in **Me**.

No new image generation was needed.
