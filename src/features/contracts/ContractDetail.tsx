import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/core/state/store';
import { assetsAPI } from '@/core/api/client';
import { Card, Button, StatusBadge, ConfirmModal } from '@/shared/components/ui';
import { AssetFormModal } from './AssetFormModal';
import type { Contract, AssetItem } from '@/types';
import { getContractStatus, calculateProgress } from '@/shared/utils/contract';

interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
  onEdit: () => void;
}

export const ContractDetail: React.FC<ContractDetailProps> = ({
  contract,
  onBack,
  onEdit
}) => {
  const deleteAsset = useAppStore((state) => state.deleteAsset);
  const showToast = useAppStore((state) => state.showToast);
  const currentContract = useAppStore((state) => state.currentContract);
  const displayContract = currentContract?.id === contract.id ? currentContract : contract;
  
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isDeleteAssetModalOpen, setIsDeleteAssetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'assets'>('info');

  const status = getContractStatus(displayContract.end_date);
  const progress = calculateProgress(displayContract.start_date, displayContract.end_date);

  const handleDeleteAsset = async () => {
    if (selectedAsset) {
      await deleteAsset(displayContract.id, selectedAsset.id);
      setIsDeleteAssetModalOpen(false);
      setSelectedAsset(null);
      showToast('자산이 삭제되었습니다', 'success');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="!px-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Back arrow</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={status} />
              <span className="text-xs text-slate-500">ID: {String(displayContract.id).padStart(4, '0')}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{displayContract.project_title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onEdit}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Edit icon</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            수정
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 font-bold text-sm transition-colors ${
            activeTab === 'info'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          기본 정보
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 font-bold text-sm transition-colors ${
            activeTab === 'assets'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          자산 목록 ({displayContract.items.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contract Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-lg font-bold text-slate-900 mb-4">계약 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">고객사명</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">{displayContract.customer_name}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">프로젝트명</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">{displayContract.project_title}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">시작일</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">{displayContract.start_date}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">종료일</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">{displayContract.end_date}</p>
                </div>
              </div>
              
              {displayContract.notes && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">비고</span>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{displayContract.notes}</p>
                </div>
              )}
            </Card>

            {/* Progress */}
            <Card>
              <h3 className="text-lg font-bold text-slate-900 mb-4">계약 진행률</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">진행률</span>
                  <span className="font-bold text-slate-900">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full rounded-full ${
                      status === 'expired' ? 'bg-slate-400' :
                      status === 'expiring' ? 'bg-red-500' : 'bg-primary-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>{displayContract.start_date}</span>
                  <span>{displayContract.end_date}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold text-slate-900 mb-4">자산 현황</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-400"></span>
                    <span className="text-sm font-medium text-slate-700">하드웨어 (HW)</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    {displayContract.items.filter(i => i.category === 'HW').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                    <span className="text-sm font-medium text-slate-700">소프트웨어 (SW)</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    {displayContract.items.filter(i => i.category === 'SW').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-100">
                  <span className="text-sm font-medium text-primary-700">총 자산 수</span>
                  <span className="text-lg font-bold text-primary-900">{displayContract.items.length}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-slate-900 mb-4">메타 정보</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">생성일</span>
                  <span className="text-slate-900">{displayContract.created_at || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">수정일</span>
                  <span className="text-slate-900">{displayContract.updated_at || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">생성자</span>
                  <span className="text-slate-900">{displayContract.created_by || '-'}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Assets Tab */
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">자산 목록</h3>
            <Button
              variant="primary"
              leftIcon={<span>+</span>}
              onClick={() => {
                setSelectedAsset(null);
                setIsAssetModalOpen(true);
              }}
            >
              자산 추가
            </Button>
          </div>

          {displayContract.items.length > 0 ? (
            <div className="space-y-3">
              {displayContract.items.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
                          asset.category === 'HW' ? 'bg-indigo-500' : 'bg-teal-500'
                        }`}>
                          {asset.category}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{asset.item}</h4>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {asset.cycle}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{asset.product}</p>
                          {asset.details && asset.details.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {asset.details.map((detail, detailIndex) => (
                                <p key={`${asset.id}-detail-${detailIndex}`} className="text-xs text-slate-500">
                                  - {detail.content} {detail.qty ? `(${detail.qty}${detail.unit || ''})` : ''}
                                </p>
                              ))}
                            </div>
                          )}
                          {asset.engineer?.main?.name && (
                            <p className="text-xs text-slate-400 mt-1">
                              담당: {asset.engineer.main.name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">수량: {asset.qty}</p>
                          {asset.company && (
                            <p className="text-xs text-slate-400">{asset.company}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="!p-2"
                            onClick={async () => {
                              try {
                                const latest = await assetsAPI.getById(asset.id);
                                setSelectedAsset({
                                  ...asset,
                                  ...latest
                                });
                              } catch (error) {
                                console.error('Failed to load asset detail:', error);
                                setSelectedAsset(asset);
                              }
                              setIsAssetModalOpen(true);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <title>Edit asset</title>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="!p-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedAsset(asset);
                              setIsDeleteAssetModalOpen(true);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <title>Delete asset</title>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <div className="text-5xl mb-3">📦</div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">등록된 자산이 없습니다</h4>
              <p className="text-slate-400 mb-4">이 계약에 자산을 추가해보세요.</p>
              <Button
                variant="primary"
                leftIcon={<span>+</span>}
                onClick={() => {
                  setSelectedAsset(null);
                  setIsAssetModalOpen(true);
                }}
              >
                자산 추가하기
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Asset Form Modal */}
      <AssetFormModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setSelectedAsset(null);
        }}
        contractId={displayContract.id}
        asset={selectedAsset}
      />

      {/* Delete Asset Confirmation */}
      <ConfirmModal
        isOpen={isDeleteAssetModalOpen}
        onClose={() => setIsDeleteAssetModalOpen(false)}
        onConfirm={handleDeleteAsset}
        title="자산 삭제"
        message={`"${selectedAsset?.item}" 자산을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
};
