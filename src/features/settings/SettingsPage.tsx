import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/core/state/store';
import { assetsAPI, contractsAPI, eventsAPI, holidaysAPI, membersAPI, systemSettingsAPI } from '@/core/api/client';
import { Button, Card, CardHeader, ConfirmModal, Input, Modal } from '@/shared/components/ui';
import { downloadCsv, readCsvFile } from '@/shared/utils/csv';
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

function toDateInputValue(value: string) {
  const raw = String(value || '').trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return '';
}

function normalizeHolidayUploadDate(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    const asInt = String(Math.trunc(value));
    if (/^\d{8}$/.test(asInt)) {
      return asInt;
    }
    return '';
  }

  const raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{8}$/.test(raw)) return raw;
  if (/^\d{4}[-./]\d{2}[-./]\d{2}$/.test(raw)) return raw.replace(/[-./]/g, '');
  const digitsOnly = raw.replace(/\D/g, '');
  if (/^\d{8}$/.test(digitsOnly)) return digitsOnly;
  if (!/\d{4}/.test(raw)) return '';

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) return '';
  const year = String(parsedDate.getFullYear());
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function normalizeHolidayUploadType(value: unknown): HolidayType {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'national' || raw === '국가' || raw === '국가공휴일' || raw === '국가 공휴일') {
    return 'national';
  }
  return 'company';
}

function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().replace(/[\s_\-()]/g, '');
}

function pickHolidayCellFlexible(row: Record<string, unknown>, keys: string[]): unknown {
  const normalizedRow = new Map<string, unknown>();
  Object.entries(row).forEach(([rawKey, value]) => {
    normalizedRow.set(normalizeHeaderKey(rawKey), value);
  });

  for (const key of keys) {
    const value = normalizedRow.get(normalizeHeaderKey(key));
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  // Fallback: no header/unknown header -> use first columns (date, name, type order)
  const values = Object.values(row);
  if (keys.includes('date') || keys.includes('날짜')) return values[0] ?? '';
  if (keys.includes('name') || keys.includes('휴일명')) return values[1] ?? '';
  if (keys.includes('type') || keys.includes('유형')) return values[2] ?? '';
  return '';
}
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
  const loadAdditionalHolidays = useAppStore((state) => state.loadAdditionalHolidays);
  const addAdditionalHoliday = useAppStore((state) => state.addAdditionalHoliday);
  const updateAdditionalHoliday = useAppStore((state) => state.updateAdditionalHoliday);
  const deleteAdditionalHoliday = useAppStore((state) => state.deleteAdditionalHoliday);
  const clearAdditionalHolidays = useAppStore((state) => state.clearAdditionalHolidays);

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
  const defaultBrandLogoSrc = `${import.meta.env.BASE_URL}icon-192x192.png`;
  const [brandLogoSrc, setBrandLogoSrc] = useState(defaultBrandLogoSrc);
  const [isBrandLogoSubmitting, setIsBrandLogoSubmitting] = useState(false);
  const brandLogoInputRef = useRef<HTMLInputElement | null>(null);

  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    type: 'company' as HolidayType
  });
  const [userPage, setUserPage] = useState(1);
  const [holidayPage, setHolidayPage] = useState(1);
  const holidayUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isHolidayUploadSubmitting, setIsHolidayUploadSubmitting] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [pendingRoleByUser, setPendingRoleByUser] = useState<Record<string, UserRole>>({});
  const USER_PAGE_SIZE = 5;
  const HOLIDAY_PAGE_SIZE = 5;
  const totalUserPages = Math.max(1, Math.ceil(users.length / USER_PAGE_SIZE));
  const totalHolidayPages = Math.max(1, Math.ceil(additionalHolidays.length / HOLIDAY_PAGE_SIZE));
  const pagedUsers = useMemo(
    () => users.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE),
    [users, userPage]
  );
  const pagedHolidays = useMemo(
    () => additionalHolidays.slice((holidayPage - 1) * HOLIDAY_PAGE_SIZE, holidayPage * HOLIDAY_PAGE_SIZE),
    [additionalHolidays, holidayPage]
  );

  useEffect(() => {
    if (userPage > totalUserPages) setUserPage(totalUserPages);
  }, [userPage, totalUserPages]);

  useEffect(() => {
    if (holidayPage > totalHolidayPages) setHolidayPage(totalHolidayPages);
  }, [holidayPage, totalHolidayPages]);

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
      console.error('API 통계 로드 실패:', error);
      showToast('통계 로드에 실패했습니다', 'error');
    }
  };

  useEffect(() => {
    loadStats();
    loadAdditionalHolidays();
    if (isAuthenticated && role === 'admin') {
      loadUsers();
      loadPendingUsers();
    }
  }, [isAuthenticated, role, loadUsers, loadPendingUsers, loadAdditionalHolidays]);

  useEffect(() => {
    const loadBrandLogo = async () => {
      try {
        const response = await systemSettingsAPI.getBrandLogo();
        setBrandLogoSrc(response.dataUrl || defaultBrandLogoSrc);
      } catch {
        setBrandLogoSrc(defaultBrandLogoSrc);
      }
    };

    loadBrandLogo();
  }, [defaultBrandLogoSrc]);

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
      console.error('백업 실패:', error);
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
      console.error('초기화 실패:', error);
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

  const handleSaveHoliday = async () => {
    const date = normalizeHolidayUploadDate(holidayForm.date.trim());
    const name = holidayForm.name.trim();
    if (!date || !name) {
      showToast('공휴일 날짜와 이름을 입력해 주세요', 'warning');
      return;
    }

    try {
      if (editingHolidayId) {
        await updateAdditionalHoliday(editingHolidayId, {
          date,
          name,
          type: holidayForm.type
        });
      } else {
        await addAdditionalHoliday({
          date,
          name,
          type: holidayForm.type
        });
      }
      setHolidayPage(1);
      resetHolidayForm();
    } catch {
      // store handles toast
    }
  };

  const handleEditHoliday = (id: string) => {
    const target = additionalHolidays.find((item) => item.id === id);
    if (!target) return;
    setHolidayForm({
      date: toDateInputValue(target.date),
      name: target.name,
      type: target.type
    });
    setEditingHolidayId(target.id);
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    const ok = window.confirm(`"${name}" 공휴일을 삭제할까요?`);
    if (!ok) return;
    try {
      await deleteAdditionalHoliday(id);
      setHolidayPage(1);
      if (editingHolidayId === id) {
        resetHolidayForm();
      }
    } catch {
      // store handles toast
    }
  };

  const handleClearAllHolidays = async () => {
    const ok = window.confirm('등록된 공휴일 데이터를 전체 삭제할까요? 이 작업은 되돌릴 수 없습니다.');
    if (!ok) return;
    try {
      await clearAdditionalHolidays();
      setHolidayPage(1);
      resetHolidayForm();
    } catch {
      // store handles toast
    }
  };

  const handleHolidayCsvUpload = async (file: File) => {
    setIsHolidayUploadSubmitting(true);
    try {
      const matrix = await readCsvFile(file);
      const firstRow = (matrix[0] || []).map((v) => String(v || '').trim().toLowerCase());
      const hasKnownHeader =
        firstRow.includes('date') ||
        firstRow.includes('날짜') ||
        firstRow.includes('일자') ||
        firstRow.includes('yyyymmdd');
      const sourceRows = hasKnownHeader ? matrix.slice(1) : matrix;
      const rows = sourceRows
        .filter((r) => Array.isArray(r) && r.some((v) => String(v || '').trim() !== ''))
        .map((r) => ({
          [hasKnownHeader ? String(matrix[0]?.[0] || 'date') : 'date']: r[0] ?? '',
          [hasKnownHeader ? String(matrix[0]?.[1] || 'name') : 'name']: r[1] ?? '',
          [hasKnownHeader ? String(matrix[0]?.[2] || 'type') : 'type']: r[2] ?? ''
        }));

      if (!rows.length) {
        showToast('업로드할 공휴일 데이터가 없습니다', 'warning');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      let skippedDuplicateCount = 0;
      let firstErrorMessage = '';

      for (let idx = 0; idx < rows.length; idx += 1) {
        const row = rows[idx];
        const rawDate = pickHolidayCellFlexible(row, ['date', '날짜', '일자', 'yyyymmdd']);
        const rawName = pickHolidayCellFlexible(row, ['name', '휴일명', '공휴일명', '명칭']);
        const rawType = pickHolidayCellFlexible(row, ['type', '유형', '구분', '휴일유형']);

        const date = normalizeHolidayUploadDate(rawDate);
        const name = String(rawName || '').trim();
        const type = normalizeHolidayUploadType(rawType);

        if (!date || !name) {
          failCount += 1;
          continue;
        }

        try {
          await holidaysAPI.create({ date, name, type });
          successCount += 1;
        } catch (error) {
          const messageRaw = error instanceof Error ? error.message : String(error || '');
          const message = messageRaw.toLowerCase();
          if (message.includes('duplicate') || message.includes('already') || message.includes('중복')) {
            skippedDuplicateCount += 1;
          } else {
            failCount += 1;
            if (!firstErrorMessage) firstErrorMessage = messageRaw;
          }
        }
      }

      await loadAdditionalHolidays();
      setHolidayPage(1);

      if (successCount > 0 && failCount === 0 && skippedDuplicateCount === 0) {
        showToast(`공휴일 ${successCount}건을 업로드했습니다`, 'success');
      } else if (successCount > 0 || skippedDuplicateCount > 0) {
        showToast(
          `업로드 완료: 성공 ${successCount}건, 중복건너뜀 ${skippedDuplicateCount}건, 실패 ${failCount}건`,
          failCount > 0 ? 'warning' : 'success'
        );
      } else {
        const detail = firstErrorMessage ? ` (${firstErrorMessage.slice(0, 120)})` : '';
        showToast(`업로드에 실패했습니다${detail}`, 'error');
      }
    } catch (error) {
      console.error('공휴일 CSV 업로드 실패:', error);
      showToast('CSV 업로드 중 오류가 발생했습니다', 'error');
    } finally {
      setIsHolidayUploadSubmitting(false);
    }
  };

  const handleHolidayCsvFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    await handleHolidayCsvUpload(file);
  };

  const handleDownloadHolidayTemplate = async () => {
    downloadCsv('holiday_upload_template.csv', [
      ['date', 'name', 'type'],
      ['20260101', '신정', 'national'],
      ['20260216', '설날 연휴', 'national'],
      ['20261231', '종무일', 'company']
    ]);
  };

  const handleLogoutConfirm = () => {
    setIsLogoutConfirmOpen(false);
    logout();
    showToast('로그아웃되었습니다', 'success');
  };

  const handleBrandLogoFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다', 'warning');
      return;
    }

    setIsBrandLogoSubmitting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) throw new Error('이미지 데이터를 읽지 못했습니다.');
        await systemSettingsAPI.updateBrandLogo(result);
        setBrandLogoSrc(result);
        window.dispatchEvent(new CustomEvent('brand-logo-updated', { detail: { dataUrl: result } }));
        showToast('로고가 저장되었습니다', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : '로고 저장에 실패했습니다';
        showToast(message, 'error');
      } finally {
        setIsBrandLogoSubmitting(false);
      }
    };
    reader.onerror = () => {
      setIsBrandLogoSubmitting(false);
      showToast('로고 업로드 중 오류가 발생했습니다', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleResetBrandLogo = async () => {
    const ok = window.confirm('기본 로고로 되돌릴까요?');
    if (!ok) return;
    try {
      await systemSettingsAPI.resetBrandLogo();
      setBrandLogoSrc(defaultBrandLogoSrc);
      window.dispatchEvent(new CustomEvent('brand-logo-updated', { detail: { dataUrl: null } }));
      showToast('기본 로고로 되돌렸습니다', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '로고 초기화에 실패했습니다';
      showToast(message, 'error');
    }
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
          <Card>
            <CardHeader title="브랜드 로고" subtitle="통합관리자 설정에서 로고를 업로드합니다" />
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={brandLogoSrc} alt="브랜드 로고 미리보기" className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-white" />
                <div className="text-sm text-slate-500">
                  <p>업로드 후 서버에 저장되어 새로고침해도 유지됩니다.</p>
                  <p>권장 형식: PNG 또는 JPG</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => brandLogoInputRef.current?.click()}
                  isLoading={isBrandLogoSubmitting}
                >
                  로고 업로드
                </Button>
                <Button variant="secondary" onClick={handleResetBrandLogo}>
                  기본 로고 복원
                </Button>
                <input
                  ref={brandLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBrandLogoFileChange}
                />
              </div>
            </div>
          </Card>
        )}

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
                  {pagedUsers.map((u) => (
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
            {users.length > USER_PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-center gap-1">
                {Array.from({ length: totalUserPages }, (_, i) => i + 1).map((pageNum) => (
                  <Button
                    key={`user-page-${pageNum}`}
                    size="sm"
                    variant={userPage === pageNum ? 'primary' : 'secondary'}
                    onClick={() => setUserPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>
            )}
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
                          id={`pending-role-${u.username}`}
                          name={`pending_role_${u.username}`}
                          className="input max-w-[120px]"
                          value={pendingRoleByUser[u.username] || 'user'}
                          onChange={(e) =>
                            setPendingRoleByUser((prev) => ({
                              ...prev,
                              [u.username]: e.target.value as UserRole
                            }))
                          }
                        >
                          <option value="user">일반 사용자</option>
                          <option value="manager">중간 관리자</option>
                          <option value="admin">관리자</option>
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
                  <label htmlFor="holiday-date" className="block text-xs text-slate-500 mb-1">날짜</label>
                  <input
                    id="holiday-date"
                    name="holiday_date"
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
                  <label htmlFor="holiday-type" className="block text-xs text-slate-500 mb-1">유형</label>
                  <select
                    id="holiday-type"
                    name="holiday_type"
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
                  <Button
                    variant="secondary"
                    onClick={() => holidayUploadInputRef.current?.click()}
                    isLoading={isHolidayUploadSubmitting}
                  >
                    CSV 업로드
                  </Button>
                  <Button variant="secondary" onClick={handleDownloadHolidayTemplate}>
                    템플릿 다운로드
                  </Button>
                  <label htmlFor="holiday-upload-file" className="sr-only">
                    공휴일 CSV 업로드 파일
                  </label>
                  <input
                    id="holiday-upload-file"
                    name="holiday_upload_file"
                    ref={holidayUploadInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    aria-label="공휴일 CSV 업로드 파일"
                    onChange={handleHolidayCsvFileChange}
                  />
                  <Button variant="danger" onClick={handleClearAllHolidays}>
                    전체 삭제
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
                    {pagedHolidays.map((holiday) => (
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
              {additionalHolidays.length > HOLIDAY_PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setHolidayPage((prev) => Math.max(1, prev - 1))}
                    disabled={holidayPage <= 1}
                  >
                    ◀ 이전
                  </Button>
                  <span className="px-2 text-sm text-slate-600">
                    {holidayPage} / {totalHolidayPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setHolidayPage((prev) => Math.min(totalHolidayPages, prev + 1))}
                    disabled={holidayPage >= totalHolidayPages}
                  >
                    다음 ▶
                  </Button>
                </div>
              )}
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
            <label htmlFor="edit-user-role" className="block text-sm font-semibold text-slate-700 mb-2">권한</label>
            <select
              id="edit-user-role"
              name="edit_user_role"
              className="input"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
            >
              <option value="user">일반 사용자</option>
              <option value="manager">중간 관리자</option>
              <option value="admin">관리자</option>
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
        icon="logout"
      />
    </div>
  );
};

export default SettingsPage;







