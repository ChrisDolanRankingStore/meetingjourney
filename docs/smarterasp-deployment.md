# GitHub to SmarterASP deployment

Meeting Journey is deployed as one ASP.NET Core site. GitHub Actions builds the React/Vite client, copies it into the API `wwwroot` folder, publishes the API, and uploads the complete output to SmarterASP over FTPS.

## GitHub repository secrets

Add these repository secrets under **Settings → Secrets and variables → Actions**:

- `SMARTERASP_FTP_SERVER` — the FTPS server supplied by SmarterASP
- `SMARTERASP_FTP_USERNAME` — the SmarterASP FTP username
- `SMARTERASP_FTP_PASSWORD` — the SmarterASP FTP password
- `SMARTERASP_SERVER_DIR` — the target website directory, if SmarterASP requires one

Do not put these values in `appsettings.json`, `.env` files, the workflow, or source code.

## Deployment

Push to `main`, or run **Build and deploy Meeting Journey** manually from the GitHub Actions tab. The workflow is in `.github/workflows/deploy-smarterasp.yml`.

The production frontend and API use the same origin. The React client calls `/api/...`, while ASP.NET Core serves the built frontend and API routes together.

## Cloudflare

Point the chosen hostname, such as `app.meetingjourney.com`, to the SmarterASP site using the DNS target SmarterASP provides. Keep HTTPS enabled in Cloudflare. Verify `/health` and then open the hostname in Safari before adding it to the iPhone Home Screen.
