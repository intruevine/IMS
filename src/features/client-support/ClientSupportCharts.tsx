import React from 'react';
import { Card } from '@/shared/components/ui';
import { ChartFrame, DonutChart, HorizontalBarChart, LineChart, VerticalBarChart } from '@/shared/components/charts/SimpleCharts';

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0ea5e9'];

interface ClientSupportChartsProps {
  mode: 'personal' | 'team';
  summary: {
    byDate: Array<{ date: string; hours: number; cases: number }>;
    byCustomer: Array<{ customer: string; hours: number; cases: number }>;
    byMember: Array<{ member: string; hours: number; cases: number }>;
    byType: Array<{ type: string; value: number }>;
  };
}

const ClientSupportCharts: React.FC<ClientSupportChartsProps> = ({ mode, summary }) => {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <ChartFrame title="일자별 지원시간 추이">
            <LineChart
              data={summary.byDate}
              xKey="date"
              lines={[
                { key: 'hours', label: '지원시간(h)', color: '#2563eb' },
                { key: 'cases', label: '지원건수', color: '#16a34a' }
              ]}
            />
          </ChartFrame>
        </Card>

        <Card>
          <ChartFrame title="고객사별 지원시간 TOP 10">
            <HorizontalBarChart data={summary.byCustomer} labelKey="customer" valueKey="hours" color="#0ea5e9" suffix="h" />
          </ChartFrame>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <ChartFrame title={mode === 'team' ? '팀원별 지원시간' : '지원유형 비중'}>
            {mode === 'team' ? (
              <VerticalBarChart data={summary.byMember} labelKey="member" valueKey="hours" color="#7c3aed" suffix="h" />
            ) : (
              <DonutChart data={summary.byType} labelKey="type" valueKey="value" colors={CHART_COLORS} />
            )}
          </ChartFrame>
        </Card>

        <Card>
          <ChartFrame title="지원유형 분포">
            <VerticalBarChart data={summary.byType} labelKey="type" valueKey="value" color="#f59e0b" />
          </ChartFrame>
        </Card>
      </div>
    </>
  );
};

export default ClientSupportCharts;
