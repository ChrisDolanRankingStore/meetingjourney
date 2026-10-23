# Meeting Journey Node deployment

This folder is the Linux/Node.js deployment target for Meeting Journey.

In the SmarterASP Node.js site configuration use:

- Application folder: `node-app`
- Startup file: `server.js`
- Health check path: `/health`
- Build command: `npm run build`

The build command builds the React client from `src/MeetingJourney.Web` and copies the result into `node-app/public`. The server then serves the client and the same-origin Meeting Journey API.
