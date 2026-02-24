# Intruevine IMS 백엔드 서버

NAS MariaDB 연동을 위한 Node.js/Express 백엔드 서버입니다.

## 📁 구조

```
server/
├── index.js              # 메인 서버 파일
├── db.js                 # MariaDB 연결 및 초기화
├── routes/               # API 라우트
│   ├── contracts.js      # 계약 API
│   ├── assets.js         # 자산 API
│   ├── users.js          # 사용자 API
│   ├── events.js         # 캘린더 이벤트 API
│   └── members.js        # 프로젝트 멤버 API
├── package.json
└── .env.example          # 환경변수 예시
```

## 🚀 설치 및 실행

### 1. 패키지 설치

```bash
cd server
npm install
```

### 2. 환경변수 설정

```bash
# .env 파일 생성
copy .env.example .env

# .env 파일 수정 (NAS MariaDB 정보 입력)
DB_HOST=intruevine.dscloud.biz  # NAS 도메인 주소
DB_PORT=3306
DB_USER=intruevine           # MariaDB 사용자명
DB_PASSWORD=IntrueVine2@25    # MariaDB 비밀번호 (root: IntrueVine2@25)
DB_NAME=intruevine_ims       # 데이터베이스명
```

### 3. MariaDB 설정 (NAS에서)

```sql
-- MariaDB 접속 후 실행
CREATE DATABASE IF NOT EXISTS intruevine_ims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'intruevine'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON intruevine_ims.* TO 'intruevine'@'%';
FLUSH PRIVILEGES;
```

### 4. 서버 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 또는 프로덕션 모드
npm start
```

## 📡 API 엔드포인트

### 인증
- `POST /api/users/login` - 로그인

### 계약 (Contracts)
- `GET /api/contracts` - 모든 계약 조회
- `GET /api/contracts/:id` - 단일 계약 조회
- `POST /api/contracts` - 계약 생성
- `PUT /api/contracts/:id` - 계약 수정
- `DELETE /api/contracts/:id` - 계약 삭제

**쿼리 파라미터:**
- `search` - 고객명/프로젝트명 검색
- `status` - 상태 필터 (active, expiring, expired)
- `page` - 페이지 번호
- `limit` - 페이지당 개수

### 자산 (Assets)
- `GET /api/assets` - 모든 자산 조회
- `GET /api/assets/contract/:contractId` - 계약별 자산 조회
- `GET /api/assets/:id` - 단일 자산 조회
- `POST /api/assets` - 자산 생성
- `PUT /api/assets/:id` - 자산 수정
- `DELETE /api/assets/:id` - 자산 삭제

### 사용자 (Users)
- `GET /api/users` - 모든 사용자 조회
- `POST /api/users` - 사용자 생성
- `PUT /api/users/:username` - 사용자 수정
- `PUT /api/users/:username/password` - 비밀번호 변경
- `DELETE /api/users/:username` - 사용자 삭제

### 이벤트 (Events)
- `GET /api/events` - 모든 이벤트 조회
- `GET /api/events/:id` - 단일 이벤트 조회
- `POST /api/events` - 이벤트 생성
- `PUT /api/events/:id` - 이벤트 수정
- `DELETE /api/events/:id` - 이벤트 삭제
- `POST /api/events/generate/contract-end` - 계약 만료 이벤트 자동 생성
- `POST /api/events/generate/inspections` - 점검 일정 자동 생성

### 프로젝트 멤버 (Members)
- `GET /api/members` - 모든 멤버 조회
- `GET /api/members/:id` - 단일 멤버 조회
- `POST /api/members` - 멤버 생성
- `PUT /api/members/:id` - 멤버 수정
- `DELETE /api/members/:id` - 멤버 삭제

## 🔗 프론트엔드 연동

프론트엔드에서 IndexedDB 대신 API를 사용하려면:

1. **API 클라이언트 생성** (`src/core/api/client.ts`)
2. **IndexedDB 호출을 API 호출로 교체**

예시:
```typescript
// 기존 (IndexedDB)
const contracts = await db.contracts.toArray();

// 변경 후 (API)
const response = await fetch('http://localhost:3001/api/contracts');
const { contracts } = await response.json();
```

## ⚙️ NAS MariaDB 설정 방법

### 1. NAS에 MariaDB 설치
- Synology DSM → 패키지 센터 → MariaDB 10 설치

### 2. 데이터베이스 및 사용자 생성
```bash
# NAS SSH 접속
mysql -u root -p

# SQL 실행
CREATE DATABASE intruevine_ims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'intruevine'@'%' IDENTIFIED BY 'IntrueVine2@25';
GRANT ALL PRIVILEGES ON intruevine_ims.* TO 'intruevine'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 방화벽 설정
- DSM → 제어판 → 보안 → 방화벽
- MariaDB 포트(3306) 접근 허용

## 🐛 문제 해결

### 연결 실패 시
1. NAS 주소 확인: `ping intruevine.dscloud.biz`
2. MariaDB 실행 상태 확인
3. 방화벽 설정 확인
4. 사용자 권한 확인

### 타임아웃 오류
```
Error: Connection timeout
```
→ NAS 방화벽에서 3306 포트 허용 필요

## 📝 기본 계정

서버 첫 실행 시 자동 생성:
- 관리자: `admin` / `admin`
- 사용자: `user` / `user`

⚠️ **프로덕션 환경에서는 반드시 비밀번호 변경하세요!**
