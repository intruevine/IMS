# Release Notes - 2026-03-03

## Summary

This release stabilized production login, separated frontend and backend deploy flows, and fixed contract-based asset lookup behavior in asset management.

## Included Changes

- Fixed duplicate dashboard loading and toast timing issues
- Localized major UI messages into Korean
- Reduced frontend bundle size with route lazy loading
- Replaced heavy chart and Excel dependencies with lighter implementations
- Added asset inspection cycle summary and filter UI
- Fixed asset lookup to load assets by selected contract
- Reset asset filters when switching contracts
- Added dedicated backend deploy flow
- Switched backend password hashing dependency from `bcrypt` to `bcryptjs`

## Production Issues Resolved

- Login failures caused by unreadable `.env` and broken native `bcrypt`
- Asset contracts visible but contract-specific asset lists missing due to stale frontend state and mixed deploy state
- Backend route changes not reflected when only frontend `dist` was deployed

## Operational Notes

- `deploy.bat` is frontend-only
- `deploy-backend.bat` is required for backend route or auth changes
- Avoid uploading Windows `server/node_modules` to the NAS

## Verification

- Frontend URL returned `200`
- API URL returned `200`
- Admin login was verified successfully in production
