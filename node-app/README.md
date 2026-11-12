# Meeting Journey Node deployment

This folder contains the Linux/Node.js runtime used by SmarterASP. The repository root also contains the deployment entrypoints so shared builders cannot mistake the legacy C# project for the live application.

In the SmarterASP Node.js site configuration use:

- Application folder: repository root (`.`)
- Startup file: `server.js` at the repository root
- Health check path: `/health`
- Build command: `npm run build`

The build command builds the React client from `src/MeetingJourney.Web` and copies the result into `node-app/public`. The server then serves the client and the same-origin Meeting Journey API.

Install production dependencies from the repository root with `npm ci --omit=dev` before starting an uploaded package. The protected admin backend uses `jose`, `sharp` and Node 24's built-in SQLite. It is disabled until explicitly configured; see [administrator deployment](../docs/smarterasp-deployment.md#protected-artwork-administration).

Optional administrator-run Gemini/OpenRouter prompt planning defaults to the current meeting week plus four weeks ahead and creates private, unapproved Treasures/Watchtower concepts. Choose an inclusive date range in admin to catch up missed weeks (at most 12 weeks per run); existing suggestions and approvals are preserved. Configure API keys only in private host settings; see [manual planning setup and provider selection](../docs/smarterasp-deployment.md#optional-administrator-run-ai-prompt-planning). Review/edit the planning instructions in admin, then choose a provider/model and run when ready. OpenRouter paid models require explicit confirmation; there is no automatic paid fallback. The shared request cap defaults to 50 per UTC day and is configurable through `MJ_ARTWORK_MAX_CALLS_PER_DAY`. No startup/timer generation runs automatically.
