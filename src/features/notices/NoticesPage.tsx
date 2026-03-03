import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { noticesAPI } from '@/core/api/client';
import { useAppStore } from '@/core/state/store';
import { Button, Card, Input, Modal } from '@/shared/components/ui';

type Notice = {
  id: number;
  title: string;
  content: string;
  is_pinned?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type NoticeFile = {
  id: number;
  notice_id: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_by?: string | null;
  created_at?: string;
};

function formatDateSafe(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'yyyy.MM.dd HH:mm');
}

function formatFileSize(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

const NoticesPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const showToast = useAppStore((state) => state.showToast);
  const isAdmin = role === 'admin' || user?.role === 'admin' || user?.username === 'admin';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [filesByNotice, setFilesByNotice] = useState<Record<number, NoticeFile[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    is_pinned: false
  });

  const sortedNotices = useMemo(
    () =>
      [...notices].sort((a, b) => {
        const pinnedGap = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
        if (pinnedGap !== 0) return pinnedGap;
        const aTime = new Date(a.created_at || '').getTime();
        const bTime = new Date(b.created_at || '').getTime();
        return bTime - aTime;
      }),
    [notices]
  );

  const loadFiles = async (noticeId: number) => {
    try {
      const files = await noticesAPI.getFiles(noticeId);
      setFilesByNotice((prev) => ({ ...prev, [noticeId]: files || [] }));
    } catch (error) {
      console.error('Failed to load notice files:', error);
      setFilesByNotice((prev) => ({ ...prev, [noticeId]: [] }));
    }
  };

  const loadNotices = async () => {
    setIsLoading(true);
    try {
      const rows = await noticesAPI.getAll();
      const list = rows || [];
      setNotices(list);

      const pairs = await Promise.all(
        list.map(async (notice: Notice): Promise<[number, NoticeFile[]]> => {
          try {
            const files = await noticesAPI.getFiles(notice.id);
            return [notice.id, Array.isArray(files) ? (files as NoticeFile[]) : []];
          } catch {
            return [notice.id, []];
          }
        })
      );
      const nextMap: Record<number, NoticeFile[]> = {};
      pairs.forEach(([id, files]) => {
        nextMap[id] = files;
      });
      setFilesByNotice(nextMap);
    } catch (error) {
      console.error('Failed to load notices:', error);
      showToast('공지사항 로드에 실패했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingNotice(null);
    setNewFiles([]);
    setForm({ title: '', content: '', is_pinned: false });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreateModal = () => {
    setEditingNotice(null);
    setNewFiles([]);
    setForm({ title: '', content: '', is_pinned: false });
    setIsEditModalOpen(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setNewFiles([]);
    setForm({
      title: notice.title || '',
      content: notice.content || '',
      is_pinned: Boolean(notice.is_pinned)
    });
    setIsEditModalOpen(true);
    loadFiles(notice.id);
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      showToast('제목과 내용을 입력해 주세요', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      let noticeId = editingNotice?.id || 0;
      if (editingNotice) {
        await noticesAPI.update(editingNotice.id, { title, content, is_pinned: form.is_pinned });
      } else {
        const created = await noticesAPI.create({ title, content, is_pinned: form.is_pinned });
        noticeId = created.id;
      }

      if (isAdmin && noticeId > 0 && newFiles.length > 0) {
        await noticesAPI.uploadFiles(noticeId, newFiles);
      }

      showToast(editingNotice ? '공지사항이 수정되었습니다' : '공지사항이 등록되었습니다', 'success');
      closeEditModal();
      await loadNotices();
    } catch (error) {
      console.error('Failed to save notice:', error);
      showToast('공지사항 저장에 실패했습니다', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (notice: Notice) => {
    const ok = window.confirm(`"${notice.title}" 공지사항을 삭제할까요?`);
    if (!ok) return;
    try {
      await noticesAPI.delete(notice.id);
      await loadNotices();
      showToast('공지사항이 삭제되었습니다', 'success');
    } catch (error) {
      console.error('Failed to delete notice:', error);
      showToast('공지사항 삭제에 실패했습니다', 'error');
    }
  };

  const handleDeleteFile = async (noticeId: number, fileId: number) => {
    const ok = window.confirm('첨부파일을 삭제할까요?');
    if (!ok) return;
    try {
      await noticesAPI.deleteFile(noticeId, fileId);
      await loadFiles(noticeId);
      showToast('첨부파일이 삭제되었습니다', 'success');
    } catch (error) {
      console.error('Failed to delete notice file:', error);
      showToast('첨부파일 삭제에 실패했습니다', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공지사항</h1>
          <p className="text-slate-500 mt-1">전체 사용자에게 공유할 공지를 관리합니다.</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={openCreateModal}>
            공지 등록
          </Button>
        )}
      </div>

      <Card>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">구분</th>
                <th className="px-4 py-3 text-left">제목</th>
                <th className="px-4 py-3 text-left">내용</th>
                <th className="px-4 py-3 text-left">첨부</th>
                <th className="px-4 py-3 text-left">작성자</th>
                <th className="px-4 py-3 text-left">작성일</th>
                {isAdmin && <th className="px-4 py-3 text-right">작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!isLoading && sortedNotices.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={isAdmin ? 7 : 6}>
                    등록된 공지사항이 없습니다.
                  </td>
                </tr>
              )}
              {sortedNotices.map((notice) => {
                const files = filesByNotice[notice.id] || [];
                return (
                  <tr key={notice.id}>
                    <td className="px-4 py-3">
                      {notice.is_pinned ? (
                        <span className="inline-flex rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">고정</span>
                      ) : (
                        <span className="text-slate-500">일반</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{notice.title}</td>
                    <td className="px-4 py-3 max-w-[420px] truncate" title={notice.content}>
                      {notice.content}
                    </td>
                    <td className="px-4 py-3">
                      {files.length === 0 ? (
                        <span className="text-slate-400">없음</span>
                      ) : (
                        <div className="space-y-1">
                          {files.map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              className="block text-left text-xs text-blue-600 hover:underline"
                              onClick={() => noticesAPI.downloadFile(notice.id, file.id, file.original_name)}
                              title={`${file.original_name} (${formatFileSize(file.file_size)})`}
                            >
                              {file.original_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{notice.created_by || '-'}</td>
                    <td className="px-4 py-3">{formatDateSafe(notice.created_at)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEditModal(notice)}>
                            수정
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(notice)}>
                            삭제
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title={editingNotice ? '공지사항 수정' : '공지사항 등록'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeEditModal}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              저장
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="제목"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="공지 제목"
          />
          <div>
            <label htmlFor="notice-content" className="block text-sm font-semibold text-slate-700 mb-2">
              내용
            </label>
            <textarea
              id="notice-content"
              name="notice_content"
              rows={8}
              className="input"
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="공지 내용을 입력하세요"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              id="notice-is-pinned"
              name="notice_is_pinned"
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm((prev) => ({ ...prev, is_pinned: e.target.checked }))}
            />
            상단 고정
          </label>

          {isAdmin && (
            <div className="space-y-2">
              <label htmlFor="notice-files" className="block text-sm font-semibold text-slate-700">
                첨부 파일
              </label>
              <input
                id="notice-files"
                name="notice_files"
                ref={fileInputRef}
                type="file"
                multiple
                className="input"
                onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
              />
              {newFiles.length > 0 && (
                <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
                  {newFiles.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name} ({formatFileSize(file.size)})</li>
                  ))}
                </ul>
              )}
              {editingNotice && (filesByNotice[editingNotice.id] || []).length > 0 && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">기존 첨부 파일</p>
                  <ul className="space-y-1">
                    {(filesByNotice[editingNotice.id] || []).map((file) => (
                      <li key={file.id} className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => noticesAPI.downloadFile(editingNotice.id, file.id, file.original_name)}
                        >
                          {file.original_name}
                        </button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteFile(editingNotice.id, file.id)}>
                          삭제
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default NoticesPage;
