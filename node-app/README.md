# Meeting Journey Node deployment

This folder contains the Linux/Node.js runtime used by SmarterASP. The repository root also contains the deployment entrypoints so shared builders cannot mistake the legacy C# project for the live application.

In the SmarterASP Node.js site configuration use:

- Application folder: repository root (`.`)
- Startup file: `server.js` at the repository root
- Health check path: `/health`
- Build command: `npm run build`

The build command builds the React client from `src/MeetingJourney.Web` and copies the result into `node-app/public`. The server then serves the client and the same-origin Meeting Journey API.

Install production dependencies from the repository root with `npm ci --omit=dev` before starting an uploaded package. The protected admin backend uses `jose`, `sharp` and Node 24's built-in SQLite. It is disabled until explicitly configured; see [administrator deployment](../docs/smarterasp-deployment.md#protected-artwork-administration).

Optional Gemini prompt planning checks the next four meeting weeks and creates private, unapproved Treasures/Watchtower concepts. Configure its key only in private host settings; see [automation setup and daily scheduling](../docs/smarterasp-deployment.md#optional-gemini-prompt-automation). For a sleeping web host, schedule `node node-app\scripts\plan-artwork.mjs` daily with the same environment and persistent private data directory.
