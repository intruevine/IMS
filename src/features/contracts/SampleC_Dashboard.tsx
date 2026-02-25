
import React, { useState } from 'react';
import { Card, Button, Badge } from '@/shared/components/ui';
import { getContractStatus } from '@/shared/utils/contract';
import type { Contract } from '@/types';

// Mock Data for demonstration
const mockContracts: Contract[] = [
  { id: 1, project_title: '본사 ERP 시스템 고도화', customer_name: '대기업A', start_date: '2025-03-01', end_date: '2026-02-28', project_type: 'maintenance', items: [], total_amount: 50000000 },
  { id: 2, project_title: '모바일 앱 v2.0 개발', customer_name: '스타트업B', start_date: '2024-08-01', end_date: '2025-04-30', project_type: 'construction', items: [], total_amount: 80000000 },
  { id: 3, project_title: '클라우드 인프라 마이그레이션', customer_name: '중견기업C', start_date: '2024-01-15', end_date: '2025-01-14', project_type: 'construction', items: [], total_amount: 120000000 },
  { id: 4, project_title: '그룹웨어 보안 강화 컨설팅', customer_name: '금융사D', start_date: '2025-01-01', end_date: '2025-03-31', project_type: 'maintenance', items: [], total_amount: 35000000 },
];

const StatCard = ({ title, value, change, icon }: { title: string, value: string, change?: string, icon: React.ReactNode }) => (
    <Card>
        <div className="flex items-center">
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-4">
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    </Card>
);

const ChartPlaceholder = ({title}: {title: string}) => (
     <Card>
        <h3 className="text-md font-semibold text-slate-700 mb-3">{title}</h3>
        <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
            <p className="text-sm text-slate-400">Chart Library (e.g. Recharts) required</p>
        </div>
    </Card>
);

export const SampleCDashboard: React.FC = () => {
  const [contracts] = useState<Contract[]>(mockContracts);
  const activeContracts = contracts.filter(c => getContractStatus(c.end_date) === 'active').length;
  const expiringContracts = contracts.filter(c => getContractStatus(c.end_date) === 'expiring').length;
  const totalAmount = contracts.reduce((acc, c) => acc + c.total_amount, 0);

  return (
    <div className="bg-slate-50 p-8 min-h-screen">
       <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">계약 대시보드 (Sample C: Dashboard)</h1>
              <p className="text-slate-500 mt-2">핵심 지표와 차트를 포함한 대시보드 레이아웃 샘플입니다.</p>
            </div>
            <Button variant="primary" size="lg" className="shadow-lg shadow-blue-500/20 hover:shadow-xl transition-shadow">
              + 새 계약
            </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="총 계약" value={contracts.length.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
            <StatCard title="진행중 계약" value={activeContracts.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>} />
            <StatCard title="만료예정 계약" value={expiringContracts.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatCard title="총 계약금액" value={`${(totalAmount / 100000000).toFixed(1)} 억`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        </div>

        {/* Charts & Recent Contracts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <ChartPlaceholder title="월별 계약 현황"/>
            </div>
            <div>
                 <Card>
                    <h3 className="text-md font-semibold text-slate-700 mb-4">최근 계약</h3>
                    <div className="space-y-4">
                        {contracts.slice(0, 3).map(c => (
                            <div key={c.id} className="flex items-center">
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-800">{c.project_title}</p>
                                    <p className="text-sm text-slate-500">{c.customer_name}</p>
                                </div>
                                <Badge variant={getContractStatus(c.end_date) === 'active' ? 'blue' : 'amber'}>
                                    {c.start_date}
                                </Badge>
                            </div>
                        ))}
                    </div>
                 </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SampleCDashboard;
