import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/core/state/store';
import { Button, Card, ConfirmModal, Input, Modal } from '@/shared/components/ui';
import type { ProjectMember } from '@/types';

type ProjectStatus = 'active' | 'completed' | 'withdrawn' | 'inactive';
type AllocationType = NonNullable<ProjectMember['allocation_type']>;

const ALLOCATION_OPTIONS: { value: AllocationType; label: string }[] = [
  { value: 'resident', label: '상주' },
  { value: 'proposal', label: '제안' },
  { value: 'pm', label: 'PM' },
  { value: 'pl', label: 'PL' },
  { value: 'ta', label: 'TA' },
  { value: 'se', label: 'SE' },
  { value: 'etc_support', label: '기타지원' }
];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: '진행중',
  completed: '완료',
  withdrawn: '철수',
  inactive: '중단'
};

function toDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value?: string) {
  const d = toDate(value);
  return d ? format(d, 'yyyy.MM.dd') : '-';
}

function calculateMonthlyEffort(startDate?: string, endDate?: string) {
  const start = toDate(startDate);
  const end = toDate(endDate || startDate);
  if (!start || !end || end < start) return 0;
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number((days / 30).toFixed(2));
}

function normalizeEffort(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function distributeEffortByMonth(startDate?: string, endDate?: string) {
  const start = toDate(startDate);
  const end = toDate(endDate || startDate);
  const map = new Map<string, number>();
  if (!start || !end || end < start) return map;

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= lastMonth) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    const segStart = start > monthStart ? start : monthStart;
    const segEnd = end < monthEnd ? end : monthEnd;
    if (segEnd >= segStart) {
      const overlapDays = Math.floor((segEnd.getTime() - segStart.getTime()) / 86400000) + 1;
      const key = format(cursor, 'yyyy-MM');
      map.set(key, Number((overlapDays / 30).toFixed(2)));
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return map;
}

type FormValues = {
  contract_id: number;
  project_name: string;
  customer_name: string;
  manager_name: string;
  allocation_type: AllocationType;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  notes: string;
};

function getDefaultForm(defaultManagerName?: string): FormValues {
  return {
    contract_id: 0,
    project_name: '',
    customer_name: '',
    manager_name: defaultManagerName || '',
    allocation_type: 'resident',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'active',
    notes: ''
  };
}

type ProjectFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (member: Omit<ProjectMember, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  member?: ProjectMember | null;
  canEdit: boolean;
};

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  member,
  canEdit
}) => {
  const currentUser = useAppStore((state) => state.user);
  const [formData, setFormData] = useState<FormValues>(getDefaultForm(currentUser?.display_name));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        contract_id: member.contract_id || 0,
        project_name: member.project_name || '',
        customer_name: member.customer_name || '',
        manager_name: member.manager_name || member.member_name || '',
        allocation_type: (member.allocation_type || 'resident') as AllocationType,
        start_date: (member.start_date || '').slice(0, 10),
        end_date: (member.end_date || '').slice(0, 10),
        status: (member.status || 'active') as ProjectStatus,
        notes: member.notes || ''
      });
    } else {
      setFormData(getDefaultForm(currentUser?.display_name));
    }
    setErrors({});
  }, [isOpen, member, currentUser?.display_name]);

  const monthlyEffort = useMemo(
    () => calculateMonthlyEffort(formData.start_date, formData.end_date),
    [formData.start_date, formData.end_date]
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.project_name.trim()) nextErrors.project_name = '사업명을 입력해 주세요';
    if (!formData.customer_name.trim()) nextErrors.customer_name = '고객사를 입력해 주세요';
    if (!formData.manager_name.trim()) nextErrors.manager_name = '담당자를 입력해 주세요';
    if (!formData.start_date) nextErrors.start_date = '시작일을 선택해 주세요';
    if (formData.end_date && formData.end_date < formData.start_date) nextErrors.end_date = '종료일은 시작일 이후여야 합니다';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !canEdit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        contract_id: formData.contract_id,
        project_name: formData.project_name.trim(),
        customer_name: formData.customer_name.trim(),
        manager_name: formData.manager_name.trim(),
        allocation_type: formData.allocation_type,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        monthly_effort: monthlyEffort,
        status: formData.status,
        notes: formData.notes.trim() || undefined
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member ? '프로젝트 현황 수정' : '프로젝트 현황 등록'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          {canEdit && (
            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
              {member ? '수정' : '등록'}
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project Info</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="프로젝트(사업명)"
              value={formData.project_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, project_name: e.target.value }))}
              error={errors.project_name}
              required
            />
            <Input
              label="고객사"
              value={formData.customer_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, customer_name: e.target.value }))}
              error={errors.customer_name}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="담당자"
              value={formData.manager_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, manager_name: e.target.value }))}
              error={errors.manager_name}
              required
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">유형</label>
              <select
                value={formData.allocation_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, allocation_type: e.target.value as AllocationType }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                disabled={!canEdit}
              >
                {ALLOCATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Period & Effort</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">시작일</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                disabled={!canEdit}
              />
              {errors.start_date && <p className="mt-1 text-xs text-red-500">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">종료일</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                disabled={!canEdit}
              />
              {errors.end_date && <p className="mt-1 text-xs text-red-500">{errors.end_date}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Auto MM</p>
              <p className="text-xl font-bold text-blue-900 leading-tight">{monthlyEffort.toFixed(2)}</p>
              <p className="text-xs text-blue-700">기간 기준 자동 계산</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">상태</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                disabled={!canEdit}
              >
                <option value="active">진행중</option>
                <option value="completed">완료</option>
                <option value="withdrawn">철수</option>
                <option value="inactive">중단</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
          <label className="block text-sm font-semibold text-slate-700 mb-2">비고</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none min-h-[84px] resize-y"
            disabled={!canEdit}
          />
        </div>
      </form>
    </Modal>
  );
};

const ProjectMembersPage: React.FC = () => {
  const projectMembers = useAppStore((state) => state.projectMembers);
  const role = useAppStore((state) => state.role);

  const loadProjectMembers = useAppStore((state) => state.loadProjectMembers);
  const createProjectMember = useAppStore((state) => state.createProjectMember);
  const updateProjectMember = useAppStore((state) => state.updateProjectMember);
  const deleteProjectMember = useAppStore((state) => state.deleteProjectMember);

  const isAdmin = role === 'admin';

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | ProjectStatus>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  useEffect(() => {
    loadProjectMembers();
  }, [loadProjectMembers]);

  const projectOptions = useMemo(() => {
    return Array.from(
      new Set(
        projectMembers
          .map((m) => (m.project_name || '').trim())
          .filter((name) => name.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [projectMembers]);

  const filteredMembers = useMemo(() => {
    return projectMembers.filter((m) => {
      const statusMatch = filterStatus === 'all' ? true : m.status === filterStatus;
      const projectMatch = projectFilter === 'all' ? true : (m.project_name || '').trim() === projectFilter;
      return statusMatch && projectMatch;
    });
  }, [projectMembers, filterStatus, projectFilter]);

  const monthlySummary = useMemo(() => {
    const map = new Map<string, number>();
    filteredMembers.forEach((m) => {
      const monthlyMap = distributeEffortByMonth(m.start_date, m.end_date);
      monthlyMap.forEach((value, month) => {
        map.set(month, Number(((map.get(month) || 0) + value).toFixed(2)));
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([month, effort]) => ({ month, effort }));
  }, [filteredMembers]);

  const managerSummary = useMemo(() => {
    const map = new Map<string, number>();
    filteredMembers.forEach((m) => {
      const managerName = (m.manager_name || m.member_name || '미지정').trim() || '미지정';
      const effort = normalizeEffort(m.monthly_effort, calculateMonthlyEffort(m.start_date, m.end_date));
      map.set(managerName, Number(((map.get(managerName) || 0) + effort).toFixed(2)));
    });
    return Array.from(map.entries())
      .map(([managerName, effort]) => ({ managerName, effort }))
      .sort((a, b) => b.effort - a.effort);
  }, [filteredMembers]);

  const totalEffort = useMemo(
    () =>
      Number(
        filteredMembers
          .reduce((sum, m) => sum + normalizeEffort(m.monthly_effort, calculateMonthlyEffort(m.start_date, m.end_date)), 0)
          .toFixed(2)
      ),
    [filteredMembers]
  );

  const handleSubmit = async (payload: Omit<ProjectMember, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedMember?.id) {
      await updateProjectMember(selectedMember.id, payload);
    } else {
      await createProjectMember(payload);
    }
    setSelectedMember(null);
    setIsFormModalOpen(false);
    loadProjectMembers();
  };

  const handleDelete = async () => {
    if (!selectedMember?.id) return;
    await deleteProjectMember(selectedMember.id);
    setSelectedMember(null);
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">프로젝트 현황 관리</h1>
          <p className="text-slate-500 mt-1">일정 관리와 분리된 프로젝트 현황 전용 등록/관리 화면입니다.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedMember(null);
            setIsFormModalOpen(true);
          }}
        >
          + 프로젝트 현황 등록
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">프로젝트 필터</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="all">전체</option>
              {projectOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">상태</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="all">전체</option>
              <option value="active">진행중</option>
              <option value="completed">완료</option>
              <option value="withdrawn">철수</option>
              <option value="inactive">중단</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
              <p className="text-xs text-slate-600">총 공수 합계(MM)</p>
              <p className="text-xl font-bold text-blue-700">{totalEffort.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-3">{isAdmin ? '담당자별 공수 합계' : '월별 공수 합계'}</h2>
        {isAdmin ? (
          managerSummary.length === 0 ? (
            <p className="text-sm text-slate-500">표시할 담당자 공수 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {managerSummary.map((row) => (
                <div key={row.managerName} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">{row.managerName}</p>
                  <p className="text-sm font-bold text-slate-900">{row.effort.toFixed(2)} MM</p>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-sm font-semibold text-blue-700">총합계</p>
                <p className="text-base font-bold text-blue-800">{totalEffort.toFixed(2)} MM</p>
              </div>
            </div>
          )
        ) : monthlySummary.length === 0 ? (
          <p className="text-sm text-slate-500">표시할 월별 공수 데이터가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {monthlySummary.map((m) => (
              <div key={m.month} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-500">{m.month}</p>
                <p className="text-lg font-semibold text-slate-900">{m.effort.toFixed(2)} MM</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">등록 목록</p>
          <p className="text-xs text-slate-500 mt-0.5">프로젝트 현황과 공수를 확인합니다.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50/90">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">프로젝트</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">고객/담당</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">유형</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">기간</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">공수(MM)</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">상태</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-900">{member.project_name || '-'}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-slate-800">{member.customer_name || '-'}</p>
                    <p className="text-xs text-slate-500">담당: {member.manager_name || '-'}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {ALLOCATION_OPTIONS.find((o) => o.value === member.allocation_type)?.label || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    <p>시작: {formatDate(member.start_date)}</p>
                    <p>종료: {formatDate(member.end_date)}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {normalizeEffort(member.monthly_effort, calculateMonthlyEffort(member.start_date, member.end_date)).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {STATUS_LABEL[(member.status || 'active') as ProjectStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedMember(member);
                            setIsFormModalOpen(true);
                          }}
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedMember(member);
                            setIsDeleteModalOpen(true);
                          }}
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">관리자만 가능</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  등록된 프로젝트 현황 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProjectFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedMember(null);
        }}
        onSubmit={handleSubmit}
        member={selectedMember}
        canEdit={!selectedMember || isAdmin}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="프로젝트 현황 삭제"
        message={`"${selectedMember?.project_name || '-'}" 항목을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
};

export default ProjectMembersPage;
