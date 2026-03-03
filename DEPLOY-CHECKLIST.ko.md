# 인트루바인 IMS 배포 체크리스트

## 프런트 배포

1. `npm run build` 실행
2. `deploy.bat` 실행
3. 아래 주소 응답 확인
   - `https://intruevine.dscloud.biz/MA/`
   - `https://intruevine.dscloud.biz/MA/icon-192x192.png`

## 백엔드 배포

1. `server/` 아래 변경 파일 존재 여부 확인
2. 로컬 `.env` 업로드 금지
3. Windows 네이티브 모듈 업로드 금지
4. `deploy-backend.bat` 실행
5. 아래 항목 확인
   - `https://intruevine.dscloud.biz/api/`
   - 로그인 API
   - `/api/contracts/options/list` 같은 핵심 데이터 API

## 수동 복구

1. NAS에 SSH 접속
2. `/volume1/web_packages/MA/server` 이동
3. `sh scripts/run-api.sh` 실행
4. `curl http://127.0.0.1:3001/api/` 확인

## 최종 확인

1. 브라우저 강력 새로고침
2. 로그인 확인
3. 자산관리 계약 목록 확인
4. 계약별 자산 조회 확인
5. 릴리스 노트 기록
