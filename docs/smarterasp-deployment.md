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

## Deploy from GitHub

1. Connect the SmarterASP website to `ChrisDolanRankingStore/meetingjourney`.
2. Select the `main` branch.
3. Set the application folder and startup file above.
4. Deploy/rebuild from the SmarterASP website panel.
5. Start or restart the Node.js application after the upload finishes.

The build script installs and builds `src/MeetingJourney.Web`, then copies its Vite output into `node-app/public/`. The Node server serves that frontend and the same-origin `/api/...` routes.

Automatic programme metadata for authorized WOL access requires outbound HTTPS to `wol.jw.org` and an explicit personal-use choice in the app. After confirming, the app requests `/api/meetings/current?type=midweek&date=2026-11-02&import=personal`: a successful import has `programmeMetadata` and individual item titles. Without that query choice the server returns reviewed/bundled outlines only and does not request WOL. If outbound access or parsing fails, the API returns an explicit general-programme notice and logs the cause; existing local notebooks are not cleared.

GitHub Actions now validates and packages the Node target in `.github/workflows/build-node.yml`. SmarterASP's native GitHub deployment remains the deployment path for the Linux site; uploading .NET DLLs with FTP does not start a Node application.

## Verify the deployment

Open these URLs after SmarterASP reports the Node app as running:

- `https://meetingjourney.com/health` should return JSON with `"status":"ok"`.
- `https://meetingjourney.com/` should show the Meeting Journey app.

If `/health` returns an Nginx 404 or `/` returns 403, the Node app has not started or the website is still pointing at the wrong application folder. Check the Node application status and startup log in SmarterASP.

## Cloudflare

Point the hostname at the DNS target supplied by SmarterASP. Keep HTTPS enabled in Cloudflare. Once `/health` works, open the site in Safari and use **Add to Home Screen** to test it as a phone app.
