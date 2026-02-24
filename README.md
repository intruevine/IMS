# Intruevine IMS v2.0

> **통합 유지보수 관리 시스템 (Integrated Maintenance System)**

React 18 + TypeScript + Vite 기반의 현대화된 유지보수 관리 시스템입니다.

## 🚀 주요 기능

### 핵심 기능
- ✅ **계약 관리**: 고객사별 계약 등록/수정/삭제, Excel Import/Export
- ✅ **자산 관리 (개선)**: 
  - 계약별 자산 등록/수정/삭제
  - 전체 자산 통합 조회 및 검색
  - 계약별 자산 필터링
  - HW/SW 카테고리별 필터링
  - 담당자(엔지니어) 정보 관리
- ✅ **캘린더 통합**:
  - FullCalendar 기반 월/주/일 뷰
  - 계약 만료일 자동 캘린더 등록
  - 자산 점검 주기별 자동 일정 생성
  - 점검/유지보수/계약만료/미팅 유형별 관리
- ✅ **상태 추적**: 계약 상태 (진행중/만료임박/만료) 자동 계산
- ✅ **진행률 시각화**: 계약 기간별 진행률 표시
- ✅ **검색/필터링**: 고객사명, 프로젝트명, 품목명 검색 및 다중 필터링
- ✅ **Excel Import/Export**: 계약/자산 데이터 일괄 관리

### 고급 기능
- ✅ **반응형 대시보드**: 실시간 통계 및 현황 표시
- ✅ **애니메이션 및 트랜지션**: Framer Motion 기반 부드러운 UI
- ✅ **토스트 알림 시스템**: 작업 완료/오류 알림
- ✅ **모달/드로어 UI**: 현대적 인터페이스
- 📝 **버전 관리**: 변경 이력 추적 (DB 설계 완료)
- 📊 **보고서**: 통계 및 분석 리포트 생성 (예정)
- 🔔 **알림 시스템**: 계약 만료 알림 (예정)

## 🛠 기술 스택

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, TypeScript 5 |
| **Build** | Vite 5 |
| **Styling** | Tailwind CSS 3 |
| **State Management** | Zustand 4 |
| **Database** | IndexedDB (Dexie.js) |
| **Animation** | Framer Motion |
| **Icons** | Heroicons |
| **Form Validation** | Zod |
| **Calendar** | FullCalendar |
| **Excel** | xlsx |

## 📁 프로젝트 구조

```
src/
├── core/
│   ├── database/       # IndexedDB 설정 및 CRUD
│   │   └── db.ts
│   └── state/          # Zustand 상태 관리
│       └── store.ts
├── features/
│   ├── auth/           # 로그인/인증
│   ├── dashboard/      # 대시보드
│   ├── contracts/      # 계약 관리
│   ├── assets/         # 자산 조회
│   ├── calendar/       # 일정 관리
│   ├── reports/        # 보고서 (예정)
│   └── settings/       # 설정
├── shared/
│   ├── components/     # 공통 컴포넌트
│   │   └── ui/         # Button, Card, Modal 등
│   ├── hooks/          # 커스텀 훅
│   ├── styles/         # 전역 스타일
│   └── utils/          # 유틸리티 함수
├── types/              # TypeScript 타입 정의
└── App.tsx             # 메인 앱 컴포넌트
```

## 🚀 시작하기

### 설치

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 미리보기
npm run preview
```

### 로그인 정보

- **관리자**: admin / admin
- **사용자**: user / user

## 📊 데이터 구조

### Contract (계약)
```typescript
interface Contract {
  id: number;
  customer_name: string;      // 고객사명
  project_title: string;      // 프로젝트명
  start_date: string;         // 시작일 (YYYY-MM-DD)
  end_date: string;           // 종료일 (YYYY-MM-DD)
  notes?: string;             // 비고
  items: AssetItem[];         // 자산 목록
  created_at?: string;        // 생성일
  updated_at?: string;        // 수정일
}
```

### AssetItem (자산)
```typescript
interface AssetItem {
  id: number;
  category: 'HW' | 'SW';      // 카테고리
  item: string;               // 품목명
  product: string;            // 모델명
  details: AssetDetail[];   // 상세 구성
  qty: number;              // 수량
  cycle: InspectionCycle;   // 점검 주기 (월/분기/반기/연/장애시)
  scope?: string;           // 지원 범위
  remark?: string;          // 비고
  company?: string;         // 수행 업체
  engineer: EngineerInfo;   // 엔지니어 정보 (Main/Sub)
  sales?: ContactPerson;    // 영업대표
}
```

### 자산 조회 응답 (확장)
```typescript
// 자산 목록 조회 시 계약 정보 포함
interface AssetWithContract extends AssetItem {
  contractId: number;       // 계약 ID
  customerName: string;     // 고객사명
  projectTitle: string;     // 프로젝트명
}
```

## 📅 구현 로드맵

### Phase 1: 기반 구축 ✅ (완료)
- [x] 프로젝트 설정 (Vite + React + TypeScript)
- [x] 타입 시스템 구축
- [x] IndexedDB 스키마 설계
- [x] 기본 컴포넌트 라이브러리
- [x] 상태 관리 시스템 (Zustand)

### Phase 2: 핵심 기능 ✅ (완료)
- [x] 계약 CRUD 개선 (Excel Import/Export 포함)
- [x] 자산 관리 고도화 (독립적 관리 + 계약 연계)
- [x] 대시보드 개발 (기본 통계)
- [x] 검색/필터링 시스템 (계약별/카테고리별)
- [x] 캘린더 통합 (FullCalendar + 자동 일정 생성)

### Phase 3: 생산성 도구 📊 (진행중)
- [x] Excel Import/Export (계약 데이터)
- [ ] 배치 작업 (예정)
- [ ] 템플릿 시스템 (예정)
- [x] 버전 관리 (DB 설계 완료)
- [x] 이력 추적 (DB 설계 완료)

### Phase 4: 고급 기능 🔮 (예정)
- [ ] 보고서 생성기
- [ ] 알림 시스템
- [ ] 데이터 동기화
- [ ] 모바일 최적화
- [ ] PWA 구현

### Phase 5: 안정화 🎯 (예정)
- [ ] 성능 최적화
- [ ] 테스트
- [ ] 문서화
- [ ] 배포

## 🎯 주요 개선사항 (v1.0 → v2.0)

### 아키텍처
- ❌ 단일 HTML 파일 → ✅ 모듈화된 React 컴포넌트
- ❌ localStorage (5MB) → ✅ IndexedDB (GB 단위)
- ❌ 글로벌 변수 → ✅ Zustand 상태관리
- ❌ JavaScript → ✅ TypeScript (타입 안정성)

### 기능 (최신 업데이트)
- ✅ 반응형 디자인 (모바일/태블릿/데스크탑)
- ✅ 애니메이션 및 트랜지션 (Framer Motion)
- ✅ 토스트 알림 시스템
- ✅ 모달/드로어 UI
- ✅ 자산 등록 프로세스 개선 (계약 선택 → 자산 등록)
- ✅ 계약별 자산 필터링
- ✅ HW/SW 카테고리 구분 및 시각화
- ✅ 상세 구성 관리 (내용/수량/단위)
- ✅ 담당자 정보 관리 (엔지니어/영업)
- ✅ Excel Import/Export (계약 데이터)
- ✅ 캘린더 통합 (FullCalendar 기반)
- 📝 버전 관리 및 이력 추적 (DB 설계 완료, UI 예정)

### 개발자 경험
- ✅ Hot Module Replacement (HMR)
- ✅ 엄격한 TypeScript 설정
- ✅ ESLint 코드 품질 관리
- ✅ 경로 별칭 (@/core, @/features 등)

## 📝 라이선스

MIT License

## 👨‍💻 개발자

Intruevine Team
