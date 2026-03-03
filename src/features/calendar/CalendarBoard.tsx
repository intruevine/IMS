import React, { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import koLocale from '@fullcalendar/core/locales/ko';

interface CalendarBoardProps {
  calendarKey: string;
  calendarView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  calendarEvents: any[];
  getDayCellClasses: (arg: any) => string[];
  handleDayCellDidMount: (arg: any) => void;
  getDayHeaderClasses: (arg: any) => string[];
  handleDateSelect: (arg: any) => void;
  handleEventClick: (arg: any) => void;
  handleEventMouseEnter: (arg: any) => void;
  handleEventMouseLeave: () => void;
  renderEventContent: (arg: any) => React.ReactNode;
}

const CalendarBoard: React.FC<CalendarBoardProps> = ({
  calendarKey,
  calendarView,
  calendarEvents,
  getDayCellClasses,
  handleDayCellDidMount,
  getDayHeaderClasses,
  handleDateSelect,
  handleEventClick,
  handleEventMouseEnter,
  handleEventMouseLeave,
  renderEventContent
}) => {
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api && api.view.type !== calendarView) {
      api.changeView(calendarView);
    }
  }, [calendarView]);

  return (
    <FullCalendar
      key={calendarKey}
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
      dayCellDidMount={handleDayCellDidMount}
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
  );
};

export default CalendarBoard;
