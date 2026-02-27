import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
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
import { Card, Button } from '@/shared/components/ui';

type SupportMode = 'personal' | 'team';
const TEAM_OPTION_VALUE = '__team__';

const SUPPORT_EVENT_TYPES = new Set(['remote_support', 'maintenance', 'sales_support', 'meeting']);
const TYPE_LABEL: Record<string, string> = {
  remote_support: '원격지원',
  maintenance: '유지보수',
  sales_support: '영업지원',
  meeting: '회의'
};
const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0ea5e9'];

function toDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateInput(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toDateInput(start), end: toDateInput(end) };
}

function toMonthInput(date: Date) {
  return format(date, 'yyyy-MM');
}

function getWeekOfMonth(date: Date) {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function getHoursFromEvent(event: { supportHours?: number; start: string; end: string }) {
  const saved = Number(event.supportHours || 0);
  if (saved > 0) return saved;
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function getSupportDayScore(event: { scheduleDivision?: string; supportHours?: number; start: string; end: string }) {
  const division = event.scheduleDivision;
  if (division === 'am_offsite' || division === 'pm_offsite') return 0.5;
  if (division === 'all_day_offsite') return 1;
  if (division === 'night_support') {
    const hours = getHoursFromEvent(event);
    return (hours / 8) * 1.5;
  }
  const hours = getHoursFromEvent(event);
  return hours > 0 ? hours / 8 : 0;
}

const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string }> = ({ title, value, subtitle }) => (
  <Card>
    <p className="text-xs font-semibold text-slate-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
  </Card>
);

const ClientSupportPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const users = useAppStore((state) => state.users);
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const loadCalendarEvents = useAppStore((state) => state.loadCalendarEvents);
  const loadUsers = useAppStore((state) => state.loadUsers);

  const monthRange = useMemo(() => getMonthRange(), []);
  const [mode, setMode] = useState<SupportMode>('personal');
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(monthRange.end);
  const [statsMonth, setStatsMonth] = useState(toMonthInput(new Date()));
  const [selectedUsername, setSelectedUsername] = useState('');

  const isAdmin = role === 'admin';

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    if (selectedUsername) return;
    if (isAdmin) {
      setSelectedUsername(TEAM_OPTION_VALUE);
      return;
    }
    if (user?.username) {
      setSelectedUsername(user.username);
    }
  }, [isAdmin, user?.username, selectedUsername]);

  const userOptions = useMemo(
    () => {
      const baseOptions = users
        .filter((u) => Boolean(u.username))
        .map((u) => ({ username: u.username, label: `${u.display_name || u.username} (${u.username})`, role: u.role }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ko'));

      if (!isAdmin) return baseOptions.map(({ username, label }) => ({ username, label }));

      return [{ username: TEAM_OPTION_VALUE, label: '팀 (전체, 통합관리자 제외)' }, ...baseOptions.map(({ username, label }) => ({ username, label }))];
    },
    [users, isAdmin]
  );

  const userRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      if (u.username) map.set(u.username, u.role || 'user');
    });
    return map;
  }, [users]);

  const isNonAdminUser = useCallback(
    (username?: string) => {
      if (!username) return false;
      return userRoleMap.get(username) !== 'admin';
    },
    [userRoleMap]
  );

  const selectedUserLabel = useMemo(() => {
    if (selectedUsername === TEAM_OPTION_VALUE) return '팀 (전체, 통합관리자 제외)';
    const found = userOptions.find((u) => u.username === selectedUsername);
    return found?.label || selectedUsername || user?.display_name || '-';
  }, [selectedUsername, user?.display_name, userOptions]);

  const filteredEvents = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    const currentUsername = user?.username || '';
    const targetUsername = isAdmin && mode === 'personal' && selectedUsername ? selectedUsername : currentUsername;

    return calendarEvents.filter((event) => {
      if (!SUPPORT_EVENT_TYPES.has(event.type)) return false;
      const eventDate = toDate(event.start);
      if (!eventDate || eventDate < start || eventDate > end) return false;
      const actorUsername = event.createdBy || event.assignee || '';

      if (mode === 'personal') {
        if (isAdmin && targetUsername === TEAM_OPTION_VALUE) {
          return isNonAdminUser(actorUsername);
        }
        return event.createdBy === targetUsername || event.assignee === targetUsername;
      }
      return isNonAdminUser(actorUsername);
    });
  }, [calendarEvents, startDate, endDate, mode, user?.username, isAdmin, selectedUsername, isNonAdminUser]);

  const summary = useMemo(() => {
    const daySet = new Set<string>();
    const customerSet = new Set<string>();
    let totalSupportHours = 0;

    const byDateMap = new Map<string, { date: string; hours: number; cases: number }>();
    const byCustomerMap = new Map<string, { customer: string; hours: number; cases: number }>();
    const byMemberMap = new Map<string, { member: string; hours: number; cases: number }>();
    const byTypeMap = new Map<string, { type: string; value: number }>();

    filteredEvents.forEach((event) => {
      const eventDate = toDate(event.start);
      const dateKey = eventDate ? format(eventDate, 'yyyy-MM-dd') : '';
      const hours = Number(event.supportHours || 0);
      const customer = (event.customerName || '').trim() || '미지정';
      const member = (event.createdByName || event.createdBy || '미지정').trim();
      const typeLabel = TYPE_LABEL[event.type] || event.type;

      if (dateKey) daySet.add(dateKey);
      customerSet.add(customer);
      totalSupportHours += hours;

      const dateBucket = byDateMap.get(dateKey) || { date: dateKey, hours: 0, cases: 0 };
      dateBucket.hours += hours;
      dateBucket.cases += 1;
      byDateMap.set(dateKey, dateBucket);

      const customerBucket = byCustomerMap.get(customer) || { customer, hours: 0, cases: 0 };
      customerBucket.hours += hours;
      customerBucket.cases += 1;
      byCustomerMap.set(customer, customerBucket);

      const memberBucket = byMemberMap.get(member) || { member, hours: 0, cases: 0 };
      memberBucket.hours += hours;
      memberBucket.cases += 1;
      byMemberMap.set(member, memberBucket);

      const typeBucket = byTypeMap.get(typeLabel) || { type: typeLabel, value: 0 };
      typeBucket.value += 1;
      byTypeMap.set(typeLabel, typeBucket);
    });

    return {
      totalSupportHours: Number(totalSupportHours.toFixed(2)),
      totalSupportDays: daySet.size,
      totalSupportCases: filteredEvents.length,
      totalCustomers: customerSet.size,
      customerList: Array.from(customerSet).sort((a, b) => a.localeCompare(b, 'ko')),
      byDate: Array.from(byDateMap.values())
        .sort((a, b) => (a.date > b.date ? 1 : -1))
        .map((row) => ({ ...row, hours: Number(row.hours.toFixed(2)) })),
      byCustomer: Array.from(byCustomerMap.values())
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 10)
        .map((row) => ({ ...row, hours: Number(row.hours.toFixed(2)) })),
      byMember: Array.from(byMemberMap.values())
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 10)
        .map((row) => ({ ...row, hours: Number(row.hours.toFixed(2)) })),
      byType: Array.from(byTypeMap.values()).sort((a, b) => b.value - a.value)
    };
  }, [filteredEvents]);

  const supportDayStats = useMemo(() => {
    if (!isAdmin) return { rows: [] as Array<{ username: string; name: string; weekly: number[]; total: number }>, weekCount: 4, grandTotal: 0 };
    const [yearStr, monthStr] = statsMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) return { rows: [] as Array<{ username: string; name: string; weekly: number[]; total: number }>, weekCount: 4, grandTotal: 0 };

    const maxDay = new Date(year, month, 0).getDate();
    const weekCount = Math.ceil(maxDay / 7);
    const perUser = new Map<string, { username: string; name: string; weekly: number[]; total: number }>();

    const relevantEvents = calendarEvents.filter((event) => {
      if (!SUPPORT_EVENT_TYPES.has(event.type)) return false;
      const eventDate = toDate(event.start);
      if (!eventDate) return false;
      return eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month;
    });

    relevantEvents.forEach((event) => {
      const eventDate = toDate(event.start);
      if (!eventDate) return;
      const week = getWeekOfMonth(eventDate);
      const username = event.createdBy || event.assignee || '';
      if (!username) return;
      if (mode === 'team') {
        if (!isNonAdminUser(username)) return;
      } else if (selectedUsername === TEAM_OPTION_VALUE) {
        if (!isNonAdminUser(username)) return;
      } else {
        if (username !== selectedUsername) return;
      }
      const foundUser = users.find((u) => u.username === username);
      const name = foundUser?.display_name || event.createdByName || username;
      const score = getSupportDayScore(event);
      if (score <= 0) return;

      const row = perUser.get(username) || { username, name, weekly: Array.from({ length: weekCount }, () => 0), total: 0 };
      if (!row.weekly[week - 1]) row.weekly[week - 1] = 0;
      row.weekly[week - 1] += score;
      row.total += score;
      perUser.set(username, row);
    });

    const rows = Array.from(perUser.values())
      .map((row) => ({
        ...row,
        weekly: row.weekly.map((value) => Number(value.toFixed(2))),
        total: Number(row.total.toFixed(2))
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ko'));

    const grandTotal = Number(rows.reduce((sum, row) => sum + row.total, 0).toFixed(2));
    return { rows, weekCount, grandTotal };
  }, [isAdmin, mode, selectedUsername, statsMonth, calendarEvents, users, isNonAdminUser]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">고객지원현황</h1>
          <p className="text-slate-500 mt-1">개인/팀 지원 실적과 고객 인사이트를 확인합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={mode === 'personal' ? 'primary' : 'secondary'} onClick={() => setMode('personal')}>
            개인별
          </Button>
          <Button variant={mode === 'team' ? 'primary' : 'secondary'} onClick={() => setMode('team')}>
            팀별
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">조회 시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">조회 종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs text-slate-600">사용자</p>
            <p className="text-lg font-semibold text-blue-700">
              {mode === 'personal' ? selectedUserLabel : '팀 (전체, 통합관리자 제외)'}
            </p>
          </div>
          {isAdmin && mode === 'personal' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">개인 사용자 검색</label>
              <select
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                {userOptions.map((option) => (
                  <option key={option.username} value={option.username}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="총 지원시간" value={`${summary.totalSupportHours.toFixed(2)}h`} />
        <StatCard title="총 지원일수" value={summary.totalSupportDays} />
        <StatCard title="총 지원건수" value={summary.totalSupportCases} />
        <StatCard title="지원 고객사 수" value={summary.totalCustomers} />
        <StatCard title="조회 기간" value={`${startDate} ~ ${endDate}`} />
      </div>

      {isAdmin && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">사용자 지원일 통계</h3>
              <p className="text-xs text-slate-500 mt-1">기준: 오전/오후 0.5일, 전일 1일, 야간 (지원시간/8) x 1.5일</p>
            </div>
            <div className="w-full md:w-52">
              <label htmlFor="support-stats-month" className="block text-sm font-semibold text-slate-700 mb-2">
                통계 월
              </label>
              <input
                id="support-stats-month"
                type="month"
                value={statsMonth}
                onChange={(e) => setStatsMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>

          {supportDayStats.rows.length === 0 ? (
            <p className="text-sm text-slate-500">선택한 월의 사용자 지원 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 text-left font-semibold">사용자</th>
                    {Array.from({ length: supportDayStats.weekCount }, (_, i) => (
                      <th key={`week-${i + 1}`} className="px-3 py-2 text-right font-semibold">
                        {i + 1}주
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-semibold">당월 합계(일)</th>
                  </tr>
                </thead>
                <tbody>
                  {supportDayStats.rows.map((row) => (
                    <tr key={row.username} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-900">{row.name}</td>
                      {Array.from({ length: supportDayStats.weekCount }, (_, i) => (
                        <td key={`${row.username}-week-${i + 1}`} className="px-3 py-2 text-right text-slate-700">
                          {(row.weekly[i] || 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold text-blue-700">{row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50">
                    <td className="px-3 py-2 font-semibold text-slate-900">전체 합계</td>
                    {Array.from({ length: supportDayStats.weekCount }, (_, i) => {
                      const weekSum = supportDayStats.rows.reduce((sum, row) => sum + (row.weekly[i] || 0), 0);
                      return (
                        <td key={`total-week-${i + 1}`} className="px-3 py-2 text-right font-semibold text-slate-800">
                          {weekSum.toFixed(2)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold text-blue-700">{supportDayStats.grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h3 className="text-base font-semibold text-slate-900 mb-3">지원 고객사</h3>
        {summary.customerList.length === 0 ? (
          <p className="text-sm text-slate-500">해당 기간 지원 고객사가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {summary.customerList.map((customer) => (
              <span key={customer} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {customer}
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">일자별 지원시간 추이</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.byDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="hours" name="지원시간(h)" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="cases" name="지원건수" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">고객사별 지원시간 TOP 10</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.byCustomer} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" />
                <YAxis dataKey="customer" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="hours" name="지원시간(h)" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{mode === 'team' ? '팀원별 지원시간' : '지원유형 비중'}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {mode === 'team' ? (
                <BarChart data={summary.byMember}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="member" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" name="지원시간(h)" fill="#7c3aed" />
                </BarChart>
              ) : (
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={summary.byType} dataKey="value" nameKey="type" cx="50%" cy="50%" outerRadius={95} label>
                    {summary.byType.map((entry, index) => (
                      <Cell key={`${entry.type}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">지원유형 분포</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.byType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="건수" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClientSupportPage;

