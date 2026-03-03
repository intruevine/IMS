# Intruevine IMS Deployment Guide

## Current Production State

- Public app URL: `https://intruevine.dscloud.biz/MA/`
- Public API URL: `https://intruevine.dscloud.biz/api/`
- NAS frontend root: `/volume1/web_packages/MA`
- NAS backend root: `/volume1/web_packages/MA/server`

## Important Notes

- Do not use `https://api.intruevine.dscloud.biz` for production traffic.
- The active production API base is `https://intruevine.dscloud.biz/api`.
- Synology Reverse Proxy host-wide rules for `intruevine.dscloud.biz` were removed because they broke static file serving.

## Frontend Deploy

1. Build the frontend:

```bash
npm run build
```

2. Upload `dist/*` into:

```text
/volume1/web_packages/MA/
```

3. Verify:

- `https://intruevine.dscloud.biz/MA/`
- `https://intruevine.dscloud.biz/MA/icon-192x192.png`

Script:

```bash
deploy.bat
```

Important:

- `deploy.bat` is frontend-only.
- Always run `npm run build` before `deploy.bat`.

## Backend Deploy

Backend deploy must be handled separately from the frontend.

Upload only these areas:

- `server/index.js`
- `server/db.js`
- `server/package.json`
- `server/package-lock.json`
- `server/routes/*`
- `server/middleware/*`
- `server/scripts/*`
- `server/node_modules/bcryptjs/*`

Do not upload:

- local `.env`
- Windows-built native modules such as `server/node_modules/bcrypt`
- whole `server/node_modules` from Windows

Script:

```bash
deploy-backend.bat
```

What `deploy-backend.bat` does:

- uploads backend source files to `/volume1/web_packages/MA/server`
- uploads `bcryptjs` only, not the whole local `node_modules`
- stops the old backend process
- restores readable permissions on `.env` and backend js files
- starts `index.js`
- verifies `http://127.0.0.1:3001/api/`

## Backend Runtime

- Backend entry: `/volume1/web_packages/MA/server/index.js`
- Node binary on NAS: `/var/packages/Node.js_v20/target/usr/local/bin/node`
- Boot script: `/usr/local/etc/rc.d/S99intruevineims.sh`
- Backend log: `/volume1/web_packages/MA/server/app.log`

## Nginx Runtime

- Persistent custom vhost: `/usr/local/etc/nginx/sites-enabled/intruevine.custom.conf`
- Removed Synology reverse proxy source: `/usr/syno/etc/www/ReverseProxy.json`

The custom vhost handles:

- `/MA` and static files from `/volume1/web_packages`
- `/api` and `/MA/api` proxy to `127.0.0.1:3001`

## Health Checks

Check these after deploy or reboot:

```text
https://intruevine.dscloud.biz/MA/
https://intruevine.dscloud.biz/api/
https://intruevine.dscloud.biz/MA/icon-192x192.png
```

Expected:

- `/MA/` -> `200`
- `/api/` -> `200`
- icon -> `200`

## Troubleshooting

If `/MA/` fails:

- Check `/usr/local/etc/nginx/sites-enabled/intruevine.custom.conf`
- Check files under `/volume1/web_packages/MA`

If `/api/` fails:

- Check backend process:

```bash
ps -ef | grep 'node index.js'
curl http://127.0.0.1:3001/api/
```

- Restart backend boot script:

```bash
sudo /usr/local/etc/rc.d/S99intruevineims.sh restart
```

- Or use the Windows-side backend deploy script:

```bash
deploy-backend.bat
```

- Reload nginx:

```bash
sudo nginx -t
sudo nginx -s reload
```

## Recent Incident Notes

- Frontend-only deploy is not enough when `server/routes/*` changes.
- Uploading Windows `server/node_modules` to NAS can break Linux runtime binaries.
- If valid credentials return `500`, check `.env` readability and `JWT_SECRET` loading first.
- If asset contracts appear but per-contract assets look wrong, verify `/api/assets/contract/:id` before changing UI logic.
