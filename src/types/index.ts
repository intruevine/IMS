// ============================================
// Basic Type Aliases and Enums
// ============================================

/** User role */
export type UserRole = 'admin' | 'manager' | 'user';

/** Contract status */
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'unknown';

/** Asset category */
export type AssetCategory = 'HW' | 'SW';

/** Inspection cycle */
export type InspectionCycle = '월' | '분기' | '반기' | '연' | '장애시';

/** Top-level view type */
export type ViewType = 'home' | 'lookup' | 'manage';

/** Toast type */
export type ToastType = 'success' | 'error' | 'warning';

/** Filter status */
export type FilterStatus = 'all' | 'active' | 'expiring' | 'expired';

/** Sort order */
export type SortOrder = 'asc' | 'desc';

// ============================================
// Data Model Types
// ============================================

/** Contact person (engineer/sales) */
export interface ContactPerson {
  name: string;
  rank?: string;
  phone?: string;
  email?: string;
}

/** Engineer info */
export interface EngineerInfo {
  main: ContactPerson;
  sub?: ContactPerson;
}

/** Asset detail row */
export interface AssetDetail {
  content: string;
  qty: string;
  unit: string;
}

/** Asset item */
export interface AssetItem {
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

/** Project type */
export type ProjectType = 'maintenance' | 'construction';

/** Contract (project) */
export interface Contract {
  id: number;
  customer_name: string;
  project_title: string;
  project_type: ProjectType; // maintenance or construction
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  notes?: string;
  items: AssetItem[];
  files?: ContractFile[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface ContractFile {
  id: number;
  contract_id: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_by?: string;
  created_at?: string;
}

/** Project member */
export interface ProjectMember {
  id?: number;
  contract_id: number;
  member_name?: string; // legacy
  member_role?: string; // legacy
  member_company?: string; // legacy
  member_email?: string;
  member_phone?: string;
  project_name?: string;
  customer_name?: string;
  manager_name?: string;
  allocation_type?: 'resident' | 'proposal' | 'pm' | 'pl' | 'ta' | 'se' | 'etc_support';
  start_date: string;
  end_date?: string;
  monthly_effort?: number;
  status: 'active' | 'completed' | 'withdrawn' | 'inactive';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/** User */
export interface User {
  username: string;
  display_name: string;
  password?: string;
  role?: UserRole;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  approved_by?: string;
  created_at?: string;
  updated_at?: string;
}

/** Session payload */
export interface SessionData extends User {
  role: UserRole;
}

// ============================================
// Search and Filter Types
// ============================================

export interface SearchFilters {
  dateRange?: { start: string; end: string };
  status?: ContractStatus[];
  customer?: string[];
  category?: AssetCategory[];
  engineer?: string[];
  tags?: string[];
}

export interface SortConfig {
  field: keyof Contract | string;
  order: SortOrder;
}

export interface SearchQuery {
  text: string;
  filters: SearchFilters;
  sort: SortConfig;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardWidget {
  id: string;
  type: 'stats' | 'chart' | 'calendar' | 'alerts' | 'recent';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  expiredContracts: number;
  totalAssets: number;
  hwAssets: number;
  swAssets: number;
}

// ============================================
// Calendar Types
// ============================================

export type CalendarEventType =
  | 'inspection'
  | 'maintenance'
  | 'contract_end'
  | 'meeting'
  | 'remote_support'
  | 'training'
  | 'sales_support';

export type CalendarScheduleDivision =
  | 'am_offsite'
  | 'pm_offsite'
  | 'all_day_offsite'
  | 'night_support'
  | 'emergency_support';

export type HolidayType = 'national' | 'company';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  scheduleDivision?: CalendarScheduleDivision;
  createdBy?: string;
  createdByName?: string;
  customerName?: string;
  location?: string;
  start: string;
  end: string;
  contractId: number;
  assetId?: number;
  status: 'scheduled' | 'completed' | 'overdue';
  supportHours?: number;
  assignee?: string;
  description?: string;
}

export interface AdditionalHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 'contract_expiring' | 'inspection_due' | 'asset_warranty';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  created_at: string;
  contract_id?: number;
  asset_id?: number;
}

export interface NotificationRule {
  id: string;
  name: string;
  condition: {
    type: NotificationType;
    daysBefore: number;
    severity: 'info' | 'warning' | 'critical';
  };
  actions: {
    inApp: boolean;
    email: boolean;
    webhook?: string;
  };
  recipients: string[];
}

// ============================================
// Versioning Types
// ============================================

export type ChangeType = 'create' | 'update' | 'delete';

export interface VersionHistory<T> {
  id: number;
  entity_id: number;
  entity_type: 'contract' | 'asset';
  data: T;
  version: number;
  created_at: string;
  created_by: string;
  change_type: ChangeType;
  diff: Partial<T>;
  reason?: string;
}

// ============================================
// Report Types
// ============================================

export type ReportType = 'contract_status' | 'asset_inventory' | 'maintenance_history' | 'revenue_forecast';

export interface ReportConfig {
  type: ReportType;
  period: { start: string; end: string };
  groupBy?: 'customer' | 'month' | 'engineer' | 'category';
  format: 'table' | 'chart' | 'both';
}

// ============================================
// Excel Types
// ============================================

export interface ExcelImportConfig {
  mapping: Record<string, string>;
  validation: {
    required: string[];
    unique: string[];
    format: Record<string, RegExp>;
  };
  preview: boolean;
}

// ============================================
// UI State Types
// ============================================

export interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  activeDrawer: string | null;
  loading: boolean;
  toast: {
    show: boolean;
    message: string;
    type: ToastType;
  } | null;
}

export interface FilterState {
  currentFilter: FilterStatus;
  searchText: string;
  dateRange: { start: string | null; end: string | null } | null;
  page: number;
  itemsPerPage: number;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
