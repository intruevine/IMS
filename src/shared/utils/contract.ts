import type { ContractStatus } from '@/types';

/**
 * 계약 상태 확인
 * @param endDateStr 종료일 (YYYY-MM-DD)
 * @returns ContractStatus
 */
export function getContractStatus(endDateStr: string | null | undefined): ContractStatus {
  if (!endDateStr) return 'unknown';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  
  const warning = new Date();
  warning.setDate(today.getDate() + 30);
  
  if (end < today) return 'expired';
  if (end <= warning) return 'expiring';
  return 'active';
}

/**
 * 상태별 색상 및 레이블 반환
 */
export function getStatusInfo(status: ContractStatus): { 
  color: string; 
  bgColor: string; 
  label: string;
  icon: string;
} {
  switch (status) {
    case 'active':
      return {
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        label: '진행중',
        icon: 'check-circle'
      };
    case 'expiring':
      return {
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        label: '만료임박',
        icon: 'exclamation-triangle'
      };
    case 'expired':
      return {
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        label: '만료됨',
        icon: 'times-circle'
      };
    default:
      return {
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
        label: '알 수 없음',
        icon: 'question-circle'
      };
  }
}

/**
 * 계약 진행률 계산
 */
export function calculateProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  
  const totalDuration = end.getTime() - start.getTime();
  if (totalDuration <= 0) return 100;
  
  const elapsed = today.getTime() - start.getTime();
  const progress = Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 0), 100);
  
  return progress;
}

/**
 * 만료까지 남은 일수 계산
 */
export function getDaysUntilExpiry(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diff = end.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * 날짜 포맷팅
 */
export function formatDate(dateStr: string, format: 'short' | 'long' = 'long'): string {
  const date = new Date(dateStr);
  if (format === 'short') {
    return date.toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * HTML 이스케이프
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
