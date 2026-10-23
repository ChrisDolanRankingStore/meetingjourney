# GitHub to SmarterASP deployment

Meeting Journey includes a Node.js deployment target in `node-app/`. Use this target for the SmarterASP Linux/Node.js hosting package. The old ASP.NET Core project remains in the repository for reference and local development, but it is not the runtime for the Linux site.

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

The application folder is the repository root. The root `package.json`, `server.js` and `railpack.json` force the shared builder to use Node.js even though the repository still contains the legacy C# project.

## Deploy from GitHub

1. Connect the SmarterASP website to `ChrisDolanRankingStore/meetingjourney`.
2. Select the `main` branch.
3. Set the application folder and startup file above.
4. Deploy/rebuild from the SmarterASP website panel.
5. Start or restart the Node.js application after the upload finishes.

The build script installs and builds `src/MeetingJourney.Web`, then copies its Vite output into `node-app/public/`. The Node server serves that frontend and the same-origin `/api/...` routes.

GitHub Actions now validates and packages the Node target in `.github/workflows/build-node.yml`. SmarterASP's native GitHub deployment remains the deployment path for the Linux site; uploading .NET DLLs with FTP does not start a Node application.

## Verify the deployment

Open these URLs after SmarterASP reports the Node app as running:

- `https://meetingjourney.com/health` should return JSON with `"status":"ok"`.
- `https://meetingjourney.com/` should show the Meeting Journey app.

If `/health` returns an Nginx 404 or `/` returns 403, the Node app has not started or the website is still pointing at the wrong application folder. Check the Node application status and startup log in SmarterASP.

## Cloudflare

Point the hostname at the DNS target supplied by SmarterASP. Keep HTTPS enabled in Cloudflare. Once `/health` works, open the site in Safari and use **Add to Home Screen** to test it as a phone app.
