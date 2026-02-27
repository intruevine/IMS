import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '@/core/state/store';
import { Card, Button, Modal, Input, Select, ConfirmModal } from '@/shared/components/ui';
import type { CalendarEvent, CalendarEventType, CalendarScheduleDivision } from '@/types';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import koLocale from '@fullcalendar/core/locales/ko';
import type { EventClickArg, DateSelectArg, EventHoveringArg } from '@fullcalendar/core';
import type { EventContentArg } from '@fullcalendar/core';

const NATIONAL_HOLIDAY_COLOR = '#dc2626';
const COMPANY_HOLIDAY_COLOR = '#14b8a6';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestDelete?: () => void;
  canDelete?: boolean;
  event?: CalendarEvent | null;
  selectedDate?: string;
  creatorDisplayName?: string;
}

function calculateSupportMinutesExcludingLunch(startValue?: string, endValue?: string): number {
  if (!startValue || !endValue) return 0;
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

  let totalMinutes = 0;
  const dayCursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (dayCursor <= lastDay) {
    const dayStart = new Date(dayCursor);
    const dayEnd = new Date(dayCursor);
    dayEnd.setHours(23, 59, 59, 999);

    const segmentStart = start > dayStart ? start : dayStart;
    const segmentEnd = end < dayEnd ? end : dayEnd;

    if (segmentEnd > segmentStart) {
      let segmentMinutes = Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / 60000);

      const lunchStart = new Date(dayCursor);
      lunchStart.setHours(12, 0, 0, 0);
      const lunchEnd = new Date(dayCursor);
      lunchEnd.setHours(13, 0, 0, 0);

      const overlapStart = segmentStart > lunchStart ? segmentStart : lunchStart;
      const overlapEnd = segmentEnd < lunchEnd ? segmentEnd : lunchEnd;
      if (overlapEnd > overlapStart) {
        segmentMinutes -= Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
      }

      totalMinutes += Math.max(0, segmentMinutes);
    }

    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  return Math.max(0, totalMinutes);
}

function toBadgeText(name?: string) {
  const value = (name || '').trim();
  if (!value) return '?';
  return value.length <= 2 ? value : value.slice(0, 2);
}

function toDateTimeLocalInput(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, "yyyy-MM-dd'T'HH:mm");
  }
  if (typeof value === 'string' && value.length >= 16) {
    return value.slice(0, 16);
  }
  return '';
}

function normalizeHolidayDate(value?: string): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoPrefix) return isoPrefix[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string; color: string }[] = [
  { value: 'inspection', label: '점검', color: '#3b82f6' },
  { value: 'maintenance', label: '유지보수', color: '#22c55e' },
  { value: 'contract_end', label: '계약 만료', color: '#ef4444' },
  { value: 'meeting', label: '회의', color: '#f59e0b' },
  { value: 'remote_support', label: '원격지원', color: '#06b6d4' },
  { value: 'training', label: '교육', color: '#8b5cf6' },
  { value: 'sales_support', label: '영업 지원', color: '#0ea5a4' }
];

const SCHEDULE_DIVISION_OPTIONS: { value: CalendarScheduleDivision; label: string }[] = [
  { value: 'am_offsite', label: '오전외근' },
  { value: 'pm_offsite', label: '오후외근' },
  { value: 'all_day_offsite', label: '전일외근' },
  { value: 'night_support', label: '야간지원' },
  { value: 'emergency_support', label: '긴급지원' }
];

const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  onRequestDelete,
  canDelete = false,
  event,
  selectedDate,
  creatorDisplayName
}) => {
  const contracts = useAppStore((state) => state.contracts);
  const currentUser = useAppStore((state) => state.user);
  const createEvent = useAppStore((state) => state.createCalendarEvent);
  const updateEvent = useAppStore((state) => state.updateCalendarEvent);
  const showToast = useAppStore((state) => state.showToast);

  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    type: 'inspection',
    scheduleDivision: 'all_day_offsite',
    customerName: '',
    location: '',
    start: '',
    end: '',
    contractId: 0,
    status: 'scheduled',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supportMinutes = useMemo(
    () => calculateSupportMinutesExcludingLunch(formData.start, formData.end),
    [formData.start, formData.end]
  );
  const supportHours = Number((supportMinutes / 60).toFixed(2));

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        type: event.type,
        scheduleDivision: event.scheduleDivision || 'all_day_offsite',
        customerName: event.customerName || '',
        location: event.location || '',
        start: toDateTimeLocalInput(event.start),
        end: toDateTimeLocalInput(event.end),
        contractId: event.contractId,
        status: event.status,
        description: event.description || ''
      });
    } else if (selectedDate) {
      const startDate = new Date(selectedDate);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      setFormData({
        title: '',
        type: 'inspection',
        scheduleDivision: 'all_day_offsite',
        customerName: '',
        location: '',
        start: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        end: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        contractId: 0,
        status: 'scheduled',
        description: ''
      });
    }
    setErrors({});
  }, [event, selectedDate, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = '일정 제목을 입력해 주세요';
    }

    if (!formData.start) {
      newErrors.start = '시작 일시를 선택해 주세요';
    }

    if (!formData.end) {
      newErrors.end = '종료 일시를 선택해 주세요';
    }

    if (!formData.scheduleDivision) {
      newErrors.scheduleDivision = '일정 구분을 선택해 주세요';
    }

    if (formData.start && formData.end && new Date(formData.start) > new Date(formData.end)) {
      newErrors.end = '종료 일시는 시작 일시보다 늦어야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        supportHours
      };
      if (event) {
        await updateEvent(event.id, payload);
        showToast('일정을 수정했습니다', 'success');
      } else {
        await createEvent(payload as Omit<CalendarEvent, 'id'>);
        showToast('일정을 등록했습니다', 'success');
      }
      onClose();
    } catch (error) {
      showToast('일정 저장 중 오류가 발생했습니다', 'error');
      console.error('Event save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contractOptions = contracts.map((c) => ({
    value: String(c.id),
    label: `${c.customer_name} - ${c.project_title}`
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? '일정 수정' : '새 일정 등록'}
      size="md"
      footer={
        <>
          {event && canDelete && onRequestDelete && (
            <Button variant="danger" onClick={onRequestDelete} disabled={isSubmitting}>
              삭제
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            {event ? '수정하기' : '등록하기'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="일정 제목"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          error={errors.title}
          placeholder="예: 정기 점검, 계약 갱신 회의"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="고객사명"
            value={formData.customerName || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
            placeholder="예: 인트루바인"
          />
          <Input
            label="장소"
            value={formData.location || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="예: 본사 3층 회의실"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="일정 유형"
            value={formData.type}
            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as CalendarEventType }))}
            options={EVENT_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
            required
          />
          <Select
            label="일정 구분"
            value={formData.scheduleDivision || 'all_day_offsite'}
            onChange={(e) => setFormData((prev) => ({ ...prev, scheduleDivision: e.target.value as CalendarScheduleDivision }))}
            options={SCHEDULE_DIVISION_OPTIONS}
            error={errors.scheduleDivision}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="연결 계약"
            value={String(formData.contractId)}
            onChange={(e) => setFormData((prev) => ({ ...prev, contractId: parseInt(e.target.value, 10) }))}
            options={[{ value: '0', label: '선택 안 함' }, ...contractOptions]}
            helperText={contractOptions.length === 0 ? '등록된 계약이 없어도 일정 등록은 가능합니다.' : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="event-start" className="block text-sm font-semibold text-slate-700 mb-1.5">
              시작 일시
            </label>
            <input
              id="event-start"
              type="datetime-local"
              value={formData.start}
              onChange={(e) => setFormData((prev) => ({ ...prev, start: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              required
            />
            {errors.start && <p className="mt-1 text-xs text-red-500">{errors.start}</p>}
          </div>
          <div>
            <label htmlFor="event-end" className="block text-sm font-semibold text-slate-700 mb-1.5">
              종료 일시
            </label>
            <input
              id="event-end"
              type="datetime-local"
              value={formData.end}
              onChange={(e) => setFormData((prev) => ({ ...prev, end: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              required
            />
            {errors.end && <p className="mt-1 text-xs text-red-500">{errors.end}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="상태"
            value={formData.status}
            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as CalendarEvent['status'] }))}
            options={[
              { value: 'scheduled', label: '예정' },
              { value: 'completed', label: '완료' },
              { value: 'overdue', label: '지연' }
            ]}
            required
          />
          <Input
            label="총 지원 시간"
            value={`${Math.floor(supportMinutes / 60)}시간 ${supportMinutes % 60}분`}
            disabled
          />
        </div>

        <Input
          label="등록자"
          value={creatorDisplayName && creatorDisplayName !== '?' ? creatorDisplayName : currentUser?.display_name || '-'}
          disabled
        />

        <div>
          <label htmlFor="event-description" className="block text-sm font-semibold text-slate-700 mb-1.5">
            설명
          </label>
          <textarea
            id="event-description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="일정에 대한 추가 설명"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none min-h-[80px] resize-y"
          />
        </div>
      </form>
    </Modal>
  );
};

const CalendarPage: React.FC = () => {
  const events = useAppStore((state) => state.calendarEvents);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const loadUsers = useAppStore((state) => state.loadUsers);
  const loadContracts = useAppStore((state) => state.loadContracts);
  const loadCalendarEvents = useAppStore((state) => state.loadCalendarEvents);
  const loadAdditionalHolidays = useAppStore((state) => state.loadAdditionalHolidays);
  const deleteEvent = useAppStore((state) => state.deleteCalendarEvent);
  const generateCalendarEvents = useAppStore((state) => state.generateCalendarEventsFromData);
  const showToast = useAppStore((state) => state.showToast);
  const additionalHolidays = useAppStore((state) => state.additionalHolidays);
  const holidayLoadError = useAppStore((state) => state.holidayLoadError);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    loadCalendarEvents();
    loadContracts();
  }, [loadCalendarEvents, loadContracts]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadAdditionalHolidays();
  }, [isAuthenticated, loadAdditionalHolidays]);

  useEffect(() => {
    if (holidayLoadError) {
      showToast('공휴일 데이터를 불러오지 못했습니다', 'warning');
    }
  }, [holidayLoadError, showToast]);

  useEffect(() => {
    if (role === 'admin') {
      loadUsers();
    }
  }, [role, loadUsers]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api && api.view.type !== calendarView) {
      api.changeView(calendarView);
    }
  }, [calendarView]);

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateCalendarEvents();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.startStr);
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id;
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setSelectedDate('');
      setIsModalOpen(true);
    }
  }, [events]);

  const handleEventMouseEnter = useCallback((hoverInfo: EventHoveringArg) => {
    const props = hoverInfo.event.extendedProps as Partial<CalendarEvent> & { isHoliday?: boolean };
    if (props.isHoliday || !props.title) {
      setHoveredEvent(null);
      return;
    }
    setHoveredEvent(props as CalendarEvent);
    setHoverPosition({
      x: hoverInfo.jsEvent.clientX + 12,
      y: hoverInfo.jsEvent.clientY + 12
    });
  }, []);

  const handleEventMouseLeave = useCallback(() => {
    setHoveredEvent(null);
  }, []);

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      await deleteEvent(selectedEvent.id);
      setIsDeleteModalOpen(false);
      setIsModalOpen(false);
      setSelectedEvent(null);
      showToast('일정을 삭제했습니다', 'success');
    }
  };

  const getEventColor = useCallback((type: CalendarEventType) => {
    const colors: Record<CalendarEventType, string> = {
      inspection: '#3b82f6',
      maintenance: '#22c55e',
      contract_end: '#ef4444',
      meeting: '#f59e0b',
      remote_support: '#06b6d4',
      training: '#8b5cf6',
      sales_support: '#0ea5a4'
    };
    return colors[type] || '#6b7280';
  }, []);

  const appEvents = useMemo(() => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: getEventColor(event.type),
      borderColor: getEventColor(event.type),
      extendedProps: event
    }));
  }, [events, getEventColor]);

  const renderEventContent = (arg: EventContentArg) => {
    const props = arg.event.extendedProps as Partial<CalendarEvent> & { isHoliday?: boolean };
    if (props.isHoliday) {
      return <span className="text-[11px]">{arg.event.title}</span>;
    }

    const createdByDisplay = resolveCreatorDisplayName(props.createdBy, props.createdByName);
    return (
      <div className="flex items-center gap-1 min-w-0">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-700 shrink-0">
          {createdByDisplay}
        </span>
        <span className="truncate text-[11px]">{arg.event.title}</span>
      </div>
    );
  };

  const customHolidayEvents = useMemo(() => {
    return additionalHolidays
      .map((holiday) => {
      const color = holiday.type === 'national' ? NATIONAL_HOLIDAY_COLOR : COMPANY_HOLIDAY_COLOR;
      const dateStr = normalizeHolidayDate(holiday.date);
      if (!dateStr) return null;
      return {
        id: `custom-holiday-${holiday.id}`,
        title: `${holiday.type === 'national' ? '국가 공휴일' : '기업휴일'} · ${holiday.name}`,
        start: dateStr,
        allDay: true,
        display: 'block',
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          isHoliday: true,
          holidayType: holiday.type,
          holidayName: holiday.name
        },
        classNames: ['holiday-event', holiday.type === 'national' ? 'national-holiday' : 'company-holiday']
      };
    })
      .filter(Boolean);
  }, [additionalHolidays]);

  const holidayDateSet = useMemo(() => {
    const set = new Set<string>();
    additionalHolidays.forEach((holiday) => {
      const normalized = normalizeHolidayDate(holiday.date);
      if (normalized) set.add(normalized);
    });
    return set;
  }, [additionalHolidays]);

  const getDayCellClasses = useCallback(
    (arg: any) => {
      const dateKey = format(arg.date, 'yyyy-MM-dd');
      const day = arg.date.getDay();
      if (holidayDateSet.has(dateKey) || day === 0) return ['fc-sun-day'];
      if (day === 6) return ['fc-sat-day'];
      return [];
    },
    [holidayDateSet]
  );

  const getDayHeaderClasses = useCallback((arg: any) => {
    const day = arg.date.getDay();
    if (day === 0) return ['fc-sun-day'];
    if (day === 6) return ['fc-sat-day'];
    return [];
  }, []);

  const calendarEvents = useMemo(() => {
    const events = [...appEvents, ...customHolidayEvents];
    const sanitizedEvents = events.map((e: any) => ({
      ...e,
      start: typeof e.start === 'string' ? e.start : e.start instanceof Date ? e.start.toISOString().slice(0, 10) : e.start,
      end: e.end ? (typeof e.end === 'string' ? e.end : e.end instanceof Date ? e.end.toISOString().slice(0, 10) : e.end) : undefined
    }));
    return sanitizedEvents;
  }, [appEvents, customHolidayEvents]);

  const resolveCreatorFullName = useCallback(
    (createdBy?: string, createdByName?: string) => {
      const fromEvent = createdByName?.trim();
      const fromUsers = users.find((u) => u.username === createdBy)?.display_name;
      const fromCurrentUser = currentUser?.username === createdBy ? currentUser?.display_name : undefined;
      return (fromEvent || fromUsers || fromCurrentUser || createdBy || '').trim();
    },
    [users, currentUser]
  );
  const resolveCreatorDisplayName = useCallback(
    (createdBy?: string, createdByName?: string) => {
      return toBadgeText(resolveCreatorFullName(createdBy, createdByName));
    },
    [resolveCreatorFullName]
  );
  const statusLabelMap: Record<CalendarEvent['status'], string> = {
    scheduled: '예정',
    completed: '완료',
    overdue: '지연'
  };
  const canDeleteSelectedEvent = Boolean(
    selectedEvent &&
      (role === 'admin' || (currentUser?.username && selectedEvent.createdBy === currentUser.username))
  );

  const viewButtons = [
    { key: 'dayGridMonth', label: '월' },
    { key: 'timeGridWeek', label: '주' },
    { key: 'timeGridDay', label: '일' }
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">일정 관리</h1>
          <p className="text-slate-500 mt-1">자체 일정과 계약 일정을 함께 관리합니다</p>
        </div>
        <div className="flex gap-2">
          {viewButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={calendarView === btn.key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCalendarView(btn.key)}
            >
              {btn.label}
            </Button>
          ))}
          <Button
            variant="primary"
            onClick={() => {
              setSelectedDate(new Date().toISOString());
              setSelectedEvent(null);
              setIsModalOpen(true);
            }}
          >
            + 새 일정
          </Button>
          <Button
            variant="secondary"
            onClick={handleAutoGenerate}
            isLoading={isGenerating}
            title="계약 종료 일정을 자동 생성합니다"
          >
            자동 생성
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-6 text-sm">
          {EVENT_TYPE_OPTIONS.map((type) => (
            <div key={type.value} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
              <span className="text-slate-600">{type.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: NATIONAL_HOLIDAY_COLOR }} />
            <span className="text-slate-600">대한민국 공휴일</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: COMPANY_HOLIDAY_COLOR }} />
            <span className="text-slate-600">기업휴일</span>
          </div>
        </div>
      </Card>
      {holidayLoadError && (
        <Card className="mb-4 border border-amber-200 bg-amber-50 text-amber-800">
          <p className="text-sm">{holidayLoadError}</p>
        </Card>
      )}

      <Card className="p-4">
        <FullCalendar
          key={`calendar-${additionalHolidays.length}-${additionalHolidays.map(h => h.id).join('-')}`}
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={calendarView}
          locale={koLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          allDayText="종일"
          events={calendarEvents}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={false}
          weekends={true}
          dayCellClassNames={getDayCellClasses}
          dayHeaderClassNames={getDayHeaderClasses}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventMouseEnter={handleEventMouseEnter}
          eventMouseLeave={handleEventMouseLeave}
          eventContent={renderEventContent}
          height="auto"
          aspectRatio={1.8}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={true}
          slotDuration="00:30:00"
          snapDuration="00:30:00"
        />
      </Card>

      {hoveredEvent && (
        <div
          className="fixed z-[1000] pointer-events-none rounded-lg border border-slate-200 bg-white/95 shadow-lg px-3 py-2 text-xs text-slate-700 space-y-1 max-w-[280px]"
          style={{ left: hoverPosition.x, top: hoverPosition.y }}
        >
          <p className="font-semibold text-slate-900">{hoveredEvent.title}</p>
          <p>유형: {EVENT_TYPE_OPTIONS.find((o) => o.value === hoveredEvent.type)?.label ?? hoveredEvent.type}</p>
          <p>등록자: {resolveCreatorFullName(hoveredEvent.createdBy, hoveredEvent.createdByName) || '-'}</p>
          <p>고객사: {hoveredEvent.customerName || '-'}</p>
          <p>장소: {hoveredEvent.location || '-'}</p>
          <p>
            일정: {format(new Date(hoveredEvent.start), 'yyyy-MM-dd HH:mm')} ~{' '}
            {format(new Date(hoveredEvent.end), 'yyyy-MM-dd HH:mm')}
          </p>
          <p>상태: {statusLabelMap[hoveredEvent.status]}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <div className="text-center">
            <p className="text-xs text-slate-400 font-semibold mb-1">이번 달 일정</p>
            <p className="text-2xl font-bold text-slate-900">
              {events.filter((e) => {
                const eventDate = new Date(e.start);
                const now = new Date();
                return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-slate-400 font-semibold mb-1">예정 점검</p>
            <p className="text-2xl font-bold text-blue-600">
              {events.filter((e) => e.type === 'inspection' && e.status === 'scheduled').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-slate-400 font-semibold mb-1">계약 만료 예정</p>
            <p className="text-2xl font-bold text-red-600">
              {events.filter((e) => e.type === 'contract_end' && e.status === 'scheduled').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-slate-400 font-semibold mb-1">완료된 일정</p>
            <p className="text-2xl font-bold text-green-600">
              {events.filter((e) => e.status === 'completed').length}
            </p>
          </div>
        </Card>
      </div>

      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        onRequestDelete={() => setIsDeleteModalOpen(true)}
        canDelete={canDeleteSelectedEvent}
        event={selectedEvent}
        selectedDate={selectedDate}
        creatorDisplayName={
          selectedEvent ? resolveCreatorDisplayName(selectedEvent.createdBy, selectedEvent.createdByName) : undefined
        }
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteEvent}
        title="일정 삭제"
        message={`"${selectedEvent?.title}" 일정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
};

export default CalendarPage;


