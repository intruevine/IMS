import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/core/state/store';
import { Card, Button, StatusBadge, ConfirmModal, Modal } from '@/shared/components/ui';
import { ContractFormModal } from './ContractFormModal';
import { ContractDetail } from './ContractDetail';
import type { Contract, FilterStatus } from '@/types';
import { getContractStatus, calculateProgress } from '@/shared/utils/contract';
import { exportToExcel, importFromExcel } from '@/shared/utils/excel';

const ContractsPage: React.FC = () => {
  const contracts = useAppStore((state) => state.contracts);
  const loadContracts = useAppStore((state) => state.loadContracts);
  const deleteContract = useAppStore((state) => state.deleteContract);
  const setFilter = useAppStore((state) => state.setFilter);
  const setSearchText = useAppStore((state) => state.setSearchText);
  const filter = useAppStore((state) => state.filter);
  const searchText = useAppStore((state) => state.searchText);
  const role = useAppStore((state) => state.role);
  const canManageContracts = role === 'admin' || role === 'manager';
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'maintenance' | 'construction'>('all');
  
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Contract[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showToast = useAppStore((state) => state.showToast);
  const createContract = useAppStore((state) => state.createContract);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleDelete = async () => {
    if (selectedContract) {
      await deleteContract(selectedContract.id);
      setIsDeleteModalOpen(false);
      setSelectedContract(null);
    }
  };

  const handleViewDetail = (contract: Contract) => {
    setSelectedContract(contract);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedContract(null);
  };

  const handleExportExcel = () => {
    exportToExcel(contracts);
    showToast('Excel 내보내기가 완료되었습니다.', 'success');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedContracts = await importFromExcel(file);
      setImportPreview(importedContracts);
      setIsImportModalOpen(true);
    } catch (error) {
      showToast('Excel 파일을 읽는 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleImportConfirm = async () => {
    try {
      for (const contract of importPreview) {
        await createContract(contract);
      }
      showToast(`${importPreview.length}건의 계약이 생성되었습니다.`, 'success');
      setIsImportModalOpen(false);
      setImportPreview([]);
      loadContracts();
    } catch (error) {
      showToast('계약 생성 중 오류가 발생했습니다.', 'error');
    }
  };

  const tabs: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: 'all', label: '전체', count: contracts.length, color: 'bg-slate-500' },
    {
      key: 'active',
      label: '진행 중',
      count: contracts.filter((c) => getContractStatus(c.end_date) === 'active').length,
      color: 'bg-green-500'
    },
    {
      key: 'expiring',
      label: '만료 예정',
      count: contracts.filter((c) => getContractStatus(c.end_date) === 'expiring').length,
      color: 'bg-amber-500'
    },
    {
      key: 'expired',
      label: '만료',
      count: contracts.filter((c) => getContractStatus(c.end_date) === 'expired').length,
      color: 'bg-red-500'
    }
  ];

  const filteredContracts = contracts.filter(contract => {
    const matchesFilter = filter === 'all' || getContractStatus(contract.end_date) === filter;
    const matchesSearch = !searchText || 
      contract.customer_name.toLowerCase().includes(searchText.toLowerCase()) ||
      contract.project_title.toLowerCase().includes(searchText.toLowerCase());
    const matchesProjectType = projectTypeFilter === 'all' || contract.project_type === projectTypeFilter;
    return matchesFilter && matchesSearch && matchesProjectType;
  });

  if (viewMode === 'detail' && selectedContract) {
    return (
      <>
        <ContractDetail
          contract={selectedContract}
          onBack={handleBackToList}
          onEdit={() => setIsFormModalOpen(true)}
        />
        <ContractFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
          }}
          contract={selectedContract}
        />
      </>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">계약 관리</h1>
          <p className="text-slate-500 mt-1">
            {canManageContracts ? '계약 현황을 조회하고 관리합니다.' : '계약 현황을 조회합니다.'}
          </p>
        </div>
        {canManageContracts && (
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Excel 가져오기
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>
              Excel 내보내기
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedContract(null);
                setIsFormModalOpen(true);
              }}
            >
              + 새 계약 등록
            </Button>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="고객사 또는 프로젝트명을 검색하세요..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="md:w-48">
            <select
              value={projectTypeFilter}
              onChange={(e) => setProjectTypeFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="all">전체 유형</option>
              <option value="maintenance">유지보수</option>
              <option value="construction">구축</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                ${filter === tab.key 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
                }
              `}
            >
              {tab.key !== 'all' && <span className={`w-2 h-2 rounded-full ${tab.color}`} />}
              <span>{tab.label}</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                filter === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Contracts List */}
      <div className="space-y-4">
        {filteredContracts.length > 0 ? (
          filteredContracts.map((contract) => {
            const status = getContractStatus(contract.end_date);
            const progress = calculateProgress(contract.start_date, contract.end_date);
            const hwCount = contract.items.filter(i => i.category === 'HW').length;
            const swCount = contract.items.filter(i => i.category === 'SW').length;

            return (
              <Card hover className="cursor-pointer" key={contract.id} onClick={() => handleViewDetail(contract)}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-slate-400 font-bold">ID</span>
                      <span className="text-sm font-bold text-slate-700">{String(contract.id).slice(-4)}</span>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                        contract.project_type === 'maintenance'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-purple-100 text-purple-700 border-purple-200'
                      }`}
                    >
                      {contract.project_type === 'maintenance' ? '유지보수' : '구축'}
                    </span>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {contract.customer_name}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900">{contract.project_title}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {contract.start_date} ~ {contract.end_date} (진행률 {progress}%)
                    </p>
                  </div>

                    <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">HW {hwCount}</span>
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200">SW {swCount}</span>
                    </div>
                    <div className="w-20">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, backgroundColor: status === 'expired' ? '#94a3b8' : status === 'expiring' ? '#f59e0b' : '#3b82f6' }}
                        />
                      </div>
                    </div>
                    {canManageContracts && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContract(contract);
                            setIsFormModalOpen(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContract(contract);
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">계약이 없습니다</div>
            <p className="text-slate-500">검색 결과가 없습니다</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => {
                setSearchText('');
                setFilter('all');
              }}
            >
              검색 초기화
            </Button>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="계약 삭제"
        message={`"${selectedContract?.project_title}" 계약을 삭제하시겠습니까?\n\n삭제한 계약은 복구할 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* Contract Form Modal */}
      <ContractFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
      />

      {/* Import Preview Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Preview"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleImportConfirm}>
              Import {importPreview.length} contracts
            </Button>
          </>
        }
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-500 mb-4">
            Previewing <span className="font-semibold">{importPreview.length}</span> contracts before import:
          </p>
          <div className="space-y-2">
            {importPreview.map((contract, index) => (
              <Card key={`${contract.customer_name}-${contract.project_title}-${index}`} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{contract.customer_name}</p>
                    <p className="text-sm text-slate-500 truncate">{contract.project_title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Assets: {contract.items.length}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContractsPage;


