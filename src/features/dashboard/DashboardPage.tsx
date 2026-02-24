import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/core/state/store';
import { Card, CardHeader, Button } from '@/shared/components/ui';
import { StatusBadge } from '@/shared/components/ui/Badge';
import type { Contract } from '@/types';
import { calculateProgress, formatDate, getContractStatus } from '@/shared/utils/contract';

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card className="border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900">
          {value}
          <span className="text-base font-normal text-slate-500 ml-1">개</span>
        </p>
      </div>
      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">
        {icon}
      </div>
    </div>
  </Card>
);

const ContractCard: React.FC<{ contract: Contract }> = ({ contract }) => {
  const status = getContractStatus(contract.end_date);
  const progress = calculateProgress(contract.start_date, contract.end_date);
  const hwCount = contract.items.filter((i) => i.category === 'HW').length;
  const swCount = contract.items.filter((i) => i.category === 'SW').length;

  return (
    <Link to={`/contracts?id=${contract.id}`}>
      <Card hover className="cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-xs text-slate-400 font-bold">ID</span>
            <span className="text-sm font-bold text-slate-700">{String(contract.id).slice(-4)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {contract.customer_name}
              </span>
              <StatusBadge status={status} />
            </div>
            <h4 className="font-semibold text-slate-900 truncate">{contract.project_title}</h4>
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(contract.start_date)} ~ {formatDate(contract.end_date)} ({progress}%)
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">HW {hwCount}</span>
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200">SW {swCount}</span>
            </div>

            <div className="w-24">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor:
                      status === 'expired'
                        ? '#94a3b8'
                        : status === 'expiring'
                          ? '#f59e0b'
                          : '#3b82f6',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <Card hover className="cursor-pointer h-full" onClick={onClick}>
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  </Card>
);

const DashboardPage: React.FC = () => {
  const stats = useAppStore((state) => state.stats);
  const recentContracts = useAppStore((state) => state.recentContracts);
  const loadDashboardData = useAppStore((state) => state.loadDashboardData);
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const quickActions = [
    {
      title: '신규 계약',
      description: '새로운 계약을 등록합니다.',
      icon: '📝',
      onClick: () => navigate('/contracts?action=create'),
    },
    {
      title: '자산 조회',
      description: '전체 자산 현황을 확인합니다.',
      icon: '🧾',
      onClick: () => navigate('/assets'),
    },
    {
      title: '일정 관리',
      description: '점검 일정을 관리합니다.',
      icon: '📅',
      onClick: () => navigate('/calendar'),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">안녕하세요, {user?.display_name || user?.username}님</h1>
        <p className="text-slate-500 mt-1">오늘의 유지보수 현황을 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="전체 계약" value={stats.totalContracts} icon="📄" color="#3b82f6" />
        <StatCard title="진행 중" value={stats.activeContracts} icon="✅" color="#22c55e" />
        <StatCard title="만료 임박" value={stats.expiringContracts} icon="⏳" color="#f59e0b" />
        <StatCard title="만료" value={stats.expiredContracts} icon="⛔" color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardHeader
            title="최근 계약"
            subtitle="최근 업데이트된 계약 목록"
            action={
              <Link to="/contracts">
                <Button variant="ghost" size="sm">
                  전체 보기
                </Button>
              </Link>
            }
            icon={<span>📄</span>}
          />
          <div className="space-y-4">
            {recentContracts.length > 0 ? (
              recentContracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))
            ) : (
              <Card className="text-center py-12">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-slate-500">등록된 계약이 없습니다.</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={() => navigate('/contracts?action=create')}>
                  첫 계약 등록
                </Button>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <CardHeader title="빠른 작업" icon={<span>⚡</span>} />
            <div className="space-y-3">
              {quickActions.map((action) => (
                <QuickActionCard key={action.title} {...action} />
              ))}
            </div>
          </div>

          <Card>
            <CardHeader title="시스템 정보" icon={<span>ℹ️</span>} />
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">버전</span>
                <span className="font-medium">v2.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">접속 권한</span>
                <span className="font-medium">{role === 'admin' ? '관리자' : '사용자'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">총 자산</span>
                <span className="font-medium text-blue-600">{stats.totalAssets}개</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
