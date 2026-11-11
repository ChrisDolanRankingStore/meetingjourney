# GitHub to SmarterASP deployment

Meeting Journey includes a Node.js deployment target in `node-app/`. Use this target for the SmarterASP Linux/Node.js hosting package. Legacy C# source remains for reference, but its project files and solution are excluded from Git to avoid the shared builder selecting .NET. Existing local copies are retained; a fresh clone is intended for the Node runtime, not a .NET build.

## SmarterASP website settings

In SmarterASP, open the `meetingjourney` website and configure the Node.js runtime as follows:

| Setting | Value |
| --- | --- |
| Node version | Node.js 24 LTS |
| Framework | Other |
| Application folder | `.` |
| Startup file | `server.js` |
| Health check path | `/health` |
| Build command | `npm run build` |

The application folder must be the repository root, not `src/MeetingJourney.Api`. The root `package.json`, `server.js`, `railpack.json` and `.dockerignore` configure the Node.js build. Enter `npm run build` as the build command and `npm start` as the start command in the Git deployment panel. After deploying, confirm the log detects Node, not Dotnet.

The root startup file loads an optional host-managed `.env` beside `server.js` before importing the application. Existing process environment variables take precedence, including an explicit `MJ_ADMIN_ENABLED=false`. SmarterASP can save settings as this file without injecting them into Node's environment. Keep it private, outside `node-app/public` and all public aliases; never commit or bundle it. Restart Node after saving changes. A missing file is allowed; an unreadable file fails startup rather than silently ignoring settings.

## Deploy from GitHub

1. Connect the SmarterASP website to `ChrisDolanRankingStore/meetingjourney`.
2. Select the `main` branch.
3. Set the application folder and startup file above.
4. Deploy/rebuild from the SmarterASP website panel.
5. Start or restart the Node.js application after the upload finishes.

The build script installs and builds `src/MeetingJourney.Web`, then copies its Vite output into `node-app/public/`. The Node server serves that frontend and the same-origin `/api/...` routes.

Railpack's final `deploy.inputs` **replaces** the Node provider's default deployment layers: it retains the `packages:mise` Node runtime files and copies only the root startup file/manifests, root production dependencies and `node-app/` from the build (including its generated public client, private admin modules/assets and planner script). Do not use a `...` spread here, an unfiltered build layer, or build-step `deployOutputs` as a substitute: in Railpack 0.23, the provider has already added a whole-workspace layer and `deployOutputs` does not remove it. Frontend sources, original PNG artwork, the duplicate frontend `dist/` and frontend build dependencies are build inputs, not runtime output. `.dockerignore` also excludes Git history, private admin data, environment files and local staging folders from the build context. Exporting the entire build workspace can exceed the hosting platform's **1 GiB compressed-package limit**, even when the application builds successfully. Do not remove the Node runtime layer or root runtime dependencies: administration requires `jose` and the platform-specific `sharp` package.

The app's scene artwork uses WebP first, with JPEG fallbacks, from `src/MeetingJourney.Web/public/assets/compact-v1/`; portraits use WebP. Preserve both scene formats, filenames and responsive dimensions when optimising. The build regenerates legacy derivatives through `prepare-assets.mjs`, so changes to their compression should be made in that generator rather than only modifying its output. Deployment filtering avoids shipping the original PNGs and multiple copies without lowering image quality.

Automatic programme metadata for authorized WOL access requires outbound HTTPS to `wol.jw.org` and an explicit personal-use choice in the app. After confirming, the app requests `/api/meetings/current?type=midweek&date=2026-11-02&import=personal`: a successful import has `programmeMetadata` and individual item titles. Without that query choice the server returns reviewed/bundled outlines only and does not request WOL. If outbound access or parsing fails, the API returns an explicit general-programme notice and logs the cause; existing local notebooks are not cleared.

GitHub Actions now validates and packages the Node target in `.github/workflows/build-node.yml`. SmarterASP's native GitHub deployment remains the deployment path for the Linux site; uploading .NET DLLs with FTP does not start a Node application.

## Verify the deployment

Open these URLs after SmarterASP reports the Node app as running:

- `https://meetingjourney.com/health` should return JSON with `"status":"ok"`.
- `https://meetingjourney.com/` should show the Meeting Journey app.

If `/health` returns an Nginx 404 or `/` returns 403, the Node app has not started or the website is still pointing at the wrong application folder. Check the Node application status and startup log in SmarterASP.

## Cloudflare

Point the hostname at the DNS target supplied by SmarterASP. Keep HTTPS enabled in Cloudflare. Once `/health` works, open the site in Safari and use **Add to Home Screen** to test it as a phone app.

## Protected artwork administration

The Node backend provides a separate `/admin` workspace and `/api/admin/...` API. Both are **disabled by default**, including on direct hosting URLs. Optional Gemini automation discovers upcoming subjects and prepares private prompt drafts. Image generation and the drawing-tool preset picker are not implemented yet.

### Cloudflare Access setup (required before enabling)

1. In Cloudflare Zero Trust, create a **self-hosted Access application** covering both `meetingjourney.com/admin` (including subpaths) and `meetingjourney.com/api/admin` (including subpaths). Use the same application/AUD for both path groups. Include any alternate hostname or redirect it to the canonical hostname. Do not protect only the HTML page: the API and private images need the same protection.
2. Connect an identity provider that supports MFA. Allow only specific administrator accounts, require MFA in both the identity-provider policy and Access policy, and set a short Access session (15 minutes recommended; no more than one hour). Do not use a public email-domain rule, Bypass, Everyone, one-time email PIN as the sole factor, or service-token access for this application.
3. Configure the environment variables below in the host's private Node environment settings, not source files, browser JavaScript or the uploaded public folder.
4. Confirm outbound HTTPS from the Node host to your team domain's `/cdn-cgi/access/certs`. The server uses Cloudflare's rotating signing keys and validates RS256 signatures, issuer, application audience, subject, token age/expiry, application-token type and its own explicit administrator allowlist. Email headers alone are never trusted.
5. Test in an incognito browser: unsigned requests, another account and the direct hosting URL must not expose the workspace or API. Complete an actual MFA sign-in and verify it succeeds. **Local tests cannot verify your deployed Cloudflare policies or MFA enforcement.**
6. Restrict origin access at the host/firewall or use Cloudflare Tunnel if supported. Keep origin TLS valid and use Cloudflare Full (strict), not Flexible. Server-side JWT checks remain required even with an origin restriction.

Required environment variables:

- `MJ_ADMIN_ENABLED=true` (leave unset to disable administration).
- `MJ_ADMIN_ACCESS_ISSUER=https://YOUR-TEAM.cloudflareaccess.com`.
- `MJ_ADMIN_ACCESS_AUD`: the 64-character hexadecimal Application Audience tag from Access.
- `MJ_ADMIN_ORIGIN=https://meetingjourney.com`: the exact public HTTPS origin, without a trailing slash.
- `MJ_ADMIN_EMAILS`: a comma-separated explicit allowlist of administrator sign-in addresses (maximum 20).
- `MJ_ADMIN_DATA_DIR`: an absolute path to a **persistent, private directory outside the web root**, retained across deployments. On Linux, restrict directory access to the Node account (`0700`). SQLite stores draft images, review state and audit records here. Never place it in `node-app/public`, a public alias, or an upload staging folder.

Install root production dependencies with `npm ci --omit=dev` on uploaded deployments. Native Git builds normally install these from the root lockfile. Back up the private data directory using a SQLite-aware backup or while Node is stopped; do not copy only the main database during live WAL writes. Check disk space and protect backups with the same access restrictions.

If sign-in succeeds but the workspace cannot load, open `/api/admin/artwork` while signed in. Database initialization failures show a sanitised storage diagnostic to verified administrators (for example `EACCES`, `EROFS` or `SQLITE_CANTOPEN`); anonymous/public requests never receive these details. The original exception remains in Node stderr under `Administrator request failed.`, not in the web access log. An absolute path alone does not establish that the Node process can access it. Use private persistent storage outside the directory replaced by Git deployment; do not fix write failures by making it public or setting permissions to `777`.

### Review and publication

The selector includes Treasures talks, Congregation Bible Study and Watchtower studies from reviewed meeting files, plus Treasures/Watchtower metadata discovered by the optional planner below. Discovered metadata is **not an approved outline**: the administrator must open its official source and confirm source accuracy before approving a concept. Discovery never changes published meeting outlines or children's notebooks. Congregation Bible Study concepts remain manual.

1. Select a private Gemini suggestion or create a safe positive theme and scene description, choosing simple, detailed or manga-inspired outlines. Sensitive titles must be reframed rather than depicted literally.
2. Open the source, review child safety and source accuracy, then **Approve concept**. Copy its prompt and generate an original image separately. Gemini prompt planning does not generate images.
3. Upload a PNG, JPEG or WebP (up to 8 MB, 256-4096 pixels per side, at most 16 million pixels). The server rejects SVG/animation and re-encodes accepted images as metadata-free PNGs. This checks file safety, **not visual child safety**.
4. Inspect the finished image, confirm both reviews again, then **Approve exact image**.
5. **Publish approved image** separately. Publication is tied to the exact image hash and the human-reviewed source snapshot. Changes to a reviewed outline, or changes detected in discovered metadata on its next successful refresh, stop public delivery of affected images until renewed review. Remote sources are not fetched on every image request. Replacing the image removes image approval/publication; editing the concept removes both approvals and its image. Stale browser revisions cannot overwrite a newer review. Reject / withdraw removes it from future public responses.

### Optional Gemini prompt automation

After securing administration, configure these **private host environment variables** and restart Node:

- `MJ_ARTWORK_AUTOMATION_ENABLED=true`.
- `MJ_GEMINI_API_KEY`: a dedicated Google Gemini API key. Never paste it into chat, commit it, put it in browser settings or upload it to the public directory. Restrict it to the Gemini API, and restrict outbound/server IPs where supported.
- `MJ_GEMINI_MODEL=gemini-3.1-flash-lite` (default). Choose an available text model with structured JSON output; model availability, pricing and quotas depend on your Google project. No image-generation API is called.

The planner checks on server startup and approximately daily while Node is running (an hourly timer checks a persisted due time). Each week it adds the newly reachable week four Mondays ahead and catches up missing items in the intervening three weeks, prioritising the furthest week. For example, on 10 November 2026 its window is 16, 23 and 30 November and 7 December.

For each week it prefers reviewed local themes; otherwise it reads dated English programme metadata from official WOL pages. Missing publications, changed page formats and wrong-week responses are shown as issues, never replaced with guessed subjects. Only titles, reference labels and short context are sent to Gemini, not article paragraphs, notes, drawings, administrator identities or credentials. Review Google's data-use terms for your chosen account/tier before enabling it.

One text request per new/changed subject asks for three distinct concepts (simple, detailed and manga-inspired). Structured output is validated, and fixed local child-safety/originality rules are added to each prompt. Ambiguous responses are retained as manual-review issues and are not repeatedly billed for unchanged sources/model. **AI filtering is not a child-safety guarantee.** Concepts and images still require separate explicit human review and publication.

The private SQLite database stores sources, run state, per-source/model completion markers, generated drafts and daily request counts. Restarts and manual checks do not duplicate completed batches or overwrite administrator edits/approvals. A lease prevents concurrent schedulers; interrupted runs become eligible again after 20 minutes. There is a hard cap of **12 Gemini requests per UTC day**, including failed requests; each has a 45-second timeout and a bounded response/output size. This limits requests, not a monetary amount. Configure provider quotas/billing alerts too. The review queue has a 500-draft limit; a full queue is reported, not silently discarded.

The workspace shows last/next check, target weeks, request count and issues. **Check upcoming themes now** triggers a bounded background check; refresh the queue afterwards to load its drafts. Provider failures remain visible and retry on the next daily run, or after a manual check following configuration repair.

Sleeping/recycled web hosts cannot guarantee timer execution. For reliable unattended checks, schedule this command **daily** in the hosting control panel using the same private environment and persistent data path:

```powershell
node node-app\scripts\plan-artwork.mjs
```

The uploaded package includes this script. It shares the same lease, duplicate prevention and request cap with the web process. Nonzero exit status indicates reported issues or a failed run; inspect its private output. A daily host task ensures missing material is retried and weekly four-week-ahead planning does not depend on a browser visit. A run interrupted between the provider response and committing its draft batch can incur a repeat provider charge, but cannot create duplicate batches.

Only published images are returned by `/api/colouring/<meetingId>/<partId>` and `/api/colouring/images/<id>.png`. Draft images exist only behind `/api/admin`. A future drawing preset picker will consume this feed; no images are offered in the drawing tool yet. Withdrawal cannot erase copies a user has already downloaded.

Administrative responses use `no-store`, a restrictive CSP, same-origin mutation checks and a per-identity request limit. The service worker never intercepts or caches administration routes, including escaped versions, and removes legacy admin cache entries. If an older worker controls the page, administration requires a confirmed network-only worker update before fetching private records; an update failure leaves the workspace closed without clearing journals or public offline resources. Every content mutation and its review snapshot is recorded atomically with the draft revision in the private SQLite audit log. This is an application audit trail, not a tamper-proof external log; the host and database administrators can alter it.

For emergency revocation, disable the account in Access/your identity provider **and** remove it from `MJ_ADMIN_EMAILS` and restart Node (or set `MJ_ADMIN_ENABLED=false`). A previously issued token can otherwise remain valid until expiry. Do not log, share or commit Access JWTs, signing credentials or private review data.
