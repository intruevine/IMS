import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/core/state/store';
import { Modal, Button, Input, DatePicker } from '@/shared/components/ui';
import type { Contract } from '@/types';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: Contract | null;
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  isOpen,
  onClose,
  contract
}) => {
  const createContract = useAppStore((state) => state.createContract);
  const updateContract = useAppStore((state) => state.updateContract);
  const showToast = useAppStore((state) => state.showToast);

  const [formData, setFormData] = useState<Partial<Contract>>({
    customer_name: '',
    project_title: '',
    project_type: 'maintenance',
    start_date: '',
    end_date: '',
    notes: '',
    items: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (contract) {
      setFormData({
        customer_name: contract.customer_name,
        project_title: contract.project_title,
        project_type: contract.project_type,
        start_date: contract.start_date,
        end_date: contract.end_date,
        notes: contract.notes || '',
        items: contract.items || []
      });
    } else {
      // Reset form for new contract
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      
      setFormData({
        customer_name: '',
        project_title: '',
        project_type: 'maintenance',
        start_date: today,
        end_date: nextYear.toISOString().split('T')[0],
        notes: '',
        items: []
      });
    }
    setErrors({});
  }, [contract, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_name?.trim()) {
      newErrors.customer_name = '고객사명을 입력해주세요';
    }

    if (!formData.project_title?.trim()) {
      newErrors.project_title = '프로젝트명을 입력해주세요';
    }

    if (!formData.start_date) {
      newErrors.start_date = '시작일을 선택해주세요';
    }

    if (!formData.end_date) {
      newErrors.end_date = '종료일을 선택해주세요';
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = '종료일은 시작일보다 늦어야 합니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (contract) {
        await updateContract(contract.id, formData);
        showToast('계약이 성공적으로 수정되었습니다', 'success');
      } else {
        await createContract(formData as Omit<Contract, 'id'>);
        showToast('계약이 성공적으로 등록되었습니다', 'success');
      }
      onClose();
    } catch (error) {
      showToast('저장 중 오류가 발생했습니다', 'error');
      console.error('Contract save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof Contract, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contract ? '계약 수정' : '신규 계약 등록'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<span>{contract ? '✓' : '+'}</span>}
          >
            {contract ? '수정하기' : '등록하기'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Name */}
        <Input
          label="고객사명"
          value={formData.customer_name}
          onChange={(e) => handleChange('customer_name', e.target.value)}
          error={errors.customer_name}
          placeholder="고객사명을 입력하세요"
          required
        />

        {/* Project Title */}
        <Input
          label="프로젝트명"
          value={formData.project_title}
          onChange={(e) => handleChange('project_title', e.target.value)}
          error={errors.project_title}
          placeholder="프로젝트명을 입력하세요"
          required
        />

        {/* Project Type */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            프로젝트 유형 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="project_type"
                value="maintenance"
                checked={formData.project_type === 'maintenance'}
                onChange={(e) => handleChange('project_type', e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">유지보수</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="project_type"
                value="construction"
                checked={formData.project_type === 'construction'}
                onChange={(e) => handleChange('project_type', e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">구축</span>
            </label>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="시작일"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            error={errors.start_date}
            required
          />
          <DatePicker
            label="종료일"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            error={errors.end_date}
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-bold text-slate-700 mb-1.5">
            비고
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="추가 메모가 있으면 입력하세요"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-all duration-200 min-h-[100px] resize-y"
          />
        </div>

        {/* Asset Summary (if editing) */}
        {contract && contract.items && contract.items.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-2">등록된 자산</h4>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                HW {contract.items.filter(i => i.category === 'HW').length}개
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                SW {contract.items.filter(i => i.category === 'SW').length}개
              </span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
