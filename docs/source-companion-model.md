# Official-source companion model

Meeting Journey is an independent guide that accompanies JW Library. It is not a replacement, mirror, reader, or distribution channel for official meeting material.

## Product boundary

- Keep meeting navigation, attention prompts, movement choices, notes, drawings, confirmations, and original artwork in Meeting Journey.
- It is fine to show our own concise programme titles, section labels, and companion outline so the user knows where they are.
- Keep official publication text, images, videos, audio, and artwork in JW Library or on JW.org.
- Store official URLs and references as links; do not scrape, cache, or reproduce official page content in the app.
- Use the JW Library Finder URL for the app handoff and the JW.org workbook URL for the web handoff.
- Do not use JW.org/JW Library logos or imply endorsement or affiliation.
- User notes and drawings remain local to the device unless a future feature obtains separate, explicit permission for sharing.

## User flow

1. Meeting Journey shows the current meeting part and an original, short companion prompt.
2. The user chooses **Open in JW Library** or **Open on JW.org**.
3. The user returns to Meeting Journey when ready.
4. The app asks what happened, for example: “I listened or sang along”, “A word or verse stood out”, or “I saved a thought to return to”.
5. The selected confirmations are saved against the meeting and part on the device. They are voluntary and are not treated as scores or proof that a source was opened.

## Implementation rule

The API exposes meeting metadata and official URLs only. It must not fetch official pages on behalf of the frontend to extract headings, paragraphs, images, or other publication content.

Official terms: https://www.jw.org/en/terms-of-use/

This is a product and engineering boundary, not legal advice. Review the current official terms before adding imports, sharing, or publishing features.
