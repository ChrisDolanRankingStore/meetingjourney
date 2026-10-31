# Meeting Journey 0.5.0

## Meeting language

The EN/ES selector is available in the meeting header. The choice is stored locally for the current meeting and as the default for that meeting type. English midweek and Spanish weekend meetings can therefore coexist, including in later weeks. A saved choice for an older meeting takes precedence over the current default. Language does not create a different journal or change meeting/part IDs.

## Companion choices

The chooser uses age ranges only: 5–10, 11–12, 13–19, 20–34, 35–39, 40–59 and 60+. Appearance choices are numbered; gender, developmental-stage and comparative body-shape labels are not displayed. Adult age ranges each include standing and wheelchair options.

The app now renders a complete portrait as one image. The prepared looks include glasses, tablets, phones and ministry bags drawn into the illustration. These are preset combinations selected by choosing the picture; independent accessory and colour-placement controls have been removed. This prevents glasses or devices drifting when the person is resized or moved. Existing original looks remain available. Stored legacy profile fields and all journal data are preserved.

Source sheets and the crop manifest are retained in `artwork/companions-source/`. Only compact individual WebP portraits ship in the runtime package. See `docs/companion-artwork-prompts.md` for the built-in generation prompt set.

## Sunday study links

For reviewed dated weekend meetings, fallback links on the opening and public talk cards and in the outline now open the actual Watchtower study finder link, with the selected JW language. Older cached links to the generic meeting-explanation page are repaired on display. A locally selected known song continues to open that song. Future weeks still need their reviewed study metadata supplied; an unknown document ID is never guessed.

## Upload

Upload all contents of `C:\Users\chris\source\repos\MeetingJourney\publish-node\`, then restart Node and reopen the installed app. Settings shows **0.5.0**. Do not clear website data as part of updating.

Validation includes the production build, automated meeting-language and journal-preservation checks, source-link checks, real React rendering in both languages, source-portrait presence checks and packaged runtime checks. Individual portrait crops were visually inspected in a contact sheet. No interactive tablet/browser surface was connected for a live layout inspection.
