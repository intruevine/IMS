import Dexie, { Table } from 'dexie';
import type { 
  Contract, 
  AssetItem, 
  CalendarEvent, 
  Notification,
  VersionHistory,
  User,
  ProjectMember
} from '@/types';

export class IMSDatabase extends Dexie {
  contracts!: Table<Contract, number>;
  assets!: Table<AssetItem, number>;
  events!: Table<CalendarEvent, string>;
  notifications!: Table<Notification, string>;
  versions!: Table<VersionHistory<Contract | AssetItem>, number>;
  users!: Table<User, string>;
  projectMembers!: Table<ProjectMember, number>;
  syncQueue!: Table<{
    id?: number;
    operation: 'create' | 'update' | 'delete';
    entityType: 'contract' | 'asset';
    entityId: number;
    data: unknown;
    timestamp: number;
    synced: boolean;
  }, number>;

  constructor() {
    super('intruevine_ims');
    
    this.version(2).stores({
      contracts: '++id, customer_name, project_title, project_type, start_date, end_date, created_at',
      assets: '++id, category, item, product, cycle',
      events: '++id, contractId, assetId, type, start, status',
      notifications: '++id, type, severity, read, created_at',
      versions: '++id, entity_id, entity_type, version, created_at, change_type',
      users: 'username, display_name, role',
      projectMembers: '++id, contract_id, member_name, status, start_date, end_date',
      syncQueue: '++id, operation, entityType, entityId, timestamp, synced'
    });
  }

  // ============================================
  // 계약 관련 메서드
  // ============================================

  async getContracts(filters?: {
    status?: 'active' | 'expiring' | 'expired';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ contracts: Contract[]; total: number }> {
    let query = this.contracts.toCollection();

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      query = this.contracts
        .filter(c => 
          c.customer_name.toLowerCase().includes(searchLower) ||
          c.project_title.toLowerCase().includes(searchLower)
        );
    }

    const allContracts = await query.toArray();
    const total = allContracts.length;

    // 페이지네이션
    let contracts = allContracts;
    if (filters?.page && filters?.limit) {
      const start = (filters.page - 1) * filters.limit;
      contracts = contracts.slice(start, start + filters.limit);
    }

    return { contracts, total };
  }

  async getContractById(id: number): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async createContract(contract: Omit<Contract, 'id'>): Promise<number> {
    const id = await this.contracts.add(contract as Contract);
    await this.addToSyncQueue('create', 'contract', id, contract);
    await this.createVersion(id, 'contract', contract as Contract, 'create');
    return id;
  }

  async updateContract(id: number, changes: Partial<Contract>): Promise<void> {
    const existing = await this.contracts.get(id);
    if (!existing) throw new Error('Contract not found');
    
    await this.contracts.update(id, changes);
    await this.addToSyncQueue('update', 'contract', id, { ...existing, ...changes });
    await this.createVersion(id, 'contract', { ...existing, ...changes } as Contract, 'update', changes);
  }

  async deleteContract(id: number): Promise<void> {
    const existing = await this.contracts.get(id);
    if (!existing) throw new Error('Contract not found');
    
    await this.contracts.delete(id);
    await this.assets.where('id').anyOf(existing.items.map(i => i.id)).delete();
    await this.addToSyncQueue('delete', 'contract', id, existing);
  }

  // ============================================
  // 자산 관련 메서드
  // ============================================

  async getAssetsByContract(contractId: number): Promise<AssetItem[]> {
    const contract = await this.contracts.get(contractId);
    return contract?.items || [];
  }

  async getAllAssets(filters?: {
    category?: 'HW' | 'SW';
    search?: string;
    cycle?: string;
    page?: number;
    limit?: number;
  }): Promise<{ assets: Array<AssetItem & { contractId: number; customerName: string; projectTitle: string }>; total: number }> {
    const contracts = await this.contracts.toArray();
    
    let allAssets: Array<AssetItem & { contractId: number; customerName: string; projectTitle: string }> = [];
    
    contracts.forEach(contract => {
      contract.items.forEach(asset => {
        allAssets.push({
          ...asset,
          contractId: contract.id,
          customerName: contract.customer_name,
          projectTitle: contract.project_title
        });
      });
    });

    // 필터링
    if (filters?.category) {
      allAssets = allAssets.filter(a => a.category === filters.category);
    }
    
    if (filters?.cycle) {
      allAssets = allAssets.filter(a => a.cycle === filters.cycle);
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      allAssets = allAssets.filter(a => 
        a.item.toLowerCase().includes(searchLower) ||
        a.product.toLowerCase().includes(searchLower) ||
        a.customerName.toLowerCase().includes(searchLower) ||
        a.engineer?.main?.name?.toLowerCase().includes(searchLower)
      );
    }

    const total = allAssets.length;

    // 페이지네이션
    if (filters?.page && filters?.limit) {
      const start = (filters.page - 1) * filters.limit;
      allAssets = allAssets.slice(start, start + filters.limit);
    }

    return { assets: allAssets, total };
  }

  async getAssetById(contractId: number, assetId: number): Promise<(AssetItem & { contractId: number; customerName: string; projectTitle: string }) | undefined> {
    const contract = await this.contracts.get(contractId);
    if (!contract) return undefined;
    
    const asset = contract.items.find(a => a.id === assetId);
    if (!asset) return undefined;
    
    return {
      ...asset,
      contractId: contract.id,
      customerName: contract.customer_name,
      projectTitle: contract.project_title
    };
  }

  async addAsset(contractId: number, asset: Omit<AssetItem, 'id'>): Promise<void> {
    const contract = await this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');
    
    const newAsset = { ...asset, id: Date.now() } as AssetItem;
    contract.items.push(newAsset);
    
    await this.contracts.update(contractId, { items: contract.items });
    await this.createVersion(contractId, 'asset', newAsset, 'create');
  }

  async updateAsset(contractId: number, assetId: number, changes: Partial<AssetItem>): Promise<void> {
    const contract = await this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');
    
    const assetIndex = contract.items.findIndex(a => a.id === assetId);
    if (assetIndex === -1) throw new Error('Asset not found');
    
    const existing = contract.items[assetIndex];
    const updated = { ...existing, ...changes };
    contract.items[assetIndex] = updated;
    
    await this.contracts.update(contractId, { items: contract.items });
    await this.createVersion(contractId, 'asset', updated, 'update', changes);
  }

  async deleteAsset(contractId: number, assetId: number): Promise<void> {
    const contract = await this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');
    
    const asset = contract.items.find(a => a.id === assetId);
    if (!asset) throw new Error('Asset not found');
    
    contract.items = contract.items.filter(a => a.id !== assetId);
    await this.contracts.update(contractId, { items: contract.items });
    await this.createVersion(contractId, 'asset', asset, 'delete');
  }

  // ============================================
  // 캘린더 관련 메서드
  // ============================================

  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    return this.events
      .where('start')
      .between(startDate, endDate)
      .toArray();
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    await this.events.add({ ...event, id });
    return id;
  }

  // ============================================
  // 알림 관련 메서드
  // ============================================

  async getUnreadNotifications(): Promise<Notification[]> {
    return this.notifications
      .where('read')
      .equals(0)
      .reverse()
      .toArray();
  }

  async createNotification(notification: Omit<Notification, 'id'>): Promise<void> {
    await this.notifications.add({
      ...notification,
      id: crypto.randomUUID()
    });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.notifications.update(id, { read: true });
  }

  // ============================================
  // 버전 관리
  // ============================================

  private async createVersion(
    entityId: number,
    entityType: 'contract' | 'asset',
    data: Contract | AssetItem,
    changeType: 'create' | 'update' | 'delete',
    diff?: Partial<Contract | AssetItem>
  ): Promise<void> {
    const versions = await this.versions
      .where({ entity_id: entityId, entity_type: entityType })
      .toArray();
    
    const version = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;
    
    await this.versions.add({
      entity_id: entityId,
      entity_type: entityType,
      data,
      version,
      created_at: new Date().toISOString(),
      created_by: 'current_user', // TODO: 실제 사용자 정보로 대체
      change_type: changeType,
      diff: diff || {}
    } as VersionHistory<Contract | AssetItem>);
  }

  async getVersionHistory(entityId: number, entityType: 'contract' | 'asset'): Promise<VersionHistory<Contract | AssetItem>[]> {
    return this.versions
      .where({ entity_id: entityId, entity_type: entityType })
      .reverse()
      .toArray();
  }

  // ============================================
  // 동기화 큐
  // ============================================

  private async addToSyncQueue(
    operation: 'create' | 'update' | 'delete',
    entityType: 'contract' | 'asset',
    entityId: number,
    data: unknown
  ): Promise<void> {
    await this.syncQueue.add({
      operation,
      entityType,
      entityId,
      data,
      timestamp: Date.now(),
      synced: false
    });
  }

  async getPendingSyncs(): Promise<Array<{
    id?: number;
    operation: 'create' | 'update' | 'delete';
    entityType: 'contract' | 'asset';
    entityId: number;
    data: unknown;
    timestamp: number;
    synced: boolean;
  }>> {
    return this.syncQueue
      .where('synced')
      .equals(0)
      .toArray();
  }

  async markAsSynced(id: number): Promise<void> {
    await this.syncQueue.update(id, { synced: true });
  }

  // ============================================
  // 캘린더 이벤트 관련 메서드
  // ============================================

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return this.events.toArray();
  }

  async addCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    await this.events.add({ ...event, id } as CalendarEvent);
    return id;
  }

  async updateCalendarEvent(id: string, changes: Partial<CalendarEvent>): Promise<void> {
    await this.events.update(id, changes);
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    await this.events.delete(id);
  }

  // ============================================
  // 자동 캘린더 이벤트 생성
  // ============================================

  async generateContractEndEvents(): Promise<number> {
    const contracts = await this.contracts.toArray();
    const existingEvents = await this.events.toArray();
    let createdCount = 0;

    for (const contract of contracts) {
      // 이미 해당 계약의 종료일 이벤트가 있는지 확인
      const hasExistingEvent = existingEvents.some(e => 
        e.contractId === contract.id && e.type === 'contract_end' && 
        e.start.startsWith(contract.end_date)
      );

      if (!hasExistingEvent) {
        await this.events.add({
          id: crypto.randomUUID(),
          title: `[${contract.customer_name}] 계약 만료`,
          type: 'contract_end',
          start: `${contract.end_date}T09:00:00`,
          end: `${contract.end_date}T18:00:00`,
          contractId: contract.id,
          status: 'scheduled',
          description: `프로젝트: ${contract.project_title}\n계약 갱신 준비 필요`
        } as CalendarEvent);
        createdCount++;
      }
    }

    return createdCount;
  }

  async generateInspectionEvents(months: number = 3): Promise<number> {
    const contracts = await this.contracts.toArray();
    const existingEvents = await this.events.toArray();
    let createdCount = 0;
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    for (const contract of contracts) {
      for (const asset of contract.items) {
        // 점검 주기별 날짜 계산
        const cycleMonths = this.getCycleInMonths(asset.cycle);
        if (cycleMonths === 0) continue; // '장애시'는 자동 생성 제외

        let currentDate = new Date(contract.start_date);
        
        while (currentDate <= endDate) {
          // 이미 해당 날짜의 점검 이벤트가 있는지 확인
          const dateStr = currentDate.toISOString().split('T')[0];
          const hasExistingEvent = existingEvents.some(e => 
            e.contractId === contract.id && e.assetId === asset.id && 
            e.type === 'inspection' && e.start.startsWith(dateStr)
          );

          if (!hasExistingEvent && currentDate >= now) {
            await this.events.add({
              id: crypto.randomUUID(),
              title: `[${contract.customer_name}] ${asset.item} 점검`,
              type: 'inspection',
              start: `${dateStr}T10:00:00`,
              end: `${dateStr}T12:00:00`,
              contractId: contract.id,
              assetId: asset.id,
              status: 'scheduled',
              description: `품목: ${asset.item}\n모델: ${asset.product}\n주기: ${asset.cycle}\n엔지니어: ${asset.engineer?.main?.name || '미정'}`
            } as CalendarEvent);
            createdCount++;
          }

          // 다음 점검일 계산
          currentDate.setMonth(currentDate.getMonth() + cycleMonths);
        }
      }
    }

    return createdCount;
  }

  private getCycleInMonths(cycle: string): number {
    const cycleMap: Record<string, number> = {
      '월': 1,
      '분기': 3,
      '반기': 6,
      '연': 12,
      '장애시': 0
    };
    return cycleMap[cycle] || 0;
  }

  // ============================================
  // 사용자 관리 메서드
  // ============================================

  async getUsers(): Promise<User[]> {
    return this.users.toArray();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.get(username);
  }

  async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    await this.users.add({
      ...user,
      created_at: now,
      updated_at: now
    });
  }

  async updateUser(username: string, changes: Partial<Omit<User, 'username'>>): Promise<void> {
    const user = await this.users.get(username);
    if (!user) throw new Error('사용자를 찾을 수 없습니다');
    
    await this.users.update(username, {
      ...changes,
      updated_at: new Date().toISOString()
    });
  }

  async deleteUser(username: string): Promise<void> {
    await this.users.delete(username);
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.users.get(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  async hasUsers(): Promise<boolean> {
    const count = await this.users.count();
    return count > 0;
  }

  // ============================================
  // 초기 데이터
  // ============================================

  async seedInitialData(): Promise<void> {
    const count = await this.contracts.count();
    if (count > 0) return;

    // 기본 관리자 계정 생성 (없는 경우)
    const hasUsers = await this.hasUsers();
    if (!hasUsers) {
      await this.createUser({
        username: 'admin',
        display_name: '통합관리자',
        password: 'admin',
        role: 'admin'
      });
      await this.createUser({
        username: 'user',
        display_name: '일반사용자',
        password: 'user',
        role: 'user'
      });
    }

    const defaultContract: Contract = {
      id: 1,
      customer_name: '한국전자',
      project_title: '2025년 통합보안 유지보수',
      project_type: 'maintenance',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      notes: '정상 진행 중',
      items: [{
        id: 101,
        category: 'HW',
        item: '방화벽',
        product: 'AXGATE 1300S',
        details: [{ content: 'AXGATE 1300S Main Unit', qty: '2', unit: 'ea' }],
        qty: 2,
        cycle: '월',
        scope: 'HW 무상 지원 포함',
        remark: '특이사항 없음',
        company: '이테크시스템',
        engineer: {
          main: { name: '이복한', rank: '차장', phone: '010-9192-1348', email: 'bhlee@physis.kr' },
          sub: { name: '김철수', rank: '사원', phone: '010-1111-2222', email: 'kim@test.com' }
        },
        sales: { name: '강신주', rank: '부장', phone: '010-4755-0123', email: 'ksj@etechsystem.co.kr' }
      }]
    };

    await this.contracts.add(defaultContract);
  }

  // ============================================
  // 프로젝트 투입 회원 관리 메서드
  // ============================================

  async getProjectMembers(contractId?: number): Promise<ProjectMember[]> {
    if (contractId) {
      return this.projectMembers
        .where('contract_id')
        .equals(contractId)
        .toArray();
    }
    return this.projectMembers.toArray();
  }

  async getProjectMemberById(id: number): Promise<ProjectMember | undefined> {
    return this.projectMembers.get(id);
  }

  async createProjectMember(member: Omit<ProjectMember, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const now = new Date().toISOString();
    const id = await this.projectMembers.add({
      ...member,
      created_at: now,
      updated_at: now
    });
    return id;
  }

  async updateProjectMember(id: number, changes: Partial<Omit<ProjectMember, 'id'>>): Promise<void> {
    const member = await this.projectMembers.get(id);
    if (!member) throw new Error('프로젝트 투입 회원을 찾을 수 없습니다');
    
    await this.projectMembers.update(id, {
      ...changes,
      updated_at: new Date().toISOString()
    });
  }

  async deleteProjectMember(id: number): Promise<void> {
    await this.projectMembers.delete(id);
  }

  async getActiveProjectMembers(): Promise<ProjectMember[]> {
    return this.projectMembers
      .where('status')
      .equals('active')
      .toArray();
  }
}

export const db = new IMSDatabase();
