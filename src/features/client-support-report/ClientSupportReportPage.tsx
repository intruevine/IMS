import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/core/state/store';
import { Card, Button, Select } from '@/shared/components/ui';

const SUPPORT_TYPES = ['H/W', 'S/W', 'N/W', 'APPL', '기타'] as const;

type SupportType = (typeof SUPPORT_TYPES)[number];

const ClientSupportReportPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const contracts = useAppStore((state) => state.contracts);
  const loadContracts = useAppStore((state) => state.loadContracts);
  const showToast = useAppStore((state) => state.showToast);

  const [formData, setFormData] = useState({
    customerName: '',
    contractId: '0',
    systemName: '',
    supportSummary: '',
    requester: '',
    requestAt: '',
    assignee: '',
    completedAt: '',
    requestDetail: '',
    cause: '',
    supportDetail: '',
    overallOpinion: '',
    note: ''
  });
  const [supportTypes, setSupportTypes] = useState<SupportType[]>([]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const contractOptions = useMemo(
    () => [
      { value: '0', label: '선택 안 함' },
      ...contracts.map((contract) => ({
        value: String(contract.id),
        label: `${contract.customer_name} - ${contract.project_title}`
      }))
    ],
    [contracts]
  );

  const authorLabel = useMemo(() => {
    if (!user?.username) return '-';
    return `${user.display_name || user.username} (${user.username})`;
  }, [user?.display_name, user?.username]);

  const toggleSupportType = (value: SupportType) => {
    setSupportTypes((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      showToast('고객명을 입력해 주세요', 'warning');
      return;
    }

    const payload = {
      ...formData,
      supportTypes,
      authorUsername: user?.username || null
    };

    // TODO: API 저장 연동
    console.log('Client support report payload:', payload);
    showToast('고객지원보고서가 등록되었습니다', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">고객지원보고서</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">고객명</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="고객명 입력"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">작성자</label>
              <input
                type="text"
                value={authorLabel}
                disabled
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <div>
              <Select
                label="연결 계약"
                value={formData.contractId}
                onChange={(e) => updateField('contractId', e.target.value)}
                options={contractOptions}
                helperText={contracts.length === 0 ? '등록된 계약이 없어도 작성 가능합니다.' : undefined}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-slate-500 border-collapse text-sm">
              <thead>
                <tr>
                  <th colSpan={4} className="border border-slate-500 py-2 text-center text-3 font-semibold">
                    Customer Support Report
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="w-32 border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">지원내용</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <input
                      type="text"
                      value={formData.supportSummary}
                      onChange={(e) => updateField('supportSummary', e.target.value)}
                      className="w-full border-none outline-none"
                      placeholder="지원 개요 입력"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">시스템명</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <input
                      type="text"
                      value={formData.systemName}
                      onChange={(e) => updateField('systemName', e.target.value)}
                      className="w-full border-none outline-none"
                      placeholder="시스템명 입력"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">지원구분</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <div className="flex flex-wrap gap-4">
                      {SUPPORT_TYPES.map((type) => (
                        <label key={type} className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={supportTypes.includes(type)}
                            onChange={() => toggleSupportType(type)}
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">지원 요청자</th>
                  <td className="border border-slate-400 p-2">
                    <input
                      type="text"
                      value={formData.requester}
                      onChange={(e) => updateField('requester', e.target.value)}
                      className="w-full border-none outline-none text-center"
                    />
                  </td>
                  <th className="w-28 border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">요청일시</th>
                  <td className="border border-slate-400 p-2">
                    <input
                      type="text"
                      value={formData.requestAt}
                      onChange={(e) => updateField('requestAt', e.target.value)}
                      className="w-full border-none outline-none text-center"
                      placeholder="YYYY-MM-DD HH:mm"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">지원 담당자</th>
                  <td className="border border-slate-400 p-2">
                    <input
                      type="text"
                      value={formData.assignee}
                      onChange={(e) => updateField('assignee', e.target.value)}
                      className="w-full border-none outline-none text-center"
                    />
                  </td>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">완료일시</th>
                  <td className="border border-slate-400 p-2">
                    <input
                      type="text"
                      value={formData.completedAt}
                      onChange={(e) => updateField('completedAt', e.target.value)}
                      className="w-full border-none outline-none text-center"
                      placeholder="YYYY-MM-DD HH:mm"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">지원 요청 사항</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <textarea
                      value={formData.requestDetail}
                      onChange={(e) => updateField('requestDetail', e.target.value)}
                      className="w-full min-h-[56px] resize-y border-none outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">장애 원인</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <textarea
                      value={formData.cause}
                      onChange={(e) => updateField('cause', e.target.value)}
                      className="w-full min-h-[56px] resize-y border-none outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">지원 내용</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <textarea
                      value={formData.supportDetail}
                      onChange={(e) => updateField('supportDetail', e.target.value)}
                      className="w-full min-h-[90px] resize-y border-none outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">종합의견</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <textarea
                      value={formData.overallOpinion}
                      onChange={(e) => updateField('overallOpinion', e.target.value)}
                      className="w-full min-h-[56px] resize-y border-none outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-400 bg-slate-50 px-3 py-2 text-center font-semibold">비고</th>
                  <td colSpan={3} className="border border-slate-400 p-2">
                    <textarea
                      value={formData.note}
                      onChange={(e) => updateField('note', e.target.value)}
                      className="w-full min-h-[56px] resize-y border-none outline-none"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              보고서 등록
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ClientSupportReportPage;
