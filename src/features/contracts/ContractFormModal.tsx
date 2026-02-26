import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/core/state/store';
import { contractsAPI } from '@/core/api/client';
import { Modal, Button, Input, DatePicker } from '@/shared/components/ui';
import type { Contract } from '@/types';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: Contract | null;
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({ isOpen, onClose, contract }) => {
  const createContract = useAppStore((state) => state.createContract);
  const updateContract = useAppStore((state) => state.updateContract);
  const showToast = useAppStore((state) => state.showToast);
  const role = useAppStore((state) => state.role);

  const [formData, setFormData] = useState<Partial<Contract>>({
    customer_name: '',
    project_title: '',
    project_type: 'maintenance',
    start_date: '',
    end_date: '',
    notes: '',
    items: []
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toDateInputValue = (value?: string) => {
    if (!value) return '';
    return value.slice(0, 10);
  };

  useEffect(() => {
    if (contract) {
      setFormData({
        customer_name: contract.customer_name,
        project_title: contract.project_title,
        project_type: contract.project_type,
        start_date: toDateInputValue(contract.start_date),
        end_date: toDateInputValue(contract.end_date),
        notes: contract.notes || '',
        items: contract.items || []
      });
    } else {
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
    setSelectedFiles([]);
    setErrors({});
  }, [contract, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_name?.trim()) newErrors.customer_name = '고객사명을 입력해 주세요';
    if (!formData.project_title?.trim()) newErrors.project_title = '프로젝트명을 입력해 주세요';
    if (!formData.start_date) newErrors.start_date = '시작일을 선택해 주세요';
    if (!formData.end_date) newErrors.end_date = '종료일을 선택해 주세요';

    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.end_date = '종료일은 시작일 이후여야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = formData as Omit<Contract, 'id'>;

      if (contract) {
        await updateContract(contract.id, payload);
        if (selectedFiles.length > 0) {
          await contractsAPI.uploadFiles(contract.id, selectedFiles);
        }
        showToast('계약이 성공적으로 수정되었습니다.', 'success');
      } else {
        const contractId = await createContract(payload);
        if (selectedFiles.length > 0) {
          await contractsAPI.uploadFiles(contractId, selectedFiles);
        }
        showToast('계약이 성공적으로 등록되었습니다.', 'success');
      }

      onClose();
    } catch (error) {
      showToast('저장 중 오류가 발생했습니다.', 'error');
      console.error('Contract save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof Contract, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const existingFiles = contract?.files || [];
  const canDownloadFiles = role === 'admin' || role === 'manager';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contract ? '계약 수정' : '새 계약 등록'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            {contract ? '수정' : '등록'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="고객사명"
          value={formData.customer_name}
          onChange={(e) => handleChange('customer_name', e.target.value)}
          error={errors.customer_name}
          placeholder="고객사명을 입력해 주세요"
          required
        />

        <Input
          label="프로젝트명"
          value={formData.project_title}
          onChange={(e) => handleChange('project_title', e.target.value)}
          error={errors.project_title}
          placeholder="프로젝트명을 입력해 주세요"
          required
        />

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

        <div>
          <label htmlFor="notes" className="block text-sm font-bold text-slate-700 mb-1.5">
            비고
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="추가 메모가 있으면 입력해 주세요"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-all duration-200 min-h-[100px] resize-y"
          />
        </div>

        <div className="space-y-3">
          <label htmlFor="contract-files" className="block text-sm font-bold text-slate-700">
            관련 파일 업로드
          </label>
          <input
            id="contract-files"
            type="file"
            multiple
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500">최대 10개, 파일당 20MB까지 업로드 가능합니다.</p>

          {selectedFiles.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">업로드 예정 파일</p>
              <ul className="space-y-1">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`} className="text-xs text-slate-700 flex items-center justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <span className="text-slate-500">{formatFileSize(file.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {existingFiles.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">등록된 파일</p>
              <ul className="space-y-1">
                {existingFiles.map((file) => (
                  <li key={file.id} className="text-xs text-slate-700 flex items-center justify-between gap-2">
                    <span className="truncate">{file.original_name}</span>
                    <span className="text-slate-500">{formatFileSize(file.file_size)}</span>
                    {canDownloadFiles ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await contractsAPI.downloadFile(contract!.id, file.id, file.original_name);
                          } catch (error) {
                            console.error('File download error:', error);
                            showToast('파일 다운로드에 실패했습니다.', 'error');
                          }
                        }}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        다운로드
                      </button>
                    ) : (
                      <span className="text-slate-400">권한 없음</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
