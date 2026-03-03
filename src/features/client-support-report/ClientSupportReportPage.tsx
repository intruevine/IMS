import React, { useEffect, useMemo, useState } from 'react';
import { clientSupportReportsAPI } from '@/core/api/client';
import { useAppStore } from '@/core/state/store';
import { Button, Card, Modal, Select } from '@/shared/components/ui';

const SUPPORT_TYPES = ['H/W', 'S/W', 'N/W', 'APPL', 'ETC'] as const;
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

type ReportFormData = {
  customerName: string;
  contractId: string;
  supportSummary: string;
  systemName: string;
  requester: string;
  requestAt: string;
  assignee: string;
  completedAt: string;
  requestDetail: string;
  cause: string;
  supportDetail: string;
  overallOpinion: string;
  note: string;
};

const EMPTY_FORM: ReportFormData = {
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

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const rowHeadCls =
  'w-36 border border-slate-300 bg-slate-50 px-3 py-3 text-center align-middle text-sm font-semibold text-slate-700';
const rowCellCls = 'border border-slate-300 p-2 align-middle';

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

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPayload(formData: ReportFormData, supportTypes: SupportType[]) {
  return {
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
  };
}

function toFormData(report: ClientSupportReport): ReportFormData {
  return {
    customerName: report.customer_name || '',
    contractId: report.contract_id ? String(report.contract_id) : '0',
    supportSummary: report.support_summary || '',
    systemName: report.system_name || '',
    requester: report.requester || '',
    requestAt: toDateTimeLocal(report.request_at),
    assignee: report.assignee || '',
    completedAt: toDateTimeLocal(report.completed_at),
    requestDetail: report.request_detail || '',
    cause: report.cause || '',
    supportDetail: report.support_detail || '',
    overallOpinion: report.overall_opinion || '',
    note: report.note || ''
  };
}

const ClientSupportReportPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const contracts = useAppStore((state) => state.contracts);
  const loadContracts = useAppStore((state) => state.loadContracts);
  const showToast = useAppStore((state) => state.showToast);

  const isAdmin = role === 'admin';

  const [reports, setReports] = useState<ClientSupportReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ClientSupportReport | null>(null);
  const [editingReport, setEditingReport] = useState<ClientSupportReport | null>(null);
  const [supportTypes, setSupportTypes] = useState<SupportType[]>([]);
  const [formData, setFormData] = useState<ReportFormData>(EMPTY_FORM);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
      showToast('고객지원보고서 목록을 불러오지 못했습니다.', 'error');
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

  const filteredReports = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    const fromBoundary = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toBoundary = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return reports.filter((report) => {
      const matchesKeyword =
        !keyword ||
        [
          report.customer_name,
          report.contract_project_title,
          report.requester,
          report.assignee,
          report.support_summary,
          report.system_name
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      const createdDate = report.created_at ? new Date(report.created_at) : null;
      const matchesFrom = !fromBoundary || (createdDate && createdDate >= fromBoundary);
      const matchesTo = !toBoundary || (createdDate && createdDate <= toBoundary);

      return Boolean(matchesKeyword && matchesFrom && matchesTo);
    });
  }, [reports, searchKeyword, dateFrom, dateTo]);

  const updateField = (field: keyof ReportFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSupportType = (value: SupportType) => {
    setSupportTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const resetFormState = () => {
    setFormData(EMPTY_FORM);
    setSupportTypes([]);
    setEditingReport(null);
  };

  const openCreateForm = () => {
    resetFormState();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    resetFormState();
  };

  const handlePrintReport = () => {
    if (!selectedReport || typeof window === 'undefined') return;

    const printableSections = [
      ['고객명', selectedReport.customer_name || '-'],
      ['연결 계약', selectedReport.contract_project_title || '-'],
      ['작성자', selectedReport.created_by_name || selectedReport.created_by || '-'],
      ['등록일시', formatDateTime(selectedReport.created_at)],
      ['지원개요', selectedReport.support_summary || '-'],
      ['시스템명', selectedReport.system_name || '-'],
      ['지원구분', selectedReport.support_types.length > 0 ? selectedReport.support_types.join(', ') : '-'],
      ['지원요청자', selectedReport.requester || '-'],
      ['지원담당자', selectedReport.assignee || '-'],
      ['요청일시', formatDateTime(selectedReport.request_at)],
      ['완료일시', formatDateTime(selectedReport.completed_at)],
      ['지원요청사항', selectedReport.request_detail || '-'],
      ['장애 원인', selectedReport.cause || '-'],
      ['지원 내용', selectedReport.support_detail || '-'],
      ['종합의견', selectedReport.overall_opinion || '-'],
      ['비고', selectedReport.note || '-']
    ];

    const rows = printableSections
      .map(
        ([label, value]) => `
          <tr>
            <th>${escapeHtml(String(label))}</th>
            <td>${escapeHtml(String(value)).replace(/\n/g, '<br />')}</td>
          </tr>
        `
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=960,height=900');
    if (!printWindow) {
      showToast('팝업 차단으로 인쇄 창을 열 수 없습니다.', 'warning');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <title>고객지원보고서</title>
          <style>
            body { font-family: 'Malgun Gothic', 'Segoe UI', sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 16px; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; vertical-align: top; font-size: 13px; }
            th { width: 180px; background: #f8fafc; text-align: left; }
            td { white-space: normal; word-break: break-word; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>고객지원보고서</h1>
          <table>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const startEdit = (report: ClientSupportReport) => {
    setEditingReport(report);
    setFormData(toFormData(report));
    setSupportTypes(
      report.support_types.filter((type): type is SupportType =>
        SUPPORT_TYPES.includes(type as SupportType)
      )
    );
    setSelectedReport(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (report: ClientSupportReport) => {
    if (!isAdmin || isDeleting) return;

    const confirmed = window.confirm(`"${report.customer_name}" 보고서를 삭제하시겠습니까?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await clientSupportReportsAPI.delete(report.id);
      showToast('고객지원보고서를 삭제했습니다.', 'success');
      setSelectedReport(null);
      await loadReports();
    } catch (error) {
      console.error('Failed to delete client support report:', error);
      const message = error instanceof Error ? error.message : '보고서 삭제에 실패했습니다.';
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.customerName.trim()) {
      showToast('고객명을 입력해 주세요.', 'warning');
      return;
    }

    const payload = createPayload(formData, supportTypes);

    setIsSubmitting(true);
    try {
      if (editingReport) {
        await clientSupportReportsAPI.update(editingReport.id, payload);
        showToast('고객지원보고서를 수정했습니다.', 'success');
      } else {
        await clientSupportReportsAPI.create(payload);
        showToast('고객지원보고서를 등록했습니다.', 'success');
      }

      setIsFormOpen(false);
      resetFormState();
      await loadReports();
    } catch (error) {
      console.error('Failed to submit client support report:', error);
      const message = error instanceof Error ? error.message : '보고서 저장에 실패했습니다.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">고객지원보고서</h1>
          <p className="mt-1 text-sm text-slate-500">
            목록을 먼저 확인하고, 상단 버튼으로 새 보고서를 등록할 수 있습니다.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={openCreateForm}>
          고객지원보고서 등록
        </Button>
      </div>

      <Card className="shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">등록된 고객지원보고서</h2>
          <Button type="button" variant="ghost" onClick={loadReports} disabled={isLoadingReports}>
            {isLoadingReports ? '불러오는 중...' : '새로고침'}
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="csr-search" className="mb-1.5 block text-sm font-semibold text-slate-700">
              검색
            </label>
            <input
              id="csr-search"
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className={inputCls}
              placeholder="고객명, 프로젝트명, 요청자, 담당자, 지원개요"
            />
          </div>
          <div>
            <label htmlFor="csr-date-from" className="mb-1.5 block text-sm font-semibold text-slate-700">
              등록일 시작
            </label>
            <input
              id="csr-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="csr-date-to" className="mb-1.5 block text-sm font-semibold text-slate-700">
              등록일 종료
            </label>
            <input
              id="csr-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <p className="text-sm text-slate-500">
            {reports.length === 0 ? '등록된 보고서가 없습니다.' : '조건에 맞는 보고서가 없습니다.'}
          </p>
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
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="border border-slate-200 px-3 py-2">{formatDateTime(report.created_at)}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      <div className="font-medium text-slate-800">{report.customer_name}</div>
                      {report.contract_project_title ? (
                        <div className="text-xs text-slate-500">{report.contract_project_title}</div>
                      ) : null}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">{report.requester || '-'}</td>
                    <td className="border border-slate-200 px-3 py-2">{formatDateTime(report.request_at)}</td>
                    <td className="border border-slate-200 px-3 py-2">{formatDateTime(report.completed_at)}</td>
                    <td className="border border-slate-200 px-3 py-2">{report.support_summary || '-'}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      {report.created_by_name || report.created_by || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingReport ? '고객지원보고서 수정' : '고객지원보고서 등록'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="csr-customer" className="mb-1.5 block text-sm font-semibold text-slate-700">
                고객명
              </label>
              <input
                id="csr-customer"
                type="text"
                value={formData.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                className={inputCls}
                placeholder="고객명을 입력해 주세요"
                required
              />
            </div>
            <div>
              <label htmlFor="csr-author" className="mb-1.5 block text-sm font-semibold text-slate-700">
                작성자
              </label>
              <input id="csr-author" type="text" value={authorLabel} disabled className={`${inputCls} bg-slate-100`} />
            </div>
            <div>
              <Select
                label="연결 계약"
                value={formData.contractId}
                onChange={(e) => updateField('contractId', e.target.value)}
                options={contractOptions}
                helperText={contracts.length === 0 ? '등록된 계약이 없어도 보고서는 등록할 수 있습니다.' : undefined}
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
                      type="text"
                      value={formData.supportSummary}
                      onChange={(e) => updateField('supportSummary', e.target.value)}
                      className={inputCls}
                      placeholder="장애/지원 내용을 간단히 입력"
                    />
                  </td>
                </tr>
                <tr>
                  <th className={rowHeadCls}>시스템명</th>
                  <td colSpan={3} className={rowCellCls}>
                    <input
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
                          <input type="checkbox" checked={supportTypes.includes(type)} onChange={() => toggleSupportType(type)} />
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
                      type="text"
                      value={formData.requester}
                      onChange={(e) => updateField('requester', e.target.value)}
                      className={`${inputCls} text-center`}
                    />
                  </td>
                  <th className={rowHeadCls}>요청일시</th>
                  <td className={rowCellCls}>
                    <input
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
                      type="text"
                      value={formData.assignee}
                      onChange={(e) => updateField('assignee', e.target.value)}
                      className={`${inputCls} text-center`}
                    />
                  </td>
                  <th className={rowHeadCls}>완료일시</th>
                  <td className={rowCellCls}>
                    <input
                      type="datetime-local"
                      value={formData.completedAt}
                      onChange={(e) => updateField('completedAt', e.target.value)}
                      className={`${inputCls} text-center`}
                      step={60}
                    />
                  </td>
                </tr>
                <tr>
                  <th className={rowHeadCls}>지원요청사항</th>
                  <td colSpan={3} className={rowCellCls}>
                    <textarea
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
                      value={formData.supportDetail}
                      onChange={(e) => updateField('supportDetail', e.target.value)}
                      className={`${inputCls} min-h-[120px] resize-y`}
                    />
                  </td>
                </tr>
                <tr>
                  <th className={rowHeadCls}>종합의견</th>
                  <td colSpan={3} className={rowCellCls}>
                    <textarea
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
                      value={formData.note}
                      onChange={(e) => updateField('note', e.target.value)}
                      className={`${inputCls} min-h-[80px] resize-y`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeForm} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : editingReport ? '수정 저장' : '보고서 등록'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={selectedReport !== null}
        onClose={() => setSelectedReport(null)}
        title="고객지원보고서 상세"
        size="xl"
      >
        {selectedReport ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">고객명</div>
                <div className="mt-1 text-sm text-slate-900">{selectedReport.customer_name || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">연결 계약</div>
                <div className="mt-1 text-sm text-slate-900">{selectedReport.contract_project_title || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">작성자</div>
                <div className="mt-1 text-sm text-slate-900">
                  {selectedReport.created_by_name || selectedReport.created_by || '-'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">등록일시</div>
                <div className="mt-1 text-sm text-slate-900">{formatDateTime(selectedReport.created_at)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">지원요청자</div>
                <div className="mt-1 text-sm text-slate-900">{selectedReport.requester || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">지원담당자</div>
                <div className="mt-1 text-sm text-slate-900">{selectedReport.assignee || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">요청일시</div>
                <div className="mt-1 text-sm text-slate-900">{formatDateTime(selectedReport.request_at)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">완료일시</div>
                <div className="mt-1 text-sm text-slate-900">{formatDateTime(selectedReport.completed_at)}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-semibold text-slate-500">지원구분</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedReport.support_types.length > 0 ? (
                  selectedReport.support_types.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">-</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">지원개요</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{selectedReport.support_summary || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">시스템명</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{selectedReport.system_name || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">지원요청사항</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{selectedReport.request_detail || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">장애 원인</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{selectedReport.cause || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">지원 내용</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{selectedReport.support_detail || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">종합의견</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{selectedReport.overall_opinion || '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">비고</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{selectedReport.note || '-'}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handlePrintReport}>
                인쇄
              </Button>
              <Button type="button" variant="primary" onClick={() => startEdit(selectedReport)}>
                수정
              </Button>
              {isAdmin ? (
                <Button type="button" variant="danger" onClick={() => handleDelete(selectedReport)} disabled={isDeleting}>
                  {isDeleting ? '삭제 중...' : '삭제'}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default ClientSupportReportPage;
