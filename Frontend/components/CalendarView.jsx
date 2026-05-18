'use client';
import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import CalendarToolbar from './CalendarToolbar';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const VIEW_NAMES = ['month', 'week', 'day', 'agenda'];

function CalendarView({ agendamentos, bloqueios, config, espacos = [], onSelectEvent, onSelectDay }) {
    const [currentView, setCurrentView] = useState('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    const eventosCalendario = useMemo(() => [
        ...agendamentos.map(ag => ({
            id: `appt-${ag.id}`,
            title: `${ag.client?.nome || 'Cliente'} - ${ag.space?.nome || 'Espaço'}`,
            start: new Date(ag.dataInicio),
            end: new Date(ag.dataFim),
            status: ag.status || 'Agendado',
            type: 'agendamento',
            raw: ag
        })),
        ...bloqueios.map(bl => ({
            id: `blq-${bl.id}`,
            title: `Bloqueio: ${bl.motivo || 'Indisponível'}`,
            start: new Date(bl.dataInicio),
            end: new Date(bl.dataFim),
            status: 'Bloqueado',
            type: 'bloqueio',
            raw: bl
        }))
    ], [agendamentos, bloqueios]);

    const statusColors = {
        Confirmado: { bg: '#059669', border: '#34d399' },
        Pendente: { bg: '#d97706', border: '#fbbf24' },
        Cancelado: { bg: '#dc2626', border: '#f87171' },
        Concluído: { bg: '#4b5563', border: '#9ca3af' },
        Bloqueado: { bg: 'linear-gradient(135deg, #991b1b, #7f1d1d)', border: '#ef4444' },
        Agendado: { bg: '#6366f1', border: '#a5b4fc' }
    };

    const eventStyleGetter = (event) => {
        const colors = statusColors[event.status] || statusColors.Agendado;
        return {
            style: {
                background: colors.bg,
                borderLeft: `3px solid ${colors.border}`,
                borderRadius: '4px',
                color: 'white',
                display: 'block',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                border: 'none',
                transition: 'all 0.2s ease',
                opacity: event.status === 'Bloqueado' ? 0.8 : 0.95
            },
            className: `calendar-event calendar-${event.status?.toLowerCase() || 'agendado'}`
        };
    };

    const minTime = useMemo(() => {
        const h = parseInt(config.horaInicio?.split(':')[0] || 8);
        const m = parseInt(config.horaInicio?.split(':')[1] || 0);
        return moment().set({ h, m }).toDate();
    }, [config.horaInicio]);

    const maxTime = useMemo(() => {
        const h = parseInt(config.horaFim?.split(':')[0] || 18);
        const m = parseInt(config.horaFim?.split(':')[1] || 0);
        return moment().set({ h, m }).toDate();
    }, [config.horaFim]);

    const handleSelectSlot = ({ start, end }) => {
        const dayEvents = eventosCalendario.filter(event => {
            const eventStart = new Date(event.start);
            return eventStart >= start && eventStart < end && event.type === 'agendamento';
        });
        onSelectDay?.(dayEvents, start);
    };

    const handleShowMore = (events, date) => {
        const agendamentosDoDia = events.filter(e => e.type === 'agendamento');
        if (agendamentosDoDia.length > 0) {
            onSelectDay?.(agendamentosDoDia, date);
        }
    };

    const dayPropGetter = useMemo(() => {
        const diasFunc = config.diasFuncionamento?.split(',').map(Number) || [];
        const [hA, mA] = (config.horaInicio || '08:00').split(':').map(Number);
        const [hF, mF] = (config.horaFim || '18:00').split(':').map(Number);
        const duracao = config.duracaoAtendimento || 50;
        const intervalo = config.intervaloEntreAtend || 10;
        const slotsPerDay = Math.max(1, Math.floor(((hF * 60 + mF) - (hA * 60 + mA)) / (duracao + intervalo)));
        const totalCapacity = espacos.reduce((sum, e) => sum + (e.capacidade || 1), 0) * slotsPerDay;

        // Appointments per day (excluding cancelled)
        const apptsByDay = {};
        agendamentos.forEach(ag => {
            if (ag.status === 'Cancelado') return;
            const key = new Date(ag.dataInicio).toDateString();
            apptsByDay[key] = (apptsByDay[key] || 0) + 1;
        });

        // Days with any bloqueio
        const bloqueiosDias = new Set();
        bloqueios.forEach(bl => {
            let cur = new Date(bl.dataInicio);
            cur.setHours(0, 0, 0, 0);
            const end = new Date(bl.dataFim);
            end.setHours(0, 0, 0, 0);
            while (cur <= end) {
                bloqueiosDias.add(cur.toDateString());
                cur = new Date(cur.getTime() + 86400000);
            }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (date) => {
            if (date < today) return {};
            const dayOfWeek = date.getDay();
            if (!diasFunc.includes(dayOfWeek)) return {};

            const key = date.toDateString();
            const appts = apptsByDay[key] || 0;
            const hasBlock = bloqueiosDias.has(key);

            if (hasBlock || (totalCapacity > 0 && appts >= totalCapacity)) {
                return { style: { backgroundColor: 'rgba(239, 68, 68, 0.10)' } };
            }
            return { style: { backgroundColor: 'rgba(37, 211, 102, 0.08)' } };
        };
    }, [agendamentos, bloqueios, config, espacos]);

    return (
        <Calendar
            localizer={localizer}
            events={eventosCalendario}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            min={minTime}
            max={maxTime}
            step={parseInt(config.intervaloEntreAtend) || 15}
            selectable
            onSelectEvent={(event) => {
                if (event.type === 'agendamento') {
                    onSelectEvent?.(event);
                }
            }}
            onSelectSlot={handleSelectSlot}
            onShowMore={handleShowMore}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
            components={{ toolbar: CalendarToolbar }}
            messages={{
                today: 'Hoje',
                previous: 'Anterior',
                next: 'Próximo',
                showMore: (total) => `+${total} ver mais`,
                date: 'Data',
                time: 'Hora',
                event: 'Evento',
                allDay: 'Dia inteiro',
                week: 'Semana',
                day: 'Dia',
                month: 'Mês',
                previous: 'Anterior',
                next: 'Próximo',
                yesterday: 'Ontem',
                tomorrow: 'Amanhã',
                agenda: 'Lista',
                noEventsInRange: 'Nenhum agendamento neste período.',
                work_week: 'Semana útil'
            }}
            culture="pt-br"
            formats={{
                dateFormat: 'DD',
                dayFormat: 'ddd DD/MM',
                weekdayFormat: 'ddd',
                timeGutterFormat: 'HH:mm',
                monthHeaderFormat: 'MMMM YYYY',
                dayHeaderFormat: 'dddd, DD [de] MMMM [de] YYYY',
                agendaHeaderFormat: ({ start, end }) => moment(start).format('DD/MM') + ' - ' + moment(end).format('DD/MM/YYYY'),
                agendaDateFormat: 'ddd DD/MM',
                eventTimeRangeFormat: ({ start, end }) => moment(start).format('HH:mm') + ' - ' + moment(end).format('HH:mm'),
            }}
            className="agendaflow-calendar"
        />
    );
}

export default CalendarView;
