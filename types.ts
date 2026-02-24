/**
 * Intruevine 통합 유지보수 관리 시스템 (IMS)
 * TypeScript 타입 정의
 * 
 * 원본: index.html JavaScript 코드 분석
 */

// ============================================
// 기본 타입 및 열거형
// ============================================

/** 사용자 역할 */
type UserRole = 'admin' | 'user';

/** 계약 상태 */
type ContractStatus = 'active' | 'expiring' | 'expired' | 'unknown';

/** 자산 카테고리 */
type AssetCategory = 'HW' | 'SW';

/** 점검 주기 */
type InspectionCycle = '월' | '분기' | '반기' | '연' | '장애시';

/** 뷰 타입 */
type ViewType = 'home' | 'lookup' | 'manage';

/** API 액션 타입 */
type ApiAction = 
  | 'check_auth' 
  | 'login' 
  | 'logout' 
  | 'get_projects' 
  | 'save_project' 
  | 'duplicate_project'
  | 'delete_project' 
  | 'save_item' 
  | 'delete_item' 
  | 'update_profile';

/** Toast 타입 */
type ToastType = 'success' | 'error' | 'warning';

/** 필터 상태 */
type FilterStatus = 'all' | 'active' | 'expiring' | 'expired';

// ============================================
// 데이터 모델 타입
// ============================================

/** 담당자 정보 (엔지니어/영업) */
interface ContactPerson {
  name: string;
  rank?: string;
  phone?: string;
  email?: string;
}

/** 엔지니어 정보 */
interface EngineerInfo {
  main: ContactPerson;
  sub?: ContactPerson;
}

/** 자산 상세 구성 */
interface AssetDetail {
  content: string;
  qty: string;
  unit: string;
}

/** 자산(품목) */
interface AssetItem {
  id: number;
  category: AssetCategory;
  item: string;
  product: string;
  details: AssetDetail[];
  qty: number;
  cycle: InspectionCycle;
  scope?: string;
  remark?: string;
  company?: string;
  engineer: EngineerInfo;
  sales?: ContactPerson;
  specs?: string; // legacy field
}

/** 계약(프로젝트) */
interface Contract {
  id: number;
  customer_name: string;
  project_title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  notes?: string;
  items: AssetItem[];
}

/** 사용자 정보 */
interface User {
  username: string;
  display_name: string;
  role?: UserRole;
}

/** 세션 정보 */
interface SessionData extends User {
  role: UserRole;
}

// ============================================
// API 관련 타입
// ============================================

/** 기본 API 응답 */
interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
}

/** 로그인 응답 */
interface LoginResponse extends ApiResponse {
  user: string;
  role: UserRole;
  username: string;
}

/** 인증 확인 응답 */
interface AuthCheckResponse extends ApiResponse, SessionData {}

/** 프로젝트 목록 응답 */
interface ProjectsResponse extends ApiResponse {
  data: Contract[];
}

/** 프로젝트 저장 응답 */
interface SaveProjectResponse extends ApiResponse {
  id: number;
}

/** 복제 응답 */
interface DuplicateProjectResponse extends ApiResponse {
  id: number;
}

/** API 요청 데이터 */
interface ApiRequestData {
  // login
  username?: string;
  password?: string;
  
  // save_project
  id?: number | null;
  customer?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  note?: string;
  
  // duplicate_project, delete_project
  // id?: number;
  
  // save_item
  parent_contract_id?: number;
  category?: AssetCategory;
  item?: string;
  product?: string;
  details?: AssetDetail[];
  qty?: number;
  cycle?: InspectionCycle;
  scope?: string;
  remark?: string;
  company?: string;
  engineer?: EngineerInfo;
  sales?: ContactPerson;
  
  // delete_item
  // id?: number;
  
  // update_profile
  display_name?: string;
}

/** API 함수 반환 타입 */
type ApiResult = 
  | LoginResponse 
  | AuthCheckResponse 
  | ProjectsResponse 
  | SaveProjectResponse 
  | DuplicateProjectResponse 
  | ApiResponse 
  | null;

// ============================================
// 전역 상태 타입
// ============================================

/** 애플리케이션 상태 */
interface AppState {
  contracts: Contract[];
  isMockMode: boolean;
  currentFilter: FilterStatus;
  currentPage: number;
  userRole: UserRole;
  currentUser: User | null;
  currentDrawerFilter: InspectionCycle | 'all';
  itemsPerPage: number;
}

/** 전역 변수 인터페이스 */
interface GlobalState {
  contracts: Contract[];
  isMockMode: boolean;
  currentFilter: FilterStatus;
  currentPage: number;
  itemsPerPage: number;
  userRole: UserRole;
  currentUser: User | null;
  currentDrawerFilter: InspectionCycle | 'all';
  toastTimeout: ReturnType<typeof setTimeout> | null;
  searchDebounceTimer: ReturnType<typeof setTimeout> | null;
  confirmCallback: (() => void) | null;
}

// ============================================
// 유틸리티 함수 타입
// ============================================

/** HTML 이스케이프 함수 */
type EscapeHtmlFn = (text: string | null | undefined) => string;

/** 값 설정 함수 */
type SetValFn = (id: string, val: string | null | undefined) => void;

/** 계약 상태 확인 함수 */
type GetContractStatusFn = (endDateStr: string | null | undefined) => ContractStatus;

/** Toast 표시 함수 */
type ShowToastFn = (msg: string, type?: ToastType) => void;

/** 확인 모달 함수 */
type OpenConfirmFn = (msg: string, callback: () => void) => void;

/** 드래그 가능한 요소 생성 함수 */
type MakeDraggableFn = (elementId: string, handleId: string) => void;

// ============================================
// Window 전역 확장
// ============================================

declare global {
  interface Window {
    // 로그인/로그아웃
    handleLogin: (e: Event) => Promise<void>;
    handleLogout: () => void;
    processLogout: () => Promise<void>;
    
    // 뷰 전환
    showView: (viewName: ViewType, filter?: FilterStatus) => void;
    
    // 필터링
    setFilterStatus: (status: FilterStatus, viewType: ViewType) => void;
    filterContracts: (viewType: ViewType) => void;
    debounceFilter: (viewType: ViewType) => void;
    
    // Drawer
    openDrawer: (mode: 'add' | 'edit' | 'view', id?: number | null) => void;
    closeDrawer: () => void;
    filterDrawerAssets: (filter: InspectionCycle | 'all') => void;
    
    // 모달
    openProfileModal: () => void;
    closeModal: (type: 'profile' | 'item' | 'logout') => void;
    openItemModal: (mode: 'add' | 'edit', pid: number | string) => void;
    closeAssetDetailModal: () => void;
    
    // 확인 모달
    openConfirm: OpenConfirmFn;
    closeConfirm: () => void;
    
    // 데이터 조작
    saveContract: () => Promise<void>;
    saveItem: () => Promise<void>;
    saveProfile: () => Promise<void>;
    deleteContract: (id: number) => void;
    deleteItem: (pid: number, iid: number) => void;
    duplicateProject: (id: number) => void;
    editItem: (pid: number, iid: number) => void;
    
    // 자산 상세
    viewAssetDetail: (pid: number | string, iid: number | string) => void;
    
    // 상세 행 추가
    addDetailRow: (c?: string, q?: string, u?: string) => void;
  }
}

// ============================================
// DOM 요소 타입 헬퍼
// ============================================

/** 입력 요소 타입 */
type InputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** 모달 컨텐츠 요소 (드래그 가능) */
interface DraggableElement extends HTMLElement {
  resetPosition: () => void;
}

// ============================================
// 상수
// ============================================

/** 저장소 키 */
const STORAGE_KEY = 'ims_mock_db';
const SESSION_KEY = 'ims_mock_session';

// ============================================
// 타입 내보내기
// ============================================

export {
  // 기본 타입
  UserRole,
  ContractStatus,
  AssetCategory,
  InspectionCycle,
  ViewType,
  ApiAction,
  ToastType,
  FilterStatus,
  
  // 데이터 모델
  ContactPerson,
  EngineerInfo,
  AssetDetail,
  AssetItem,
  Contract,
  User,
  SessionData,
  
  // API
  ApiResponse,
  LoginResponse,
  AuthCheckResponse,
  ProjectsResponse,
  SaveProjectResponse,
  DuplicateProjectResponse,
  ApiRequestData,
  ApiResult,
  
  // 상태
  AppState,
  GlobalState,
  
  // 함수
  EscapeHtmlFn,
  SetValFn,
  GetContractStatusFn,
  ShowToastFn,
  OpenConfirmFn,
  MakeDraggableFn,
  
  // DOM
  InputElement,
  DraggableElement,
  
  // 상수
  STORAGE_KEY,
  SESSION_KEY,
};
