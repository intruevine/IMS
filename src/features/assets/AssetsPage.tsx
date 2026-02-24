import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/core/state/store';
import { Card, Button, ConfirmModal } from '@/shared/components/ui';
import type { AssetItem, AssetCategory } from '@/types';
import { AssetFormModal } from './AssetFormModal';

interface AssetWithContract extends AssetItem {
  contractId: number;
  customerName: string;
  projectTitle: string;
}

const AssetsPage: React.FC = () => {
  const assets = useAppStore((state) => state.assets);
  const totalAssets = useAppStore((state) => state.totalAssets);
  const loadAssets = useAppStore((state) => state.loadAssets);
  const assetFilter = useAppStore((state) => state.assetFilter);
  const assetSearchText = useAppStore((state) => state.assetSearchText);
  const assetPage = useAppStore((state) => state.assetPage);
  const assetItemsPerPage = useAppStore((state) => state.assetItemsPerPage);
  const setAssetFilter = useAppStore((state) => state.setAssetFilter);
  const setAssetSearchText = useAppStore((state) => state.setAssetSearchText);
  const setAssetPage = useAppStore((state) => state.setAssetPage);
  const deleteAsset = useAppStore((state) => state.deleteAsset);
  const contracts = useAppStore((state) => state.contracts);
  const loadContracts = useAppStore((state) => state.loadContracts);
  const role = useAppStore((state) => state.role);
  const isAdmin = role === 'admin';

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithContract | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<number | 'all'>('all');

  useEffect(() => {
    loadAssets();
    loadContracts();
  }, [loadAssets, loadContracts]);

  const handleDelete = async () => {
    if (selectedAsset) {
      try {
        await deleteAsset(selectedAsset.contractId, selectedAsset.id);
        setIsDeleteModalOpen(false);
        setSelectedAsset(null);
        loadAssets();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleEdit = (asset: AssetWithContract) => {
    setSelectedAsset(asset);
    setIsFormModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedAsset(null);
    setIsFormModalOpen(true);
  };

  const tabs: { key: 'all' | AssetCategory; label: string; count: number; icon: string }[] = [
    { key: 'all', label: '전체', count: totalAssets, icon: '📦' },
    { key: 'HW', label: '하드웨어', count: assets.filter(a => a.category === 'HW').length, icon: '💻' },
    { key: 'SW', label: '소프트웨어', count: assets.filter(a => a.category === 'SW').length, icon: '💿' },
  ];

  const filteredAssets = selectedContractId === 'all' 
    ? assets 
    : assets.filter(a => a.contractId === selectedContractId);

  const totalPages = Math.ceil(filteredAssets.length / assetItemsPerPage);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">자산 관리</h1>
          <p className="text-slate-500 mt-1">
            {isAdmin ? '모든 자산 정보 조회 및 관리' : '모든 자산 정보 조회'}
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={handleAdd}>
            + 자산 등록
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={assetSearchText}
              onChange={(e) => setAssetSearchText(e.target.value)}
              placeholder="품목명, 모델명, 고객사명 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="md:w-72 relative">
            <select
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 pl-10 pr-8 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
            >
              <option value="all">모든 계약</option>
              {contracts.map(contract => (
                <option key={contract.id} value={contract.id}>
                  {contract.customer_name} - {contract.project_title}
                </option>
              ))}
            </select>
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <svg className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setAssetFilter(tab.key)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                ${assetFilter === tab.key 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                assetFilter === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Assets List */}
      <div className="space-y-4">
        {filteredAssets.length > 0 ? (
          filteredAssets.map((asset) => (
            <Card key={`${asset.contractId}-${asset.id}`}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className={`
                    w-12 h-12 rounded-lg flex flex-col items-center justify-center border
                    ${asset.category === 'HW' 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : 'bg-green-50 border-green-200 text-green-600'
                    }
                  `}>
                    <span className="text-lg">{asset.category === 'HW' ? '💻' : '💿'}</span>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex flex-col items-center justify-center border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold">ID</span>
                    <span className="text-sm font-bold text-slate-700">{String(asset.id).slice(-4)}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {asset.customerName}
                    </span>
                    <span className="text-xs text-slate-400">{asset.projectTitle}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{asset.item}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {asset.product} · 수량: {asset.qty} · 점검주기: {asset.cycle}
                  </p>
                </div>

                <div className="flex flex-col gap-1 min-w-[180px] p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-sm">
                    <span className="text-slate-400">Main: </span>
                    <span className="font-medium text-slate-700">{asset.engineer?.main?.name || '-'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-400">Sub: </span>
                    <span className="font-medium text-slate-700">{asset.engineer?.sub?.name || '-'}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(asset)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      title="수정"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAsset(asset);
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
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {selectedContractId === 'all' ? '등록된 자산이 없습니다' : '선택한 계약에 자산이 없습니다'}
            </h3>
            <p className="text-slate-500 mb-4">
              {selectedContractId === 'all' 
                ? '자산을 등록하거나 다른 검색어를 입력해보세요.' 
                : '다른 계약을 선택하거나 자산을 등록해보세요.'}
            </p>
            <Button 
              variant="primary"
              onClick={() => {
                setAssetSearchText('');
                setAssetFilter('all');
                setSelectedContractId('all');
              }}
            >
              필터 초기화
            </Button>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAssetPage(assetPage - 1)}
            disabled={assetPage <= 1}
          >
            이전
          </Button>
          <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-200">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setAssetPage(page)}
                className={`
                  w-8 h-8 rounded text-sm font-medium transition-colors
                  ${assetPage === page 
                    ? 'bg-blue-500 text-white' 
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                {page}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAssetPage(assetPage + 1)}
            disabled={assetPage >= totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="자산 삭제"
        message={`"${selectedAsset?.item}" 자산을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* Asset Form Modal */}
      <AssetFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
        onSuccess={() => {
          loadAssets();
          setIsFormModalOpen(false);
          setSelectedAsset(null);
        }}
      />
    </div>
  );
};

export default AssetsPage;
