
import React, { useState } from 'react';
import { Card, Button, Badge } from '@/shared/components/ui';
import { getContractStatus, calculateProgress } from '@/shared/utils/contract';
import type { Contract } from '@/types';

// Mock Data for demonstration
const mockContracts: Contract[] = [
  { id: 1, project_title: '본사 ERP 시스템 고도화', customer_name: '대기업A', start_date: '2025-03-01', end_date: '2026-02-28', project_type: 'maintenance', items: [], total_amount: 50000000 },
  { id: 2, project_title: '모바일 앱 v2.0 개발', customer_name: '스타트업B', start_date: '2024-08-01', end_date: '2025-04-30', project_type: 'construction', items: [], total_amount: 80000000 },
  { id: 3, project_title: '클라우드 인프라 마이그레이션', customer_name: '중견기업C', start_date: '2024-01-15', end_date: '2025-01-14', project_type: 'construction', items: [], total_amount: 120000000 },
  { id: 4, project_title: '그룹웨어 보안 강화 컨설팅', customer_name: '금융사D', start_date: '2025-01-01', end_date: '2025-03-31', project_type: 'maintenance', items: [], total_amount: 35000000 },
  { id: 5, project_title: '빅데이터 분석 플랫폼 구축', customer_name: '통신사E', start_date: '2023-09-01', end_date: '2024-08-31', project_type: 'construction', items: [], total_amount: 250000000 },
];


export const SampleBDataTable: React.FC = () => {
  const [contracts] = useState<Contract[]>(mockContracts);

  const statusMap = {
    active: { label: '진행중', color: 'blue' as const },
    expiring: { label: '만료예정', color: 'amber' as const },
    expired: { label: '만료', color: 'slate' as const },
  };

  return (
    <div className="bg-slate-50 p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">계약 관리 (Sample B: Data Table)</h1>
              <p className="text-slate-500 mt-2">정보 밀도가 높은 테이블 기반 레이아웃 샘플입니다.</p>
            </div>
            <Button variant="primary" size="lg" className="shadow-lg shadow-blue-500/20 hover:shadow-xl transition-shadow">
              + 새 계약
            </Button>
        </div>

        {/* Contracts Table */}
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold">프로젝트명</th>
                            <th scope="col" className="px-6 py-4 font-semibold">고객사</th>
                            <th scope="col" className="px-6 py-4 font-semibold">상태</th>
                            <th scope="col" className="px-6 py-4 font-semibold">기간</th>
                            <th scope="col" className="px-6 py-4 font-semibold text-right">계약금액</th>
                            <th scope="col" className="px-6 py-4 font-semibold">진행률</th>
                            <th scope="col" className="px-6 py-4"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map((contract) => {
                             const status = getContractStatus(contract.end_date);
                             const progress = calculateProgress(contract.start_date, contract.end_date);
                            return (
                                <tr key={contract.id} className="bg-white border-b hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{contract.project_title}</td>
                                    <td className="px-6 py-4">{contract.customer_name}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={statusMap[status].color}>{statusMap[status].label}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-xs">{contract.start_date}<br/>~ {contract.end_date}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800 text-right">{contract.total_amount.toLocaleString()} 원</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full ${status === 'active' ? 'bg-blue-500' : status === 'expiring' ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold">{progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="font-medium text-blue-600 hover:underline">수정</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default SampleBDataTable;
