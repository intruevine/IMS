
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
];

const ContractCard = ({ contract }: { contract: Contract }) => {
    const status = getContractStatus(contract.end_date);
    const progress = calculateProgress(contract.start_date, contract.end_date);
    const statusMap = {
        active: { label: '진행중', color: 'blue' as const },
        expiring: { label: '만료예정', color: 'amber' as const },
        expired: { label: '만료', color: 'slate' as const },
    };

    return (
        <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="flex flex-col h-full">
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-3">
                         <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            contract.project_type === 'maintenance'
                              ? 'bg-sky-100 text-sky-800 border-sky-200'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          }`}>
                          {contract.project_type === 'maintenance' ? '유지보수' : '구축'}
                        </span>
                        <Badge variant={statusMap[status].color}>{statusMap[status].label}</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 truncate mb-1">{contract.project_title}</h3>
                    <p className="text-sm text-slate-500">{contract.customer_name}</p>
                </div>

                <div className="mt-6">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                        <span>진행률 {progress}%</span>
                        <span>{contract.end_date} 만료</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full ${status === 'active' ? 'bg-blue-500' : status === 'expiring' ? 'bg-amber-500' : 'bg-slate-400'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
};


export const SampleAClean: React.FC = () => {
  const [contracts] = useState<Contract[]>(mockContracts);

  return (
    <div className="bg-slate-50 p-8 min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">계약 관리 (Sample A: Clean)</h1>
              <p className="text-slate-500 mt-2">카드 기반의 깔끔하고 정돈된 레이아웃 샘플입니다.</p>
            </div>
            <Button variant="primary" size="lg" className="shadow-lg shadow-blue-500/20 hover:shadow-xl transition-shadow">
              + 새 계약
            </Button>
        </div>

        {/* Contract List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SampleAClean;
