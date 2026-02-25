import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/core/state/store';
import { Modal, Button, Input, Select } from '@/shared/components/ui';
import type { AssetItem, InspectionCycle, AssetDetail, ContactPerson } from '@/types';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
  asset?: AssetItem | null;
}

const CATEGORY_OPTIONS = [
  { value: 'HW', label: '하드웨어' },
  { value: 'SW', label: '소프트웨어' }
];

const CYCLE_OPTIONS: { value: InspectionCycle; label: string }[] = [
  { value: '월', label: '월' },
  { value: '분기', label: '분기' },
  { value: '반기', label: '반기' },
  { value: '연', label: '연' },
  { value: '장애시', label: '장애시' }
];

const UNIT_OPTIONS = [
  { value: 'ea', label: 'EA' },
  { value: 'set', label: 'SET' },
  { value: 'lic', label: 'LIC' },
  { value: '대', label: '대' },
  { value: '개', label: '개' }
];

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  contractId,
  asset
}) => {
  const addAsset = useAppStore((state) => state.addAsset);
  const updateAsset = useAppStore((state) => state.updateAsset);
  const showToast = useAppStore((state) => state.showToast);

  const [formData, setFormData] = useState<Partial<AssetItem>>({
    category: 'HW',
    item: '',
    product: '',
    qty: 1,
    cycle: '월',
    scope: '',
    remark: '',
    company: '',
    engineer: {
      main: { name: '', rank: '', phone: '', email: '' },
      sub: { name: '', rank: '', phone: '', email: '' }
    },
    sales: { name: '', rank: '', phone: '', email: '' },
    details: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const calculateDetailsTotal = (details: AssetDetail[] = []) =>
    details.reduce((sum, detail) => {
      const parsed = Number(detail.qty);
      return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
    }, 0);
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  useEffect(() => {
    if (asset) {
      const details = asset.details || [];
      setFormData({
        category: asset.category,
        item: asset.item,
        product: asset.product,
        qty: details.length > 0 ? Math.max(1, calculateDetailsTotal(details)) : asset.qty,
        cycle: asset.cycle,
        scope: asset.scope || '',
        remark: asset.remark || '',
        company: asset.company || '',
        engineer: asset.engineer || {
          main: { name: '', rank: '', phone: '', email: '' },
          sub: { name: '', rank: '', phone: '', email: '' }
        },
        sales: asset.sales || { name: '', rank: '', phone: '', email: '' },
        details
      });
    } else {
      setFormData({
        category: 'HW',
        item: '',
        product: '',
        qty: 1,
        cycle: '월',
        scope: '',
        remark: '',
        company: '',
        engineer: {
          main: { name: '', rank: '', phone: '', email: '' },
          sub: { name: '', rank: '', phone: '', email: '' }
        },
        sales: { name: '', rank: '', phone: '', email: '' },
        details: []
      });
    }
    setErrors({});
  }, [asset]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.item?.trim()) {
      newErrors.item = '품목명을 입력해주세요';
    }

    if (!formData.product?.trim()) {
      newErrors.product = '모델명을 입력해주세요';
    }

    if (!formData.qty || formData.qty < 1) {
      newErrors.qty = '수량은 1 이상이어야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (asset) {
        await updateAsset(contractId, asset.id, formData);
        showToast('자산이 성공적으로 수정되었습니다', 'success');
      } else {
        await addAsset(contractId, formData as Omit<AssetItem, 'id'>);
        showToast('자산이 성공적으로 등록되었습니다', 'success');
      }
      onClose();
    } catch (error) {
      showToast('저장 중 오류가 발생했습니다', 'error');
      console.error('Asset save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AssetItem, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleEngineerChange = (field: 'main' | 'sub', subField: keyof ContactPerson, value: string) => {
    const normalizedValue = subField === 'phone' ? formatPhoneNumber(value) : value;
    setFormData((prev) => {
      const currentEngineer = prev.engineer || {
        main: { name: '', rank: '', phone: '', email: '' },
        sub: { name: '', rank: '', phone: '', email: '' }
      };
      const currentField = currentEngineer[field] || { name: '', rank: '', phone: '', email: '' };
      
      return {
        ...prev,
        engineer: {
          ...currentEngineer,
          [field]: {
            ...currentField,
            [subField]: normalizedValue
          }
        }
      };
    });
  };

  const handleSalesChange = (field: keyof ContactPerson, value: string) => {
    const normalizedValue = field === 'phone' ? formatPhoneNumber(value) : value;
    setFormData((prev) => {
      const currentSales = prev.sales || { name: '', rank: '', phone: '', email: '' };
      return {
        ...prev,
        sales: {
          ...currentSales,
          [field]: normalizedValue
        }
      };
    });
  };

  const handleDetailChange = (index: number, field: keyof AssetDetail, value: string) => {
    setFormData((prev) => {
      const currentDetails = [...(prev.details || [])];
      currentDetails[index] = {
        ...currentDetails[index],
        [field]: value
      };
      return {
        ...prev,
        details: currentDetails,
        qty: currentDetails.length > 0 ? Math.max(1, calculateDetailsTotal(currentDetails)) : prev.qty
      };
    });
  };

  const addDetail = () => {
    setFormData((prev) => {
      const nextDetails = [...(prev.details || []), { content: '', qty: '', unit: 'ea' }];
      return {
        ...prev,
        details: nextDetails,
        qty: Math.max(1, calculateDetailsTotal(nextDetails))
      };
    });
  };

  const removeDetail = (index: number) => {
    setFormData((prev) => {
      const nextDetails = (prev.details || []).filter((_, i) => i !== index);
      return {
        ...prev,
        details: nextDetails,
        qty: nextDetails.length > 0 ? Math.max(1, calculateDetailsTotal(nextDetails)) : 1
      };
    });
  };

  const isDetailsDrivenQty = (formData.details || []).length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={asset ? '자산 정보 수정' : '자산 정보 등록'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<span>✓</span>}
          >
            정보 저장
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
        {/* 기본 정보 섹션 */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
          <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Tag icon</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            기본 정보
          </h4>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* 분류 (카테고리) */}
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1.5">분류</span>
              <div className="flex gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleChange('category', opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      formData.category === opt.value
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 품목명 */}
            <Input
              label="품목명"
              value={formData.item}
              onChange={(e) => handleChange('item', e.target.value)}
              error={errors.item}
              placeholder="예: 방화벽"
              required
            />

            {/* 모델명 */}
            <Input
              label="모델명"
              value={formData.product}
              onChange={(e) => handleChange('product', e.target.value)}
              error={errors.product}
              placeholder="예: AXGATE 4000"
              required
            />
          </div>
        </div>

        {/* 상세 구성 섹션 */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>List icon</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              상세 구성
            </h4>
            <Button variant="primary" size="sm" onClick={addDetail} type="button">
              + 항목 추가
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            {(formData.details || []).map((detail, idx) => (
              <div key={`detail-${idx}`} className="flex gap-2 items-center">
                <Input
                  value={detail.content}
                  onChange={(e) => handleDetailChange(idx, 'content', e.target.value)}
                  placeholder="내용"
                  className="flex-1"
                />
                <Input
                  value={detail.qty}
                  onChange={(e) => handleDetailChange(idx, 'qty', e.target.value)}
                  placeholder="수량"
                  className="w-24"
                />
                <select
                  value={detail.unit}
                  onChange={(e) => handleDetailChange(idx, 'unit', e.target.value)}
                  className="w-24 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="!p-2 text-red-500"
                  onClick={() => removeDetail(idx)}
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <title>Remove icon</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>

          {/* 총 수량 & 점검 주기 */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="총 수량"
              type="number"
              min={1}
              value={formData.qty}
              onChange={(e) => handleChange('qty', parseInt(e.target.value) || 1)}
              error={errors.qty}
              helperText={isDetailsDrivenQty ? '상세 구성 수량 합계로 자동 계산됩니다.' : undefined}
              readOnly={isDetailsDrivenQty}
              required
            />
            <Select
              label="점검 주기"
              value={formData.cycle}
              onChange={(e) => handleChange('cycle', e.target.value as InspectionCycle)}
              options={CYCLE_OPTIONS}
              required
            />
          </div>
        </div>

        {/* 유지보수 섹션 */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
          <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Wrench icon</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            유지보수
          </h4>
          
          <div className="space-y-4">
            <Input
              label="수행 업체"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="업체명"
            />
            
            <div>
              <label htmlFor="scope" className="block text-sm font-medium text-slate-700 mb-1.5">
                지원 범위
              </label>
              <textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => handleChange('scope', e.target.value)}
                placeholder="지원 내용을 입력하세요"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-all duration-200 min-h-[100px] resize-y"
              />
            </div>

            <div>
              <label htmlFor="remark" className="block text-sm font-medium text-slate-700 mb-1.5">
                비고
              </label>
              <textarea
                id="remark"
                value={formData.remark}
                onChange={(e) => handleChange('remark', e.target.value)}
                placeholder="특이사항"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-all duration-200 min-h-[100px] resize-y"
              />
            </div>
          </div>
        </div>

        {/* 담당자 정보 섹션 - 3컬럼 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MAIN ENGINEER */}
          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-600 uppercase mb-4">Main Engineer</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={formData.engineer?.main?.name || ''}
                  onChange={(e) => handleEngineerChange('main', 'name', e.target.value)}
                  placeholder="성명"
                />
                <Input
                  value={formData.engineer?.main?.rank || ''}
                  onChange={(e) => handleEngineerChange('main', 'rank', e.target.value)}
                  placeholder="직급"
                />
              </div>
              <Input
                value={formData.engineer?.main?.phone || ''}
                onChange={(e) => handleEngineerChange('main', 'phone', e.target.value)}
                placeholder="연락처"
              />
              <Input
                value={formData.engineer?.main?.email || ''}
                onChange={(e) => handleEngineerChange('main', 'email', e.target.value)}
                placeholder="이메일"
              />
            </div>
          </div>

          {/* SUB ENGINEER */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-600 uppercase mb-4">Sub Engineer</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={formData.engineer?.sub?.name || ''}
                  onChange={(e) => handleEngineerChange('sub', 'name', e.target.value)}
                  placeholder="성명"
                />
                <Input
                  value={formData.engineer?.sub?.rank || ''}
                  onChange={(e) => handleEngineerChange('sub', 'rank', e.target.value)}
                  placeholder="직급"
                />
              </div>
              <Input
                value={formData.engineer?.sub?.phone || ''}
                onChange={(e) => handleEngineerChange('sub', 'phone', e.target.value)}
                placeholder="연락처"
              />
              <Input
                value={formData.engineer?.sub?.email || ''}
                onChange={(e) => handleEngineerChange('sub', 'email', e.target.value)}
                placeholder="이메일"
              />
            </div>
          </div>

          {/* 영업대표 */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-600 uppercase mb-4">영업대표</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={formData.sales?.name || ''}
                  onChange={(e) => handleSalesChange('name', e.target.value)}
                  placeholder="성명"
                />
                <Input
                  value={formData.sales?.rank || ''}
                  onChange={(e) => handleSalesChange('rank', e.target.value)}
                  placeholder="직급"
                />
              </div>
              <Input
                value={formData.sales?.phone || ''}
                onChange={(e) => handleSalesChange('phone', e.target.value)}
                placeholder="연락처"
              />
              <Input
                value={formData.sales?.email || ''}
                onChange={(e) => handleSalesChange('email', e.target.value)}
                placeholder="이메일"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
