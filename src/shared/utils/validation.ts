import { z } from 'zod';

/**
 * 계약 스키마
 */
export const contractSchema = z.object({
  customer_name: z.string().min(1, '고객사명을 입력하세요'),
  project_title: z.string().min(1, '계약건명을 입력하세요'),
  start_date: z.string().min(1, '시작일을 선택하세요'),
  end_date: z.string().min(1, '종료일을 선택하세요'),
  notes: z.string().optional()
}).refine((data) => {
  return data.start_date <= data.end_date;
}, {
  message: '종료일은 시작일보다 이후여야 합니다',
  path: ['end_date']
});

/**
 * 자산 스키마
 */
export const assetSchema = z.object({
  category: z.enum(['HW', 'SW']),
  item: z.string().min(1, '품목명을 입력하세요'),
  product: z.string().min(1, '모델명을 입력하세요'),
  qty: z.number().min(1, '수량을 입력하세요'),
  cycle: z.enum(['월', '분기', '반기', '연', '장애시']),
  scope: z.string().optional(),
  remark: z.string().optional(),
  company: z.string().optional(),
  engineer: z.object({
    main: z.object({
      name: z.string().min(1, '엔지니어 이름을 입력하세요'),
      rank: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email('올바른 이메일 형식이 아닙니다').optional()
    }),
    sub: z.object({
      name: z.string().optional(),
      rank: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email('올바른 이메일 형식이 아닙니다').optional()
    }).optional()
  })
});

/**
 * 사용자 스키마
 */
export const userSchema = z.object({
  username: z.string().min(3, '아이디는 3자 이상이어야 합니다'),
  display_name: z.string().min(1, '이름을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다').optional(),
  passwordConfirm: z.string().optional()
}).refine((data) => {
  if (data.password && data.passwordConfirm) {
    return data.password === data.passwordConfirm;
  }
  return true;
}, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['passwordConfirm']
});

/**
 * 이메일 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 전화번호 검증
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\d{2,4})-(\d{3,4})-(\d{4})$/;
  return phoneRegex.test(phone);
}

/**
 * 날짜 범위 검증
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

/**
 * 필수 필드 검증
 */
export function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName}은(는) 필수 입력 항목입니다`;
  }
  return null;
}

/**
 * 최소 길이 검증
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): string | null {
  if (value.length < minLength) {
    return `${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다`;
  }
  return null;
}

/**
 * 최대 길이 검증
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (value.length > maxLength) {
    return `${fieldName}은(는) 최대 ${maxLength}자까지 입력 가능합니다`;
  }
  return null;
}
