import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAppStore } from '@/core/state/store';
import { Card, Select } from '@/shared/components/ui';

const ReportsCharts = lazy(() => import('./ReportsCharts'));

const ALLOCATION_TYPE_LABEL: Record<string, string> = {
  resident: '상주',
  proposal: '제안',
  pm: 'PM',
  pl: 'PL',
  ta: 'TA',
  se: 'SE',
  etc_support: '기타지원',
};

type ReportTab = 'contracts' | 'staffing' | 'schedule';
type DateRange = '3m' | '6m' | '1y' | 'all';

function getRangeStart(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'all') return null;
  if (range === '3m') return subMonths(now, 3);
  if (range === '6m') return subMonths(now, 6);
  return subMonths(now, 12);
}

function toDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthKey(date: Date) {
  return format(date, 'yyyy-MM');
}

function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00`);
  return format(date, 'yyyy.MM', { locale: ko });
}

const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string }> = ({ title, value, subtitle }) => (
  <Card>
    <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
  </Card>
);

function ChartFallback() {
  return (
    <Card>
      <div className="flex h-72 items-center justify-center text-sm text-slate-500">차트 데이터를 불러오는 중입니다.</div>
    </Card>
  );
}

const ReportsPage: React.FC = () => {
  const contracts = useAppStore((state) => state.contracts);
  const projectMembers = useAppStore((state) => state.projectMembers);
  const calendarEvents = useAppStore((state) => state.calendarEvents);

  const loadContracts = useAppStore((state) => state.loadContracts);
  const loadProjectMembers = useAppStore((state) => state.loadProjectMembers);
  const loadCalendarEvents = useAppStore((state) => state.loadCalendarEvents);

  const [activeTab, setActiveTab] = useState<ReportTab>('contracts');
  const [dateRange, setDateRange] = useState<DateRange>('6m');

  useEffect(() => {
    loadContracts();
    loadProjectMembers();
    loadCalendarEvents();
  }, [loadContracts, loadProjectMembers, loadCalendarEvents]);

  const rangeStart = useMemo(() => getRangeStart(dateRange), [dateRange]);

  const filteredContracts = useMemo(() => {
    if (!rangeStart) return contracts;
    return contracts.filter((contract) => {
      const startDate = toDate(contract.start_date);
      const endDate = toDate(contract.end_date);

      if (endDate) return endDate >= rangeStart;
      if (startDate) return startDate >= rangeStart;
      return false;
    });
  }, [contracts, rangeStart]);

  const contractStats = useMemo(() => {
    const now = new Date();
    const active = filteredContracts.filter((contract) => toDate(contract.end_date) && (toDate(contract.end_date) as Date) > now).length;
    const expired = filteredContracts.filter((contract) => toDate(contract.end_date) && (toDate(contract.end_date) as Date) <= now).length;
    const expiring = filteredContracts.filter((contract) => {
      const end = toDate(contract.end_date);
      if (!end || end <= now) return false;
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).length;

    const byCustomerMap = filteredContracts.reduce<Record<string, number>>((acc, contract) => {
      acc[contract.customer_name] = (acc[contract.customer_name] || 0) + 1;
      return acc;
    }, {});

    const byCustomer = Object.entries(byCustomerMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const byMonthMap = filteredContracts.reduce<Record<string, number>>((acc, contract) => {
      const date = toDate(contract.start_date);
      if (!date) return acc;
      const key = formatMonthKey(date);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byMonth = Object.entries(byMonthMap)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, count]) => ({ month: formatMonthLabel(month), count }));

    return { total: filteredContracts.length, active, expired, expiring, byCustomer, byMonth };
  }, [filteredContracts]);

  const filteredMembers = useMemo(() => {
    if (!rangeStart) return projectMembers;
    return projectMembers.filter((member) => {
      const date = toDate(member.start_date || member.created_at);
      return date ? date >= rangeStart : false;
    });
  }, [projectMembers, rangeStart]);

  const staffingStats = useMemo(() => {
    const statusMap = filteredMembers.reduce<Record<string, number>>((acc, member) => {
      const key = member.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const roleMap = filteredMembers.reduce<Record<string, number>>((acc, member) => {
      const raw = member.allocation_type || member.member_role || '미분류';
      const key = ALLOCATION_TYPE_LABEL[raw] || raw;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const companyMap = filteredMembers.reduce<Record<string, number>>((acc, member) => {
      const key = member.customer_name || member.member_company || '미지정';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byMonthMap = filteredMembers.reduce<Record<string, number>>((acc, member) => {
      const date = toDate(member.start_date || member.created_at);
      if (!date) return acc;
      const key = formatMonthKey(date);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      total: filteredMembers.length,
      active: statusMap.active || 0,
      completed: statusMap.completed || 0,
      withdrawn: statusMap.withdrawn || 0,
      byRole: Object.entries(roleMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      byCompany: Object.entries(companyMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      byMonth: Object.entries(byMonthMap)
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([month, count]) => ({ month: formatMonthLabel(month), count })),
    };
  }, [filteredMembers]);

  const filteredEvents = useMemo(() => {
    if (!rangeStart) return calendarEvents;
    return calendarEvents.filter((event) => {
      const date = toDate(event.start);
      return date ? date >= rangeStart : false;
    });
  }, [calendarEvents, rangeStart]);

  const scheduleStats = useMemo(() => {
    const typeMap = filteredEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const statusMap = filteredEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    }, {});

    const byMonthMap = filteredEvents.reduce<Record<string, { count: number; support: number }>>((acc, event) => {
      const date = toDate(event.start);
      if (!date) return acc;
      const key = formatMonthKey(date);
      if (!acc[key]) acc[key] = { count: 0, support: 0 };
      acc[key].count += 1;
      acc[key].support += Number(event.supportHours || 0);
      return acc;
    }, {});

    const totalSupportHours = filteredEvents.reduce((sum, event) => sum + Number(event.supportHours || 0), 0);

    return {
      total: filteredEvents.length,
      scheduled: statusMap.scheduled || 0,
      completed: statusMap.completed || 0,
      overdue: statusMap.overdue || 0,
      totalSupportHours,
      avgSupportHours: filteredEvents.length ? totalSupportHours / filteredEvents.length : 0,
      byType: Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byMonth: Object.entries(byMonthMap)
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([month, value]) => ({ month: formatMonthLabel(month), count: value.count, support: Number(value.support.toFixed(2)) })),
    };
  }, [filteredEvents]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">보고서</h1>
          <p className="mt-1 text-slate-500">계약관리, 프로젝트 현황, 일정 통계 및 분석</p>
        </div>
        <Select
          value={dateRange}
          onChange={(event) => setDateRange(event.target.value as DateRange)}
          options={[
            { value: '3m', label: '최근 3개월' },
            { value: '6m', label: '최근 6개월' },
            { value: '1y', label: '최근 1년' },
            { value: 'all', label: '전체' },
          ]}
          className="w-40"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {[
          { key: 'contracts', label: '계약관리 통계/분석' },
          { key: 'staffing', label: '프로젝트 현황 통계' },
          { key: 'schedule', label: '일정 통계/분석' },
        ].map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ReportTab)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard title="총 계약" value={contractStats.total} />
            <StatCard title="진행 중" value={contractStats.active} />
            <StatCard title="30일 이내 만료" value={contractStats.expiring} />
            <StatCard title="만료" value={contractStats.expired} />
          </div>
          <Suspense fallback={<ChartFallback />}>
            <ReportsCharts activeTab={activeTab} contractStats={contractStats} staffingStats={staffingStats} scheduleStats={scheduleStats} />
          </Suspense>
        </div>
      )}

      {activeTab === 'staffing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard title="총 투입 인원" value={staffingStats.total} />
            <StatCard title="활성" value={staffingStats.active} />
            <StatCard title="종료" value={staffingStats.completed} />
            <StatCard title="철수" value={staffingStats.withdrawn} />
          </div>
          <Suspense fallback={<ChartFallback />}>
            <ReportsCharts activeTab={activeTab} contractStats={contractStats} staffingStats={staffingStats} scheduleStats={scheduleStats} />
          </Suspense>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard title="총 일정" value={scheduleStats.total} />
            <StatCard title="예정" value={scheduleStats.scheduled} />
            <StatCard title="완료" value={scheduleStats.completed} />
            <StatCard title="지연" value={scheduleStats.overdue} />
            <StatCard title="총 지원시간" value={`${scheduleStats.totalSupportHours.toFixed(1)}h`} subtitle={`평균 ${scheduleStats.avgSupportHours.toFixed(1)}h`} />
          </div>
          <Suspense fallback={<ChartFallback />}>
            <ReportsCharts activeTab={activeTab} contractStats={contractStats} staffingStats={staffingStats} scheduleStats={scheduleStats} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
