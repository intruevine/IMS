## Intruevine IMS Deploy Checklist

### Frontend

1. Run `npm run build`
2. Run `deploy.bat`
3. Check:
   - `https://intruevine.dscloud.biz/MA/`
   - `https://intruevine.dscloud.biz/MA/icon-192x192.png`

### Backend

1. Confirm backend changes exist under `server/`
2. Do not upload local `.env`
3. Do not upload Windows native modules
4. Run `deploy-backend.bat`
5. Check:
   - `https://intruevine.dscloud.biz/api/`
   - login API
   - key data APIs such as `/api/contracts/options/list`

### Manual Recovery

1. SSH into NAS
2. Go to `/volume1/web_packages/MA/server`
3. Run `sh scripts/run-api.sh`
4. Check `curl http://127.0.0.1:3001/api/`

### Final Verification

1. Hard refresh browser
2. Verify login
3. Verify asset management contract list
4. Verify contract-specific asset loading
5. Record release notes
