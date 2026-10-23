# Meeting Journey Node deployment

This folder contains the Linux/Node.js runtime used by SmarterASP. The repository root also contains the deployment entrypoints so shared builders cannot mistake the legacy C# project for the live application.

In the SmarterASP Node.js site configuration use:

- Application folder: repository root (`.`)
- Startup file: `server.js` at the repository root
- Health check path: `/health`
- Build command: `npm run build`

The build command builds the React client from `src/MeetingJourney.Web` and copies the result into `node-app/public`. The server then serves the client and the same-origin Meeting Journey API.
