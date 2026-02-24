# Intruevine IMS - NAS MariaDB 연동 완료 보고서

## 📅 완료일: 2026-02-23

## ✅ 완료된 작업

### 1. 백엔드 서버 구축 (server/)
- [x] Node.js/Express 서버 생성
- [x] MariaDB 연결 설정 (intruevine.dscloud.biz:3306)
- [x] 모든 테이블 자동 생성 스크립트
- [x] REST API 엔드포인트 구현
  - 계약 CRUD API (/api/contracts)
  - 자산 CRUD API (/api/assets)
  - 사용자/인증 API (/api/users)
  - 캘린더 이벤트 API (/api/events)
  - 프로젝트 멤버 API (/api/members)

### 2. NAS MariaDB 설정
- [x] 데이터베이스 생성: `intruevine_ims`
- [x] 사용자 생성: `intruevine`@`%`
- [x] 권한 부여: ALL PRIVILEGES
- [x] 비밀번호: `IntrueVine2@25`
- [x] root 계정 비밀번호: `IntrueVine2@25`

### 3. 생성된 파일 목록

#### 백엔드
```
server/
├── index.js              # Express 서버 메인
├── db.js                 # MariaDB 연결 & 테이블 생성
├── package.json          # 의존성
├── .env                  # 환경변수 (DB 설정 포함)
├── .env.example          # 환경변수 예시
├── README.md             # 설치/실행 가이드
├── setup-database.sql    # NAS DB 초기화 SQL
└── routes/
    ├── contracts.js      # 계약 API
    ├── assets.js         # 자산 API
    ├── users.js          # 사용자 API
    ├── events.js         # 이벤트 API
    └── members.js        # 멤버 API
```

#### 프론트엔드
```
src/core/api/
└── client.ts             # API 클라이언트 (HTTP 요청)
```

### 4. 서버 실행 방법

```bash
cd server
npm install
npm start
```

**접속 정보:**
- 서버: http://localhost:3001
- API: http://localhost:3001/api
- Health Check: http://localhost:3001/health

**DB 연결:**
- Host: intruevine.dscloud.biz
- Port: 3306
- Database: intruevine_ims
- User: intruevine
- Password: IntrueVine2@25

### 5. 기본 계정
- 관리자: admin / admin
- 사용자: user / user

## 🔄 다음 단계 (프론트엔드 연동)

현재 프론트엔드는 IndexedDB를 사용하고 있습니다. NAS MariaDB와 연동하려면:

### 1. 환경변수 설정 (프론트엔드)
```bash
# .env 파일 생성
VITE_API_URL=http://localhost:3001/api
```

### 2. store.ts 수정 예시
```typescript
// 기존: IndexedDB
const contracts = await db.getContracts(filters);

// 변경: API 호출
import { contractsAPI } from '@/core/api/client';
const { contracts } = await contractsAPI.getAll(filters);
```

### 3. 주요 변경 필요 파일
- `src/core/state/store.ts` - 모든 DB 액션을 API 호출로 변경
- `src/features/contract/ContractList.tsx` - 데이터 fetching
- `src/features/contract/ContractForm.tsx` - 데이터 저장
- `src/features/settings/SettingsPage.tsx` - 백업/복원

## 📝 참고사항

### DB 테이블 구조
- **users**: 사용자 정보
- **contracts**: 계약 정보
- **assets**: 자산 정보 (계약별)
- **events**: 캘린더 이벤트
- **project_members**: 프로젝트 투입 회원
- **notifications**: 알림
- **version_history**: 변경 이력

### API 엔드포인트
```
POST   /api/users/login          # 로그인
GET    /api/contracts            # 계약 목록
POST   /api/contracts            # 계약 생성
PUT    /api/contracts/:id        # 계약 수정
DELETE /api/contracts/:id        # 계약 삭제
GET    /api/assets               # 자산 목록
POST   /api/events               # 이벤트 생성
GET    /api/members              # 멤버 목록
```

### 문제 해결
- **연결 실패**: NAS 방화벽 3306 포트 확인
- **권한 오류**: `intruevine` 사용자 권한 재확인
- **타임아웃**: 네트워크 연결 및 NAS 상태 확인

## 👤 담당자
- 설정: opencode AI Assistant
- NAS 관리: boazkim
- DB 관리자: root (IntrueVine2@25)

---

**문의사항**: 프론트엔드 연동 또는 추가 기능 필요시 말씀해주세요.
