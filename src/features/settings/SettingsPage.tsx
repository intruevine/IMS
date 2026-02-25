import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/core/state/store';
import { assetsAPI, contractsAPI, eventsAPI, membersAPI } from '@/core/api/client';
import { Button, Card, CardHeader, ConfirmModal, Input, Modal } from '@/shared/components/ui';
import type { User, UserRole, HolidayType } from '@/types';

function formatDateSafe(value: unknown, fallback = '-') {
  if (!value) return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return format(date, 'yyyy.MM.dd');
}

async function fetchAllContracts() {
  const limit = 200;
  let page = 1;
  let total = 0;
  const all: any[] = [];

  do {
    const response = await contractsAPI.getAll({ page, limit });
    total = response.total || 0;
    all.push(...(response.contracts || []));
    if (!response.contracts?.length) break;
    page += 1;
  } while (all.length < total);

  return all;
}

async function fetchAllAssets() {
  const limit = 200;
  let page = 1;
  let total = 0;
  const all: any[] = [];

  do {
    const response = await assetsAPI.getAll({ page, limit });
    total = response.total || 0;
    all.push(...(response.assets || []));
    if (!response.assets?.length) break;
    page += 1;
  } while (all.length < total);

  return all;
}

const iconButtonClass =
  'w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50';

const SettingsPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const users = useAppStore((state) => state.users);
  const pendingUsers = useAppStore((state) => state.pendingUsers);
  const logout = useAppStore((state) => state.logout);
  const showToast = useAppStore((state) => state.showToast);
  const loadUsers = useAppStore((state) => state.loadUsers);
  const loadPendingUsers = useAppStore((state) => state.loadPendingUsers);
  const approveUserRequest = useAppStore((state) => state.approveUserRequest);
  const rejectUserRequest = useAppStore((state) => state.rejectUserRequest);
  const updateUserRole = useAppStore((state) => state.updateUserRole);
  const updateUserPassword = useAppStore((state) => state.updateUserPassword);
  const deleteUser = useAppStore((state) => state.deleteUser);
  const additionalHolidays = useAppStore((state) => state.additionalHolidays);
  const addAdditionalHoliday = useAppStore((state) => state.addAdditionalHoliday);
  const updateAdditionalHoliday = useAppStore((state) => state.updateAdditionalHoliday);
  const deleteAdditionalHoliday = useAppStore((state) => state.deleteAdditionalHoliday);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editPassword, setEditPassword] = useState('');

  const [dataStats, setDataStats] = useState({
    contracts: 0,
    assets: 0,
    events: 0
  });

  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    type: 'company' as HolidayType
  });
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [pendingRoleByUser, setPendingRoleByUser] = useState<Record<string, UserRole>>({});

  const loadStats = async () => {
    if (!isAuthenticated) {
      setDataStats({ contracts: 0, assets: 0, events: 0 });
      return;
    }

    try {
      const [contractsMeta, assetsMeta, events] = await Promise.all([
        contractsAPI.getAll({ limit: 1 }),
        assetsAPI.getAll({ limit: 1 }),
        eventsAPI.getAll()
      ]);

      setDataStats({
        contracts: contractsMeta.total || 0,
        assets: assetsMeta.total || 0,
        events: events?.length || 0
      });
    } catch (error) {
      console.error('Failed to load API stats:', error);
      showToast('통계 로드에 실패했습니다', 'error');
    }
  };

  useEffect(() => {
    loadStats();
    if (isAuthenticated && role === 'admin') {
      loadUsers();
      loadPendingUsers();
    }
  }, [isAuthenticated, role, loadUsers, loadPendingUsers]);

  const handleExportData = async () => {
    try {
      const [contracts, assets, events, members] = await Promise.all([
        fetchAllContracts(),
        fetchAllAssets(),
        eventsAPI.getAll(),
        membersAPI.getAll()
      ]);

      const data = {
        contracts,
        assets,
        events,
        members,
        exportDate: new Date().toISOString(),
        version: '2.0.0',
        source: 'mariadb-api'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ims-backup-${format(new Date(), 'yyyyMMdd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('데이터를 백업했습니다', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('백업 중 오류가 발생했습니다', 'error');
    }
  };

  const handleResetData = async () => {
    if (role !== 'admin') return;
    const ok = window.confirm('모든 계약/자산/일정/멤버 데이터를 삭제합니다. 계속할까요?');
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const [contracts, events, members] = await Promise.all([
        fetchAllContracts(),
        eventsAPI.getAll(),
        membersAPI.getAll()
      ]);

      for (const member of members) {
        if (member?.id) await membersAPI.delete(member.id);
      }
      for (const event of events) {
        if (event?.id) await eventsAPI.delete(event.id);
      }
      for (const contract of contracts) {
        if (contract?.id) await contractsAPI.delete(contract.id);
      }

      await loadStats();
      showToast('전체 데이터를 초기화했습니다', 'success');
    } catch (error) {
      console.error('Reset error:', error);
      showToast('초기화 중 오류가 발생했습니다', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (target: User) => {
    setSelectedUser(target);
    setEditRole((target.role || 'user') as UserRole);
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  const handleSaveUserEdit = async () => {
    if (!selectedUser) return;

    if (editPassword && editPassword.length < 4) {
      showToast('비밀번호는 4자 이상이어야 합니다', 'warning');
      return;
    }

    try {
      if ((selectedUser.role || 'user') !== editRole) {
        await updateUserRole(selectedUser.username, editRole);
      }
      if (editPassword) {
        await updateUserPassword(selectedUser.username, '', editPassword);
      }
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setEditPassword('');
      showToast('사용자 정보를 수정했습니다', 'success');
    } catch {
      // store handles toast
    }
  };

  const handleDeleteUser = async (username: string) => {
    const ok = window.confirm(`${username} 사용자를 삭제할까요?`);
    if (!ok) return;
    try {
      await deleteUser(username);
      showToast('사용자를 삭제했습니다', 'success');
    } catch {
      // store handles toast
    }
  };

  const handleApprovePendingUser = async (username: string) => {
    const selectedRole = pendingRoleByUser[username] || 'user';
    try {
      await approveUserRequest(username, selectedRole);
      setPendingRoleByUser((prev) => {
        const next = { ...prev };
        delete next[username];
        return next;
      });
    } catch {
      // store handles toast
    }
  };

  const handleRejectPendingUser = async (username: string) => {
    const ok = window.confirm(`${username} 가입 요청을 반려할까요?`);
    if (!ok) return;
    try {
      await rejectUserRequest(username);
    } catch {
      // store handles toast
    }
  };

  const resetHolidayForm = () => {
    setHolidayForm({ date: '', name: '', type: 'company' });
    setEditingHolidayId(null);
  };

  const handleSaveHoliday = () => {
    const date = holidayForm.date.trim();
    const name = holidayForm.name.trim();
    if (!date || !name) {
      showToast('공휴일 날짜와 이름을 입력해 주세요', 'warning');
      return;
    }

    if (editingHolidayId) {
      updateAdditionalHoliday(editingHolidayId, {
        date,
        name,
        type: holidayForm.type
      });
    } else {
      addAdditionalHoliday({
        date,
        name,
        type: holidayForm.type
      });
    }
    resetHolidayForm();
  };

  const handleEditHoliday = (id: string) => {
    const target = additionalHolidays.find((item) => item.id === id);
    if (!target) return;
    setHolidayForm({
      date: target.date,
      name: target.name,
      type: target.type
    });
    setEditingHolidayId(target.id);
  };

  const handleDeleteHoliday = (id: string, name: string) => {
    const ok = window.confirm(`"${name}" 공휴일을 삭제할까요?`);
    if (!ok) return;
    deleteAdditionalHoliday(id);
    if (editingHolidayId === id) {
      resetHolidayForm();
    }
  };

  const handleLogoutConfirm = () => {
    setIsLogoutConfirmOpen(false);
    logout();
    showToast('로그아웃되었습니다', 'success');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">설정</h1>
        <p className="text-slate-500 mt-1">시스템 계정/데이터 관리</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="내 정보" subtitle="로그인 계정 정보" />
          <div className="space-y-3 text-sm">
            <p><span className="text-slate-500">이름:</span> {user?.display_name || '-'}</p>
            <p><span className="text-slate-500">아이디:</span> {user?.username || '-'}</p>
            <p><span className="text-slate-500">권한:</span> {role || '-'}</p>
            <Button variant="secondary" className="w-full" onClick={() => setIsLogoutConfirmOpen(true)}>
              로그아웃
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="데이터 관리" subtitle="MariaDB API 기반 통계/백업/초기화" />
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              <p>계약: {dataStats.contracts}개</p>
              <p>자산: {dataStats.assets}개</p>
              <p>일정: {dataStats.events}개</p>
            </div>
            <Button variant="secondary" className="w-full" onClick={handleExportData}>
              백업(JSON 다운로드)
            </Button>
            {role === 'admin' && (
              <Button
                variant="danger"
                className="w-full"
                onClick={handleResetData}
                isLoading={isSubmitting}
              >
                전체 데이터 초기화
              </Button>
            )}
          </div>
        </Card>

        {role === 'admin' && (
          <Card className="md:col-span-2">
            <CardHeader
              title="사용자 관리"
              subtitle="계정 수정/삭제"
            />

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">아이디</th>
                    <th className="px-4 py-3 text-left">이름</th>
                    <th className="px-4 py-3 text-left">권한</th>
                    <th className="px-4 py-3 text-left">승인상태</th>
                    <th className="px-4 py-3 text-left">생성일</th>
                    <th className="px-4 py-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u) => (
                    <tr key={u.username}>
                      <td className="px-4 py-3">{u.username}</td>
                      <td className="px-4 py-3">{u.display_name}</td>
                      <td className="px-4 py-3">{u.role || 'user'}</td>
                      <td className="px-4 py-3">
                        {u.approval_status === 'approved' ? '승인' : u.approval_status === 'rejected' ? '반려' : '대기'}
                      </td>
                      <td className="px-4 py-3">{formatDateSafe(u.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className={iconButtonClass}
                            title="수정"
                            onClick={() => openEditModal(u)}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          {u.username !== user?.username && (
                            <button
                              type="button"
                              className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
                              title="삭제"
                              onClick={() => handleDeleteUser(u.username)}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {role === 'admin' && (
          <Card className="md:col-span-2">
            <CardHeader title="가입 승인 요청" subtitle="사용자 가입 요청 승인/반려" />
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">아이디</th>
                    <th className="px-4 py-3 text-left">이름</th>
                    <th className="px-4 py-3 text-left">승인 권한</th>
                    <th className="px-4 py-3 text-left">요청일</th>
                    <th className="px-4 py-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={5}>
                        승인 대기 중인 가입 요청이 없습니다.
                      </td>
                    </tr>
                  )}
                  {pendingUsers.map((u) => (
                    <tr key={`pending-${u.username}`}>
                      <td className="px-4 py-3">{u.username}</td>
                      <td className="px-4 py-3">{u.display_name}</td>
                      <td className="px-4 py-3">
                        <select
                          className="input max-w-[120px]"
                          value={pendingRoleByUser[u.username] || 'user'}
                          onChange={(e) =>
                            setPendingRoleByUser((prev) => ({
                              ...prev,
                              [u.username]: e.target.value as UserRole
                            }))
                          }
                        >
                          <option value="user">user</option>\n                          <option value="manager">manager</option>\n                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">{formatDateSafe(u.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="primary" onClick={() => handleApprovePendingUser(u.username)}>
                            승인
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleRejectPendingUser(u.username)}>
                            반려
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {role === 'admin' && (
          <Card className="md:col-span-2">
            <CardHeader
              title="공휴일 관리"
              subtitle="추가 공휴일 등록 및 유형(국가 공휴일/기업휴일) 관리"
            />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_180px_auto] gap-2 items-end">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">날짜</label>
                  <input
                    type="date"
                    className="input"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <Input
                  label="휴일명"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 창립기념일"
                />
                <div>
                  <label className="block text-xs text-slate-500 mb-1">유형</label>
                  <select
                    className="input"
                    value={holidayForm.type}
                    onChange={(e) => setHolidayForm((prev) => ({ ...prev, type: e.target.value as HolidayType }))}
                  >
                    <option value="national">국가 공휴일</option>
                    <option value="company">기업휴일</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={handleSaveHoliday}>
                    {editingHolidayId ? '수정 저장' : '공휴일 추가'}
                  </Button>
                  {editingHolidayId && (
                    <Button variant="secondary" onClick={resetHolidayForm}>
                      취소
                    </Button>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">날짜</th>
                      <th className="px-4 py-3 text-left">휴일명</th>
                      <th className="px-4 py-3 text-left">유형</th>
                      <th className="px-4 py-3 text-left">수정일</th>
                      <th className="px-4 py-3 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {additionalHolidays.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={5}>
                          등록된 추가 공휴일이 없습니다.
                        </td>
                      </tr>
                    )}
                    {additionalHolidays.map((holiday) => (
                      <tr key={holiday.id}>
                        <td className="px-4 py-3">{holiday.date}</td>
                        <td className="px-4 py-3">{holiday.name}</td>
                        <td className="px-4 py-3">{holiday.type === 'national' ? '국가 공휴일' : '기업휴일'}</td>
                        <td className="px-4 py-3">{formatDateSafe(holiday.updated_at || holiday.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              className={iconButtonClass}
                              title="수정"
                              onClick={() => handleEditHoliday(holiday.id)}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
                              title="삭제"
                              onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        <Card className={role === 'admin' ? 'md:col-span-2' : ''}>
          <CardHeader title="시스템 정보" subtitle="버전 및 데이터베이스 정보" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><span className="text-slate-500">버전:</span> v2.0.0</div>
            <div><span className="text-slate-500">빌드 날짜:</span> 2025.02.23</div>
            <div><span className="text-slate-500">데이터베이스:</span> MariaDB (Backend API)</div>
            <div><span className="text-slate-500">React:</span> 18.2.0</div>
            <div><span className="text-slate-500">라이선스:</span> MIT</div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
          setEditPassword('');
        }}
        title="사용자 수정"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedUser(null);
                setEditPassword('');
              }}
            >
              취소
            </Button>
            <Button variant="primary" onClick={handleSaveUserEdit}>
              저장
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="아이디" value={selectedUser?.username || ''} disabled />
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">권한</label>
            <select
              className="input"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
            >
              <option value="user">user</option>\n                          <option value="manager">manager</option>\n                          <option value="admin">admin</option>
            </select>
          </div>
          <Input
            label="새 비밀번호 (선택)"
            type="password"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            placeholder="변경할 때만 입력 (4자 이상)"
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmText="로그아웃"
        cancelText="취소"
      />
    </div>
  );
};

export default SettingsPage;

