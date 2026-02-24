# NAS MariaDB 연동 가이드

## ✅ 생성된 파일

### 백엔드 서버 (server/)
```
server/
├── index.js              # Express 서버 메인
├── db.js                 # MariaDB 연결 & 테이블 자동 생성
├── routes/
│   ├── contracts.js      # 계약 CRUD API
│   ├── assets.js         # 자산 CRUD API
│   ├── users.js          # 사용자/인증 API
│   ├── events.js         # 캘린더 이벤트 API
│   └── members.js        # 프로젝트 멤버 API
├── package.json
├── .env.example          # 환경변수 예시
└── README.md             # 서버 설치/실행 가이드
```

### 프론트엔드 API 클라이언트
```
src/core/api/client.ts    # API 호출 함수들
```

---

## 🚀 다음 단계

### 1. 백엔드 서버 설치 및 실행

```bash
cd server
npm install
copy .env.example .env
# .env 파일 수정 (NAS MariaDB 정보 입력)
npm run dev
```

### 2. NAS MariaDB 설정

SSH로 NAS 접속 후:
```sql
mysql -u root -p

CREATE DATABASE intruevine_ims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'intruevine'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON intruevine_ims.* TO 'intruevine'@'%';
FLUSH PRIVILEGES;
```

### 3. 프론트엔드에서 IndexedDB → API 교체

`src/core/state/store.ts`의 액션들을 수정:

```typescript
// 변경 전 (IndexedDB)
getContracts: async (filters) => {
  const { contracts, total } = await db.getContracts(filters);
  set({ contracts, totalContracts: total });
},

// 변경 후 (API)
getContracts: async (filters) => {
  const { contracts, total } = await contractsAPI.getAll(filters);
  set({ contracts, totalContracts: total });
},
```

---

## 📋 API 엔드포인트 목록

| 기능 | 메소드 | 엔드포인트 |
|------|--------|-----------|
| 로그인 | POST | /api/users/login |
| 계약 목록 | GET | /api/contracts |
| 계약 생성 | POST | /api/contracts |
| 계약 수정 | PUT | /api/contracts/:id |
| 계약 삭제 | DELETE | /api/contracts/:id |
| 자산 목록 | GET | /api/assets |
| 자산 생성 | POST | /api/assets |
| 이벤트 목록 | GET | /api/events |
| 이벤트 생성 | POST | /api/events |
| 멤버 목록 | GET | /api/members |

---

## 🔧 환경변수 설정 (.env)

```env
DB_HOST=192.168.1.100        # NAS IP
DB_PORT=3306
DB_USER=intruevine
DB_PASSWORD=your_password
DB_NAME=intruevine_ims
PORT=3001
CLIENT_URL=http://localhost:5173
```

---

## ⚠️ 중요 사항

1. **백엔드 서버는 항상 실행 중이어야 함**
   - NAS가 24시간 가동 중이면 NAS에 Node.js 설치 후 실행 권장
   - 또는 별도 서버/PC에서 실행

2. **데이터 마이그레이션**
   - 기존 IndexedDB 데이터를 API로 마이그레이션하는 스크립트 필요
   - `src/core/api/migrate.ts` 생성하여 기존 데이터 업로드

3. **보안**
   - JWT 인증 추가 필요 (현재는 기본 로그인만 구현)
   - HTTPS 적용 권장 (프로덕션)

4. **파일 첨부**
   - 현재 계약서/점검서류 파일 업로드 기능 미포함
   - multer 미들웨어 추가 필요

---

## ❓ 도움이 필요하신가요?

특정 부분 구현을 원하시면 말씀해주세요:
- [ ] 프론트엔드 store.ts API 연동 수정
- [ ] 기존 IndexedDB 데이터 마이그레이션 스크립트
- [ ] JWT 인증 구현
- [ ] 파일 업로드 기능
- [ ] NAS에 Node.js 설치 및 서버 배포
