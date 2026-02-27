import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  Contract, 
  AssetItem, 
  User, 
  UserRole,
  FilterStatus,
  ToastType,
  DashboardStats,
  Notification,
  CalendarEvent,
  AssetCategory,
  ProjectMember,
  AdditionalHoliday,
  HolidayType
} from '@/types';
import { 
  contractsAPI, 
  assetsAPI, 
  usersAPI, 
  eventsAPI, 
  membersAPI,
  holidaysAPI,
  APIError,
  hasAuthToken,
  setAuthToken,
  clearAuthToken
} from '../api/client';
import { getContractStatus } from '@/shared/utils/contract';

// ============================================
// 상태 인터페이스
// ============================================

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  users: User[];
  pendingUsers: User[];
}

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  toast: {
    message: string;
    type: ToastType;
  } | null;
  isLoading: boolean;
}

interface ContractState {
  contracts: Contract[];
  currentContract: Contract | null;
  filteredContracts: Contract[];
  totalCount: number;
  filter: FilterStatus;
  searchText: string;
  page: number;
  itemsPerPage: number;
}

interface DashboardState {
  stats: DashboardStats;
  recentContracts: Contract[];
  notifications: Notification[];
  unreadCount: number;
}

interface CalendarState {
  calendarEvents: CalendarEvent[];
  additionalHolidays: AdditionalHoliday[];
  holidayLoadError: string | null;
}

interface AssetState {
  assets: Array<AssetItem & { contractId: number; customerName: string; projectTitle: string }>;
  totalAssets: number;
  assetFilter: 'all' | AssetCategory;
  assetSearchText: string;
  assetPage: number;
  assetItemsPerPage: number;
}

interface ProjectMemberState {
  projectMembers: ProjectMember[];
  selectedContractId: number | null;
}

interface AppState extends AuthState, UIState, ContractState, DashboardState, CalendarState, AssetState, ProjectMemberState {
  // Actions
  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  registerUserRequest: (payload: { username: string; display_name: string; password: string }) => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
  loadUsers: () => Promise<void>;
  loadPendingUsers: () => Promise<void>;
  approveUserRequest: (username: string, role?: UserRole) => Promise<void>;
  rejectUserRequest: (username: string) => Promise<void>;
  createUser: (user: Omit<User, 'created_at' | 'updated_at'>) => Promise<void>;
  updateUserRole: (username: string, role: UserRole) => Promise<void>;
  deleteUser: (username: string) => Promise<void>;
  updateUserPassword: (username: string, currentPassword: string, newPassword: string) => Promise<void>;
  
  // UI
  setSidebarOpen: (open: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  setLoading: (loading: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  
  // Contracts
  loadContracts: () => Promise<void>;
  setFilter: (filter: FilterStatus) => void;
  setSearchText: (text: string) => void;
  setPage: (page: number) => void;
  createContract: (contract: Omit<Contract, 'id'>) => Promise<number>;
  updateContract: (id: number, changes: Partial<Contract>) => Promise<void>;
  deleteContract: (id: number) => Promise<void>;
  setCurrentContract: (contract: Contract | null) => void;
  
  // Assets
  addAsset: (contractId: number, asset: Omit<AssetItem, 'id'>) => Promise<void>;
  updateAsset: (contractId: number, assetId: number, changes: Partial<AssetItem>) => Promise<void>;
  deleteAsset: (contractId: number, assetId: number) => Promise<void>;
  
  // Independent Asset Management
  loadAssets: () => Promise<void>;
  setAssetFilter: (filter: 'all' | AssetCategory) => void;
  setAssetSearchText: (text: string) => void;
  setAssetPage: (page: number) => void;
  
  // Project Members
  loadProjectMembers: (contractId?: number) => Promise<void>;
  createProjectMember: (member: Omit<ProjectMember, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProjectMember: (id: number, changes: Partial<ProjectMember>) => Promise<void>;
  deleteProjectMember: (id: number) => Promise<void>;
  setSelectedContractId: (contractId: number | null) => void;
  
  // Dashboard
  loadDashboardData: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  
  // Calendar
  loadCalendarEvents: () => Promise<void>;
  createCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateCalendarEvent: (id: string, changes: Partial<CalendarEvent>) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;
  generateCalendarEventsFromData: () => Promise<number>;
  loadAdditionalHolidays: () => Promise<void>;
  addAdditionalHoliday: (holiday: Omit<AdditionalHoliday, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAdditionalHoliday: (id: string, changes: Partial<Omit<AdditionalHoliday, 'id'>>) => Promise<void>;
  deleteAdditionalHoliday: (id: string) => Promise<void>;
}

// ============================================
// 스토어 생성
// ============================================

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null,
        
        sidebarOpen: true,
        activeModal: null,
        toast: null,
        
        contracts: [],
        currentContract: null,
        filteredContracts: [],
        totalCount: 0,
        filter: 'all',
        searchText: '',
        page: 1,
        itemsPerPage: 10,
        
        stats: {
          totalContracts: 0,
          activeContracts: 0,
          expiringContracts: 0,
          expiredContracts: 0,
          totalAssets: 0,
          hwAssets: 0,
          swAssets: 0
        },
        recentContracts: [],
        notifications: [],
        unreadCount: 0,
        calendarEvents: [],
        additionalHolidays: [],
        holidayLoadError: null,
        
        // Asset State
        assets: [],
        totalAssets: 0,
        assetFilter: 'all',
        assetSearchText: '',
        assetPage: 1,
        assetItemsPerPage: 10,

        // Project Member State
        projectMembers: [],
        selectedContractId: null,

        // ============================================
        // Auth Actions
        // ============================================

        users: [],
        pendingUsers: [],

        login: async (username: string, password: string) => {
          set({ isLoading: true, authError: null });
          
          try {
            const { user, token } = await usersAPI.login(username, password);
            setAuthToken(token);
            
            set({ 
              user: user,
              role: user.role || 'user',
              isAuthenticated: true,
              isLoading: false,
              authError: null
            });
            // Load auth-protected data immediately after successful login.
            await Promise.allSettled([
              get().loadCalendarEvents(),
              get().loadAdditionalHolidays()
            ]);
            return true;
          } catch (error) {
            clearAuthToken();
            const message = error instanceof APIError ? error.message : '로그인에 실패했습니다';
            set({
              isLoading: false,
              isAuthenticated: false,
              user: null,
              role: null,
              authError: message
            });
            return false;
          }
        },

        registerUserRequest: async (payload: { username: string; display_name: string; password: string }) => {
          await usersAPI.register(payload);
        },

        clearAuthError: () => set({ authError: null }),

        loadUsers: async () => {
          if (!get().isAuthenticated || !hasAuthToken()) return;
          try {
            const users = await usersAPI.getAll();
            set({ users });
          } catch (error) {
            console.error('Failed to load users:', error);
            get().showToast('사용자 목록 로드 실패', 'error');
          }
        },

        loadPendingUsers: async () => {
          if (!get().isAuthenticated || !hasAuthToken() || get().role !== 'admin') return;
          try {
            const pendingUsers = await usersAPI.getPending();
            set({ pendingUsers });
          } catch (error) {
            console.error('Failed to load pending users:', error);
            get().showToast('승인 대기 목록 로드 실패', 'error');
          }
        },

        approveUserRequest: async (username: string, role: UserRole = 'user') => {
          try {
            await usersAPI.approve(username, role);
            await Promise.all([get().loadUsers(), get().loadPendingUsers()]);
            get().showToast('가입 요청을 승인했습니다', 'success');
          } catch (error) {
            console.error('Failed to approve user request:', error);
            const message = error instanceof APIError ? error.message : '가입 승인 실패';
            get().showToast(message, 'error');
            throw error;
          }
        },

        rejectUserRequest: async (username: string) => {
          try {
            await usersAPI.reject(username);
            await Promise.all([get().loadUsers(), get().loadPendingUsers()]);
            get().showToast('가입 요청을 반려했습니다', 'success');
          } catch (error) {
            console.error('Failed to reject user request:', error);
            const message = error instanceof APIError ? error.message : '가입 반려 실패';
            get().showToast(message, 'error');
            throw error;
          }
        },

        createUser: async (user: Omit<User, 'created_at' | 'updated_at'>) => {
          try {
            await usersAPI.create(user);
            await get().loadUsers();
            get().showToast('User created successfully');
          } catch (error) {
            console.error('Failed to create user:', error);
            const message = error instanceof APIError ? error.message : '사용자 등록 실패';
            get().showToast(message, 'error');
            throw error;
          }
        },

        updateUserRole: async (username: string, role: UserRole) => {
          try {
            const currentUser = get().users.find((u) => u.username === username);
            await usersAPI.update(username, {
              display_name: currentUser?.display_name || username,
              role
            });
            await get().loadUsers();
            get().showToast('권한이 변경되었습니다');
          } catch (error) {
            console.error('Failed to update user role:', error);
            get().showToast('권한 변경 실패', 'error');
            throw error;
          }
        },

        deleteUser: async (username: string) => {
          try {
            await usersAPI.delete(username);
            await get().loadUsers();
            get().showToast('User deleted successfully');
          } catch (error) {
            console.error('Failed to delete user:', error);
            get().showToast('사용자 삭제 실패', 'error');
            throw error;
          }
        },

        updateUserPassword: async (username: string, currentPassword: string, newPassword: string) => {
          try {
            await usersAPI.updatePassword(username, currentPassword, newPassword);
            await get().loadUsers();
            get().showToast('비밀번호가 변경되었습니다');
          } catch (error) {
            console.error('Failed to update user password:', error);
            get().showToast('비밀번호 변경 실패', 'error');
            throw error;
          }
        },

        logout: () => {
          clearAuthToken();
          set({
            user: null,
            role: null,
            isAuthenticated: false,
            authError: null,
            pendingUsers: [],
            contracts: [],
            currentContract: null,
            filteredContracts: [],
            additionalHolidays: [],
            holidayLoadError: null
          });
        },

        // ============================================
        // UI Actions
        // ============================================

        setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

        showToast: (message: string, type: ToastType = 'success') => {
          set({ toast: { message, type } });
          setTimeout(() => set({ toast: null }), 3000);
        },

        hideToast: () => set({ toast: null }),

        setLoading: (loading: boolean) => set({ isLoading: loading }),

        openModal: (modalId: string) => set({ activeModal: modalId }),

        closeModal: () => set({ activeModal: null }),

        // ============================================
        // Contract Actions
        // ============================================

        loadContracts: async () => {
          const { filter, searchText, page, itemsPerPage } = get();
          
          set({ isLoading: true });
          
          try {
            const status = filter === 'all' ? undefined : filter;
            const { contracts, total } = await contractsAPI.getAll({
              search: searchText,
              status,
              page,
              limit: itemsPerPage
            });

            let filtered = contracts;
            if (filter !== 'all') {
              filtered = contracts.filter(c => getContractStatus(c.end_date) === filter);
            }

            set({ 
              contracts: filtered, 
              filteredContracts: filtered,
              totalCount: total,
              isLoading: false 
            });
          } catch (error) {
            console.error('Failed to load contracts:', error);
            set({ isLoading: false });
            get().showToast('데이터 로드 실패', 'error');
          }
        },

        setFilter: (filter: FilterStatus) => {
          set({ filter, page: 1 });
          get().loadContracts();
        },

        setSearchText: (text: string) => {
          set({ searchText: text, page: 1 });
          get().loadContracts();
        },

        setPage: (page: number) => {
          set({ page });
          get().loadContracts();
        },

        createContract: async (contract: Omit<Contract, 'id'>) => {
          set({ isLoading: true });
          try {
            const { id } = await contractsAPI.create(contract);
            await get().loadContracts();
            await get().loadDashboardData();
            set({ isLoading: false });
            get().showToast('Contract created successfully');
            return id;
          } catch (error) {
            console.error('Failed to create contract:', error);
            set({ isLoading: false });
            get().showToast('등록 실패', 'error');
            throw error;
          }
        },

        updateContract: async (id: number, changes: Partial<Contract>) => {
          set({ isLoading: true });
          try {
            await contractsAPI.update(id, changes);
            await get().loadContracts();
            await get().loadDashboardData();
            
            // 현재 선택 계약 업데이트
            const { currentContract } = get();
            if (currentContract?.id === id) {
              const updated = await contractsAPI.getById(id);
              set({ currentContract: updated });
            }
            
            set({ isLoading: false });
            get().showToast('Contract updated successfully');
          } catch (error) {
            console.error('Failed to update contract:', error);
            set({ isLoading: false });
            get().showToast('수정 실패', 'error');
            throw error;
          }
        },

        deleteContract: async (id: number) => {
          set({ isLoading: true });
          try {
            await contractsAPI.delete(id);
            await get().loadContracts();
            await get().loadDashboardData();
            set({ isLoading: false });
            get().showToast('Contract deleted successfully');
          } catch (error) {
            console.error('Failed to delete contract:', error);
            set({ isLoading: false });
            get().showToast('삭제 실패', 'error');
            throw error;
          }
        },

        setCurrentContract: (contract: Contract | null) => {
          set({ currentContract: contract });
        },

        // ============================================
        // Asset Actions
        // ============================================

        addAsset: async (contractId: number, asset: Omit<AssetItem, 'id'>) => {
          set({ isLoading: true });
          try {
            await assetsAPI.create({ ...asset, contract_id: contractId });
            const updated = await contractsAPI.getById(contractId);
            set({ currentContract: updated, isLoading: false });
            await get().loadDashboardData();
            await get().loadAssets();
            get().showToast('Asset created successfully');
          } catch (error) {
            console.error('Failed to add asset:', error);
            set({ isLoading: false });
            get().showToast('등록 실패', 'error');
            throw error;
          }
        },

        updateAsset: async (contractId: number, assetId: number, changes: Partial<AssetItem>) => {
          set({ isLoading: true });
          try {
            await assetsAPI.update(assetId, changes);
            const updated = await contractsAPI.getById(contractId);
            set({ currentContract: updated, isLoading: false });
            await get().loadAssets();
            get().showToast('Asset updated successfully');
          } catch (error) {
            console.error('Failed to update asset:', error);
            set({ isLoading: false });
            get().showToast('수정 실패', 'error');
            throw error;
          }
        },

        deleteAsset: async (contractId: number, assetId: number) => {
          set({ isLoading: true });
          try {
            await assetsAPI.delete(assetId);
            const updated = await contractsAPI.getById(contractId);
            set({ currentContract: updated, isLoading: false });
            await get().loadDashboardData();
            await get().loadAssets();
            get().showToast('Asset deleted successfully');
          } catch (error) {
            console.error('Failed to delete asset:', error);
            set({ isLoading: false });
            get().showToast('삭제 실패', 'error');
            throw error;
          }
        },

        // ============================================
        // Dashboard Actions
        // ============================================

        loadDashboardData: async () => {
          if (!get().isAuthenticated || !hasAuthToken()) return;
          try {
            const { contracts } = await contractsAPI.getAll({ limit: 1000 });
            
            // 통계 계산
            const stats: DashboardStats = {
              totalContracts: contracts.length,
              activeContracts: 0,
              expiringContracts: 0,
              expiredContracts: 0,
              totalAssets: 0,
              hwAssets: 0,
              swAssets: 0
            };

            contracts.forEach(c => {
              const status = getContractStatus(c.end_date);
              if (status === 'active') stats.activeContracts++;
              else if (status === 'expiring') stats.expiringContracts++;
              else if (status === 'expired') stats.expiredContracts++;

              c.items?.forEach((item: AssetItem) => {
                stats.totalAssets++;
                if (item.category === 'HW') stats.hwAssets++;
                else if (item.category === 'SW') stats.swAssets++;
              });
            });

            // 최근 계약
            const recentContracts = contracts
              .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
              .slice(0, 5);

            set({ 
              stats, 
              recentContracts,
              notifications: [],
              unreadCount: 0
            });
          } catch (error) {
            console.error('Failed to load dashboard:', error);
          }
        },

        markNotificationAsRead: async (id: string) => {
          // TODO: 알림 API 구현 후 연동
          console.log('Mark notification as read:', id);
        },

        // ============================================
        // Calendar Actions
        // ============================================

        loadCalendarEvents: async () => {
          try {
            const events = await eventsAPI.getAll();
            const mappedEvents = events.map((event: any) => ({
              ...event,
              createdBy: event.createdBy ?? event.created_by ?? undefined,
              createdByName: event.createdByName ?? event.created_by_name ?? undefined,
              scheduleDivision: event.scheduleDivision ?? event.schedule_division ?? undefined,
              contractId: event.contractId ?? event.contract_id ?? 0,
              assetId: event.assetId ?? event.asset_id ?? undefined,
              customerName: event.customerName ?? event.customer_name ?? event.contract_customer_name ?? '',
              location: event.location ?? '',
              supportHours: event.supportHours ?? event.support_hours ?? undefined
            }));
            set({ calendarEvents: mappedEvents });
          } catch (error) {
            console.error('Failed to load calendar events:', error);
          }
        },

        createCalendarEvent: async (event) => {
          try {
            const { id } = await eventsAPI.create(event);
            const newEvent = {
              ...event,
              id,
              createdBy: get().user?.username || event.assignee || undefined,
              createdByName: get().user?.display_name || undefined
            };
            set((state) => ({
              calendarEvents: [...state.calendarEvents, newEvent]
            }));
          } catch (error) {
            console.error('Failed to create calendar event:', error);
            throw error;
          }
        },

        updateCalendarEvent: async (id, changes) => {
          try {
            await eventsAPI.update(id, changes);
            set((state) => ({
              calendarEvents: state.calendarEvents.map(e =>
                e.id === id ? { ...e, ...changes } : e
              )
            }));
          } catch (error) {
            console.error('Failed to update calendar event:', error);
            throw error;
          }
        },

        deleteCalendarEvent: async (id) => {
          try {
            await eventsAPI.delete(id);
            set((state) => ({
              calendarEvents: state.calendarEvents.filter(e => e.id !== id)
            }));
          } catch (error) {
            console.error('Failed to delete calendar event:', error);
            throw error;
          }
        },

        generateCalendarEventsFromData: async () => {
          try {
            await eventsAPI.generateContractEndEvents();
            
            await get().loadCalendarEvents();
            
            get().showToast('계약 종료 일정을 자동 생성했습니다', 'success');
            return 1;
          } catch (error) {
            console.error('Failed to generate calendar events:', error);
            get().showToast('일정 자동 생성 실패', 'error');
            throw error;
          }
        },

        loadAdditionalHolidays: async () => {
          if (!get().isAuthenticated || !hasAuthToken()) {
            set({ additionalHolidays: [], holidayLoadError: null });
            return;
          }
          try {
            console.log('Loading holidays from API...');
            const holidays = await holidaysAPI.getAll();
            console.log('Loaded holidays from API:', holidays.length, holidays.map((h: any) => ({ id: h.id, date: h.date, name: h.name, type: h.type })));
            const mappedHolidays = holidays
              .map((holiday: any) => ({
                id: String(holiday.id),
                date: holiday.date,
                name: holiday.name,
                type: (holiday.type || 'company') as HolidayType,
                created_at: holiday.created_at,
                updated_at: holiday.updated_at
              }))
              .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
            console.log('Mapped holidays:', mappedHolidays.length, mappedHolidays.map((h: any) => ({ id: h.id, date: h.date, name: h.name, type: h.type })));
            set({
              additionalHolidays: mappedHolidays,
              holidayLoadError: null
            });
            // Verify set worked
            setTimeout(() => {
              console.log('Store state after set:', get().additionalHolidays.length, get().additionalHolidays);
            }, 0);
          } catch (error) {
            console.error('Failed to load additional holidays:', error);
            set({ 
              additionalHolidays: [],
              holidayLoadError: '추가 공휴일 데이터를 불러오지 못했습니다. 새로고침 또는 재로그인이 필요할 수 있습니다.' 
            });
          }
        },

        addAdditionalHoliday: async (holiday) => {
          try {
            console.log('Creating holiday:', holiday);
            const result = await holidaysAPI.create({
              date: holiday.date,
              name: holiday.name,
              type: (holiday.type || 'company') as HolidayType
            });
            console.log('Holiday created:', result);
            console.log('Reloading holidays...');
            await get().loadAdditionalHolidays();
            console.log('Holidays reloaded, current state:', get().additionalHolidays);
            get().showToast('추가 공휴일이 등록되었습니다', 'success');
          } catch (error) {
            console.error('Failed to add holiday:', error);
            get().showToast('공휴일 등록 실패', 'error');
            throw error;
          }
        },

        updateAdditionalHoliday: async (id, changes) => {
          try {
            await holidaysAPI.update(id, {
              date: changes.date || '',
              name: changes.name || '',
              type: ((changes.type || 'company') as HolidayType)
            });
            await get().loadAdditionalHolidays();
            get().showToast('공휴일 정보가 수정되었습니다', 'success');
          } catch (error) {
            console.error('Failed to update holiday:', error);
            get().showToast('공휴일 수정 실패', 'error');
            throw error;
          }
        },

        deleteAdditionalHoliday: async (id) => {
          try {
            await holidaysAPI.delete(id);
            await get().loadAdditionalHolidays();
            get().showToast('공휴일이 삭제되었습니다', 'success');
          } catch (error) {
            console.error('Failed to delete holiday:', error);
            get().showToast('공휴일 삭제 실패', 'error');
            throw error;
          }
        },

        // ============================================
        // Independent Asset Management Actions
        // ============================================

        loadAssets: async () => {
          const { assetFilter, assetSearchText, assetPage, assetItemsPerPage } = get();
          
          set({ isLoading: true });
          
          try {
            const category = assetFilter === 'all' ? undefined : assetFilter;
            const { assets, total } = await assetsAPI.getAll({
              category,
              search: assetSearchText,
              page: assetPage,
              limit: assetItemsPerPage
            });

            set({ 
              assets: assets.map(a => ({
                ...a,
                contractId: a.contract_id,
                customerName: a.customer_name,
                projectTitle: a.project_title
              })), 
              totalAssets: total,
              isLoading: false 
            });
          } catch (error) {
            console.error('Failed to load assets:', error);
            set({ isLoading: false });
            get().showToast('자산 데이터 로드 실패', 'error');
          }
        },

        setAssetFilter: (filterValue: 'all' | AssetCategory) => {
          set({ assetFilter: filterValue, assetPage: 1 });
          get().loadAssets();
        },

        setAssetSearchText: (text: string) => {
          set({ assetSearchText: text, assetPage: 1 });
          get().loadAssets();
        },

        setAssetPage: (page: number) => {
          set({ assetPage: page });
          get().loadAssets();
        },

        // ============================================
        // Project Member Actions
        // ============================================

        loadProjectMembers: async (contractId?: number) => {
          try {
            const members = await membersAPI.getAll(contractId ? { contract_id: contractId } : undefined);
            set({ projectMembers: members });
          } catch (error) {
            console.error('Failed to load project members:', error);
            get().showToast('프로젝트 현황 로드 실패', 'error');
          }
        },

        createProjectMember: async (member: Omit<ProjectMember, 'id' | 'created_at' | 'updated_at'>) => {
          try {
            await membersAPI.create(member);
            await get().loadProjectMembers(member.contract_id);
            get().showToast('Project member created successfully');
          } catch (error) {
            console.error('Failed to create project member:', error);
            get().showToast('프로젝트 현황 등록 실패', 'error');
            throw error;
          }
        },

        updateProjectMember: async (id: number, changes: Partial<ProjectMember>) => {
          try {
            await membersAPI.update(id, changes);
            const { projectMembers } = get();
            const member = projectMembers.find(m => m.id === id);
            if (member) {
              await get().loadProjectMembers(member.contract_id);
            }
            get().showToast('Project member updated successfully');
          } catch (error) {
            console.error('Failed to update project member:', error);
            get().showToast('프로젝트 현황 수정 실패', 'error');
            throw error;
          }
        },

        deleteProjectMember: async (id: number) => {
          try {
            const { projectMembers } = get();
            const member = projectMembers.find(m => m.id === id);
            const contractId = member?.contract_id;
            await membersAPI.delete(id);
            if (contractId) {
              await get().loadProjectMembers(contractId);
            }
            get().showToast('Project member deleted successfully');
          } catch (error) {
            console.error('Failed to delete project member:', error);
            get().showToast('프로젝트 현황 삭제 실패', 'error');
            throw error;
          }
        },

        setSelectedContractId: (contractId: number | null) => {
          set({ selectedContractId: contractId });
        }
      }),
      {
        name: 'ims-storage',
        partialize: (state) => ({ 
          user: state.user, 
          role: state.role, 
          isAuthenticated: state.isAuthenticated
        }),
        onRehydrateStorage: () => (state) => {
          console.log('Store rehydrated, additionalHolidays:', state?.additionalHolidays?.length);
          if (state && hasAuthToken()) {
            // Reload holidays after rehydration if authenticated
            setTimeout(() => {
              console.log('Reloading holidays after rehydration...');
              state.loadAdditionalHolidays?.();
            }, 0);
          }
        }
      }
    ),
    { name: 'IMS Store' }
  )
);




