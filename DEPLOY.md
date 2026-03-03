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

- Reload nginx:

```bash
sudo nginx -t
sudo nginx -s reload
```
