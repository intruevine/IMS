import React, { useEffect, useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useAppStore } from '@/core/state/store';
import { Card, Select } from '@/shared/components/ui';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0ea5e9', '#14b8a6'];
const ALLOCATION_TYPE_LABEL: Record<string, string> = {
  resident: '상주',
  proposal: '제안',
  pm: 'PM',
  pl: 'PL',
  ta: 'TA',
  se: 'SE',
  etc_support: '기타지원'
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
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonthKey(date: Date) {
  return format(date, 'yyyy-MM');
}

function formatMonthLabel(monthKey: string) {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return format(d, 'yyyy.MM', { locale: ko });
}

const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string }> = ({ title, value, subtitle }) => (
  <Card>
    <p className="text-xs font-semibold text-slate-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
  </Card>
);

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
    return contracts.filter((c) => {
      const d = toDate(c.start_date);
      return d ? d >= rangeStart : false;
    });
  }, [contracts, rangeStart]);

  const contractStats = useMemo(() => {
    const now = new Date();
    const active = filteredContracts.filter((c) => toDate(c.end_date) && (toDate(c.end_date) as Date) > now).length;
    const expired = filteredContracts.filter((c) => toDate(c.end_date) && (toDate(c.end_date) as Date) <= now).length;
    const expiring = filteredContracts.filter((c) => {
      const end = toDate(c.end_date);
      if (!end || end <= now) return false;
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).length;

    const byCustomerMap = filteredContracts.reduce<Record<string, number>>((acc, c) => {
      acc[c.customer_name] = (acc[c.customer_name] || 0) + 1;
      return acc;
    }, {});

    const byCustomer = Object.entries(byCustomerMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const byMonthMap = filteredContracts.reduce<Record<string, number>>((acc, c) => {
      const d = toDate(c.start_date);
      if (!d) return acc;
      const key = formatMonthKey(d);
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
    return projectMembers.filter((m) => {
      const d = toDate(m.start_date || m.created_at);
      return d ? d >= rangeStart : false;
    });
  }, [projectMembers, rangeStart]);

  const staffingStats = useMemo(() => {
    const statusMap = filteredMembers.reduce<Record<string, number>>((acc, m) => {
      const key = m.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const roleMap = filteredMembers.reduce<Record<string, number>>((acc, m) => {
      const raw = m.allocation_type || m.member_role || '미분류';
      const key = ALLOCATION_TYPE_LABEL[raw] || raw;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const companyMap = filteredMembers.reduce<Record<string, number>>((acc, m) => {
      const key = m.customer_name || m.member_company || '미지정';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byMonthMap = filteredMembers.reduce<Record<string, number>>((acc, m) => {
      const d = toDate(m.start_date || m.created_at);
      if (!d) return acc;
      const key = formatMonthKey(d);
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
        .map(([month, count]) => ({ month: formatMonthLabel(month), count }))
    };
  }, [filteredMembers]);

  const filteredEvents = useMemo(() => {
    if (!rangeStart) return calendarEvents;
    return calendarEvents.filter((e) => {
      const d = toDate(e.start);
      return d ? d >= rangeStart : false;
    });
  }, [calendarEvents, rangeStart]);

  const scheduleStats = useMemo(() => {
    const typeMap = filteredEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});

    const statusMap = filteredEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    const byMonthMap = filteredEvents.reduce<Record<string, { count: number; support: number }>>((acc, e) => {
      const d = toDate(e.start);
      if (!d) return acc;
      const key = formatMonthKey(d);
      if (!acc[key]) acc[key] = { count: 0, support: 0 };
      acc[key].count += 1;
      acc[key].support += Number(e.supportHours || 0);
      return acc;
    }, {});

    const totalSupportHours = filteredEvents.reduce((sum, e) => sum + Number(e.supportHours || 0), 0);

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
        .map(([month, value]) => ({ month: formatMonthLabel(month), count: value.count, support: Number(value.support.toFixed(2)) }))
    };
  }, [filteredEvents]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">보고서</h1>
          <p className="text-slate-500 mt-1">계약관리, 프로젝트 현황, 일정 통계 및 분석</p>
        </div>
        <Select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          options={[
            { value: '3m', label: '최근 3개월' },
            { value: '6m', label: '최근 6개월' },
            { value: '1y', label: '최근 1년' },
            { value: 'all', label: '전체' }
          ]}
          className="w-40"
        />
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {[
          { key: 'contracts', label: '계약관리 통계/분석' },
          { key: 'staffing', label: '프로젝트 현황 통계' },
          { key: 'schedule', label: '일정 통계/분석' }
        ].map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ReportTab)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 ${
              activeTab === tab.key ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="총 계약" value={contractStats.total} />
            <StatCard title="진행 중" value={contractStats.active} />
            <StatCard title="30일 이내 만료" value={contractStats.expiring} />
            <StatCard title="만료" value={contractStats.expired} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">월별 계약 추이</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={contractStats.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} name="계약 수" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">고객사별 계약 분포</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contractStats.byCustomer} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} />
                    <Tooltip />
                    <Bar dataKey="value" name="계약 수" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'staffing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="총 투입 인원" value={staffingStats.total} />
            <StatCard title="활성" value={staffingStats.active} />
            <StatCard title="종료" value={staffingStats.completed} />
            <StatCard title="철수" value={staffingStats.withdrawn} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">역할별 투입 현황</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffingStats.byRole}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="인원" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">소속사별 투입 분포</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={staffingStats.byCompany} dataKey="value" nameKey="name" outerRadius={90} label>
                      {staffingStats.byCompany.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title="총 일정" value={scheduleStats.total} />
            <StatCard title="예정" value={scheduleStats.scheduled} />
            <StatCard title="완료" value={scheduleStats.completed} />
            <StatCard title="지연" value={scheduleStats.overdue} />
            <StatCard title="총 지원시간" value={`${scheduleStats.totalSupportHours.toFixed(1)}h`} subtitle={`평균 ${scheduleStats.avgSupportHours.toFixed(1)}h`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">일정 유형별 분포</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scheduleStats.byType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="일정 수" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">월별 일정/지원시간 추이</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scheduleStats.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="count" name="일정 수" stroke="#2563eb" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="support" name="지원시간(h)" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
