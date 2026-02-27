import React, { useEffect, useMemo, useState } from 'react';
import { clientSupportReportsAPI } from '@/core/api/client';
import { useAppStore } from '@/core/state/store';
import { Button, Card, Select } from '@/shared/components/ui';

const SUPPORT_TYPES = ['H/W', 'S/W', 'N/W', 'APPL', '기타'] as const;
type SupportType = (typeof SUPPORT_TYPES)[number];

type ClientSupportReport = {
  id: number;
  contract_id: number | null;
  customer_name: string;
  support_summary: string;
  system_name: string;
  support_types: string[];
  requester: string;
  request_at: string | null;
  assignee: string;
  completed_at: string | null;
  request_detail: string;
  cause: string;
  support_detail: string;
  overall_opinion: string;
  note: string;
  created_by: string | null;
  created_by_name: string | null;
  contract_project_title: string | null;
  created_at: string;
  updated_at: string;
};

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const rowHeadCls = 'w-36 border border-slate-300 bg-slate-50 px-3 py-3 text-center align-middle text-sm font-semibold text-slate-700';
const rowCellCls = 'border border-slate-300 p-2 align-middle';

const EMPTY_FORM = {
  customerName: '',
  contractId: '0',
  supportSummary: '',
  systemName: '',
  requester: '',
  requestAt: '',
  assignee: '',
  completedAt: '',
  requestDetail: '',
  cause: '',
  supportDetail: '',
  overallOpinion: '',
  note: ''
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

const ClientSupportReportPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const contracts = useAppStore((state) => state.contracts);
  const loadContracts = useAppStore((state) => state.loadContracts);
  const showToast = useAppStore((state) => state.showToast);

  const [supportTypes, setSupportTypes] = useState<SupportType[]>([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [reports, setReports] = useState<ClientSupportReport[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const loadReports = async () => {
    setIsLoadingReports(true);
    try {
      const rows = await clientSupportReportsAPI.getAll();
      setReports(Array.isArray(rows) ? (rows as ClientSupportReport[]) : []);
    } catch (error) {
      console.error('Failed to load client support reports:', error);
      showToast('등록된 보고서를 불러오지 못했습니다', 'error');
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

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

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSupportType = (value: SupportType) => {
    setSupportTypes((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.customerName.trim()) {
      showToast('고객명을 입력해 주세요', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await clientSupportReportsAPI.create({
        customerName: formData.customerName.trim(),
        contractId: Number(formData.contractId) > 0 ? Number(formData.contractId) : null,
        supportSummary: formData.supportSummary.trim(),
        systemName: formData.systemName.trim(),
        supportTypes,
        requester: formData.requester.trim(),
        requestAt: formData.requestAt || undefined,
        assignee: formData.assignee.trim(),
        completedAt: formData.completedAt || undefined,
        requestDetail: formData.requestDetail.trim(),
        cause: formData.cause.trim(),
        supportDetail: formData.supportDetail.trim(),
        overallOpinion: formData.overallOpinion.trim(),
        note: formData.note.trim()
      });

      showToast('고객지원보고서가 등록되었습니다', 'success');
      setFormData(EMPTY_FORM);
      setSupportTypes([]);
      await loadReports();
    } catch (error) {
      console.error('Failed to create client support report:', error);
      const message = error instanceof Error ? error.message : '보고서 등록에 실패했습니다';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">고객지원보고서</h1>
        <p className="mt-1 text-sm text-slate-500">지원 요청과 처리 내용을 등록하고, 아래에서 등록된 보고서를 확인할 수 있습니다.</p>
      </div>

      <Card className="shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="csr-customer" className="mb-1.5 block text-sm font-semibold text-slate-700">
                고객명
              </label>
              <input
                id="csr-customer"
                name="customer_name"
                type="text"
                value={formData.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                className={inputCls}
                placeholder="고객명을 입력하세요"
                required
              />
            </div>
            <div>
              <label htmlFor="csr-author" className="mb-1.5 block text-sm font-semibold text-slate-700">
                작성자
              </label>
              <input id="csr-author" name="author" type="text" value={authorLabel} disabled className={`${inputCls} bg-slate-100`} />
            </div>
            <div>
              <Select
                label="연결 계약"
                value={formData.contractId}
                onChange={(e) => updateField('contractId', e.target.value)}
                options={contractOptions}
                helperText={contracts.length === 0 ? '등록된 계약이 없어도 보고서 등록은 가능합니다.' : undefined}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th colSpan={4} className="border border-slate-300 bg-slate-100 py-3 text-center text-xl font-bold tracking-wide text-slate-800">
                    Customer Support Report
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className={rowHeadCls}>지원개요</th>
                  <td colSpan={3} className={rowCellCls}>
                    <input
                      id="csr-summary"
                      name="support_summary"
                      type="text"
                      value={formData.supportSummary}
                      onChange={(e) => updateField('supportSummary', e.target.value)}
                      className={inputCls}
                      placeholder="장애/이슈 요약"
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>시스템명</th>
                  <td colSpan={3} className={rowCellCls}>
                    <input
                      id="csr-system-name"
                      name="system_name"
                      type="text"
                      value={formData.systemName}
                      onChange={(e) => updateField('systemName', e.target.value)}
                      className={inputCls}
                      placeholder="시스템 또는 서비스명"
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>지원구분</th>
                  <td colSpan={3} className={rowCellCls}>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {SUPPORT_TYPES.map((type) => (
                        <label key={type} className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            id={`csr-type-${type}`}
                            name="support_types"
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
                  <th className={rowHeadCls}>지원요청자</th>
                  <td className={rowCellCls}>
                    <input
                      id="csr-requester"
                      name="requester"
                      type="text"
                      value={formData.requester}
                      onChange={(e) => updateField('requester', e.target.value)}
                      className={`${inputCls} text-center`}
                    />
                  </td>
                  <th className={rowHeadCls}>요청일시</th>
                  <td className={rowCellCls}>
                    <input
                      id="csr-request-at"
                      name="request_at"
                      type="datetime-local"
                      value={formData.requestAt}
                      onChange={(e) => updateField('requestAt', e.target.value)}
                      className={`${inputCls} text-center`}
                      step={60}
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>지원담당자</th>
                  <td className={rowCellCls}>
                    <input
                      id="csr-assignee"
                      name="assignee"
                      type="text"
                      value={formData.assignee}
                      onChange={(e) => updateField('assignee', e.target.value)}
                      className={`${inputCls} text-center`}
                    />
                  </td>
                  <th className={rowHeadCls}>완료일시</th>
                  <td className={rowCellCls}>
                    <input
                      id="csr-completed-at"
                      name="completed_at"
                      type="datetime-local"
                      value={formData.completedAt}
                      onChange={(e) => updateField('completedAt', e.target.value)}
                      className={`${inputCls} text-center`}
                      step={60}
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>지원요청 사항</th>
                  <td colSpan={3} className={rowCellCls}>
                    <textarea
                      id="csr-request-detail"
                      name="request_detail"
                      value={formData.requestDetail}
                      onChange={(e) => updateField('requestDetail', e.target.value)}
                      className={`${inputCls} min-h-[80px] resize-y`}
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>장애 원인</th>
                  <td colSpan={3} className={rowCellCls}>
                    <textarea
                      id="csr-cause"
                      name="cause"
                      value={formData.cause}
                      onChange={(e) => updateField('cause', e.target.value)}
                      className={`${inputCls} min-h-[80px] resize-y`}
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>지원 내용</th>
                  <td colSpan={3} className={rowCellCls}>
                    <textarea
                      id="csr-support-detail"
                      name="support_detail"
                      value={formData.supportDetail}
                      onChange={(e) => updateField('supportDetail', e.target.value)}
                      className={`${inputCls} min-h-[120px] resize-y`}
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>종합소견</th>
                  <td colSpan={3} className={rowCellCls}>
                    <textarea
                      id="csr-overall-opinion"
                      name="overall_opinion"
                      value={formData.overallOpinion}
                      onChange={(e) => updateField('overallOpinion', e.target.value)}
                      className={`${inputCls} min-h-[80px] resize-y`}
                    />
                  </td>
                </tr>

                <tr>
                  <th className={rowHeadCls}>비고</th>
                  <td colSpan={3} className={rowCellCls}>
                    <textarea
                      id="csr-note"
                      name="note"
                      value={formData.note}
                      onChange={(e) => updateField('note', e.target.value)}
                      className={`${inputCls} min-h-[80px] resize-y`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '보고서 등록'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">등록된 고객지원보고서</h2>
          <Button type="button" variant="ghost" onClick={loadReports} disabled={isLoadingReports}>
            {isLoadingReports ? '불러오는 중...' : '새로고침'}
          </Button>
        </div>

        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">등록된 보고서가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 px-3 py-2 text-left">등록일시</th>
                  <th className="border border-slate-200 px-3 py-2 text-left">고객명</th>
                  <th className="border border-slate-200 px-3 py-2 text-left">요청자</th>
                  <th className="border border-slate-200 px-3 py-2 text-left">요청일시</th>
                  <th className="border border-slate-200 px-3 py-2 text-left">완료일시</th>
                  <th className="border border-slate-200 px-3 py-2 text-left">지원개요</th>
                  <th className="border border-slate-200 px-3 py-2 text-left">작성자</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="border border-slate-200 px-3 py-2">{formatDateTime(report.created_at)}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="font-medium text-slate-800">{report.customer_name}</div>
                      {report.contract_project_title ? <div className="text-xs text-slate-500">{report.contract_project_title}</div> : null}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">{report.requester || '-'}</td>
                    <td className="border border-slate-200 px-3 py-2">{formatDateTime(report.request_at)}</td>
                    <td className="border border-slate-200 px-3 py-2">{formatDateTime(report.completed_at)}</td>
                    <td className="border border-slate-200 px-3 py-2">{report.support_summary || '-'}</td>
                    <td className="border border-slate-200 px-3 py-2">{report.created_by_name || report.created_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClientSupportReportPage;
