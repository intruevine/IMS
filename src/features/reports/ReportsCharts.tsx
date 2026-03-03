import React from 'react';
import { Card } from '@/shared/components/ui';
import { ChartFrame, DonutChart, HorizontalBarChart, LineChart, VerticalBarChart } from '@/shared/components/charts/SimpleCharts';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0ea5e9', '#14b8a6'];

type ReportTab = 'contracts' | 'staffing' | 'schedule';

type ContractStats = {
  byCustomer: Array<{ name: string; value: number }>;
  byMonth: Array<{ month: string; count: number }>;
};

type StaffingStats = {
  byRole: Array<{ name: string; value: number }>;
  byCompany: Array<{ name: string; value: number }>;
};

type ScheduleStats = {
  byType: Array<{ name: string; value: number }>;
  byMonth: Array<{ month: string; count: number; support: number }>;
};

type ReportsChartsProps = {
  activeTab: ReportTab;
  contractStats: ContractStats;
  staffingStats: StaffingStats;
  scheduleStats: ScheduleStats;
};

const ReportsCharts: React.FC<ReportsChartsProps> = ({ activeTab, contractStats, staffingStats, scheduleStats }) => {
  if (activeTab === 'contracts') {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <ChartFrame title="월별 계약 추이">
            <LineChart data={contractStats.byMonth} xKey="month" lines={[{ key: 'count', label: '계약 수', color: '#2563eb' }]} />
          </ChartFrame>
        </Card>

        <Card>
          <ChartFrame title="고객사별 계약 분포">
            <HorizontalBarChart data={contractStats.byCustomer} labelKey="name" valueKey="value" color="#16a34a" />
          </ChartFrame>
        </Card>
      </div>
    );
  }

  if (activeTab === 'staffing') {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <ChartFrame title="역할별 인원 현황">
            <VerticalBarChart data={staffingStats.byRole} labelKey="name" valueKey="value" color="#7c3aed" />
          </ChartFrame>
        </Card>

        <Card>
          <ChartFrame title="소속사별 인원 분포">
            <DonutChart data={staffingStats.byCompany} labelKey="name" valueKey="value" colors={COLORS} />
          </ChartFrame>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <ChartFrame title="일정 유형별 분포">
          <VerticalBarChart data={scheduleStats.byType} labelKey="name" valueKey="value" color="#0ea5e9" />
        </ChartFrame>
      </Card>

      <Card>
        <ChartFrame title="월별 일정 및 지원시간 추이">
          <LineChart
            data={scheduleStats.byMonth}
            xKey="month"
            lines={[
              { key: 'count', label: '일정 수', color: '#2563eb' },
              { key: 'support', label: '지원시간(h)', color: '#f59e0b' }
            ]}
          />
        </ChartFrame>
      </Card>
    </div>
  );
};

export default ReportsCharts;
