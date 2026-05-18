'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, IconCalendar, IconLogOut, IconGoogle, IconWhatsApp, IconUser, IconKey, IconMail, IconPhone, IconMenu, IconChevronLeft, IconPlus, IconMapPin, IconArrowRight } from '../components/Icons';
import api from '../services/api';
import { formatNationalPhone, getWhatsAppLink, toE164National, DEFAULT_DDI, extractNationalDigits } from '../utils/phone';
import PhoneInput from '../components/PhoneInput';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { ListSkeleton } from '../components/SkeletonLoader';
import AIAssistant from '../components/AIAssistant';


function MiniCalendar({ value, onChange }) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const initYear = value ? parseInt(value.split('-')[0]) : today.getFullYear();
    const initMonth = value ? parseInt(value.split('-')[1]) - 1 : today.getMonth();
    const [viewYear, setViewYear] = useState(initYear);
    const [viewMonth, setViewMonth] = useState(initMonth);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const cells = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prevMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a0a0b8] hover:text-white hover:bg-white/10 cursor-pointer bg-transparent border-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </motion.button>
                <span className="text-sm font-semibold text-white">{monthNames[viewMonth]} {viewYear}</span>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={nextMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a0a0b8] hover:text-white hover:bg-white/10 cursor-pointer bg-transparent border-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </motion.button>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-xs text-[#a0a0b8] py-1 font-medium">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const m = String(viewMonth + 1).padStart(2, '0');
                    const dd = String(d).padStart(2, '0');
                    const dateStr = `${viewYear}-${m}-${dd}`;
                    const isPast = dateStr < todayStr;
                    const isSelected = dateStr === value;
                    const isToday = dateStr === todayStr;
                    return (
                        <motion.button
                            key={i}
                            whileHover={!isPast ? { scale: 1.15 } : {}}
                            whileTap={!isPast ? { scale: 0.9 } : {}}
                            onClick={() => !isPast && onChange(dateStr)}
                            disabled={isPast}
                            className={`h-8 w-full rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer border-none
                                ${isPast ? 'text-white/20 cursor-not-allowed' : ''}
                                ${isSelected ? 'bg-rocket-purple text-white shadow-lg shadow-rocket-purple/30' : ''}
                                ${!isSelected && !isPast ? 'text-[#e1e1e6] hover:bg-white/10' : ''}
                                ${isToday && !isSelected ? 'ring-1 ring-rocket-purple/60' : ''}
                            `}
                        >
                            {d}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

const statusColors = {
    Confirmado: '#10b981',
    Pendente: '#f59e0b',
    Cancelado: '#ef4444',
    Agendado: '#6366f1',
    Concluído: '#374151'
};

const statusLabels = {
    Agendado: 'Agendado',
    Confirmado: 'Confirmado',
    Pendente: 'Pendente',
    Cancelado: 'Cancelado',
    Concluído: 'Concluído'
};

function ClientDashboard({ cliente, token, onLogout }) {
    const showToast = useToast();
    const [activeTab, setActiveTab] = useState('agendamentos');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [googleEmail, setGoogleEmail] = useState(null);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null });
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [onboardingSteps, setOnboardingSteps] = useState([]);
    const [savingOnboardingPhone, setSavingOnboardingPhone] = useState(false);

    // Profile
    const [profileNome, setProfileNome] = useState(cliente?.nome || '');
    const [profilePhoneState, setProfilePhoneState] = useState(() => ({
        ddi: DEFAULT_DDI,
        number: extractNationalDigits(cliente?.telefone || ''),
    }));
    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');

    // Onboarding modal phone state
    const [onboardingPhoneState, setOnboardingPhoneState] = useState({ ddi: DEFAULT_DDI, number: '' });

    // Novo agendamento
    const [espacos, setEspacos] = useState([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [slots, setSlots] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [slotsMessage, setSlotsMessage] = useState(null);
    const [blockInfo, setBlockInfo] = useState([]);
    const [businessHours, setBusinessHours] = useState(null);

    useEffect(() => {
        if (!token) return;
        const fetchData = async () => {
            try {
                const [resAgendamentos, resGoogle, resEspacos] = await Promise.all([
                    api.get('/agendamentos/cliente'),
                    api.get('/google/status-cliente'),
                    api.get('/espacos')
                ]);
                setAgendamentos(resAgendamentos.data || []);
                setIsGoogleConnected(resGoogle.data.connected);
                setGoogleEmail(resGoogle.data.email || null);
                setEspacos(resEspacos.data || []);

                // Disparar onboarding se phone ou google faltando (apenas 1x por conta)
                const dismissed = localStorage.getItem(`agendaflow_ob_${cliente?.id}`);
                if (!dismissed) {
                    const steps = [];
                    if (!cliente?.telefone) steps.push('phone');
                    if (!resGoogle.data.connected) steps.push('google');
                    if (steps.length > 0) {
                        setOnboardingSteps(steps);
                        setOnboardingStep(0);
                        setShowOnboarding(true);
                    }
                }
            } catch (e) {
                if (e.response?.status === 401) onLogout();
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const params = new URLSearchParams(window.location.search);
        if (params.has('google')) {
            const status = params.get('google');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            setTimeout(() => fetchData(), 500);
            if (status === 'connected') showToast('Google Agenda conectado com sucesso!', 'success');
            else if (status === 'error') showToast('Erro ao conectar Google Agenda.', 'error');
            else if (status === 'no_refresh_token') showToast('Revogue o acesso no Google e tente novamente.', 'warning');
        }
    }, [token]);

    // Atualiza profilePhoneState quando cliente mudar
    useEffect(() => {
        if (cliente?.telefone) setProfilePhoneState({
            ddi: DEFAULT_DDI,
            number: extractNationalDigits(cliente.telefone),
        });
    }, [cliente?.telefone]);

    const buscarSlots = useCallback(async () => {
        if (!selectedSpaceId || !selectedDate) return;
        setSlotsLoading(true);
        setSelectedSlots([]);
        setSlotsMessage(null);
        setBlockInfo([]);
        setBusinessHours(null);
        try {
            const res = await api.get('/agendamentos/slots', {
                params: { spaceId: selectedSpaceId, data: selectedDate }
            });
            setSlots(res.data.slots || []);
            setSlotsMessage(res.data.message || null);
            setBlockInfo(res.data.blockInfo || []);
            setBusinessHours(res.data.businessHours || null);
        } catch (e) {
            showToast("Erro ao buscar horários disponíveis.", "error");
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    }, [selectedSpaceId, selectedDate]);

    useEffect(() => {
        buscarSlots();
    }, [buscarSlots]);

    const criarAgendamento = async () => {
        if (!selectedSpaceId || selectedSlots.length === 0) return showToast("Selecione um espaço e horário.", "warning");
        setBookingLoading(true);
        const datas = selectedSlots.map(s => new Date(s.dataInicio).getTime()).sort((a, b) => a - b);
        try {
            await api.post('/agendamentos/self-service', {
                spaceId: parseInt(selectedSpaceId),
                dataInicio: new Date(datas[0]).toISOString(),
                dataFim: new Date(datas[datas.length - 1] + (new Date(selectedSlots[0].dataFim).getTime() - new Date(selectedSlots[0].dataInicio).getTime())).toISOString()
            });
            showToast("Agendamento criado com sucesso!", "success");
            setSelectedSpaceId('');
            setSelectedDate('');
            setSlots([]);
            setSelectedSlots([]);
            const res = await api.get('/agendamentos/cliente');
            setAgendamentos(res.data || []);
            setActiveTab('agendamentos');
        } catch (e) {
            showToast(e.response?.data?.erro || "Erro ao criar agendamento.", "error");
        } finally {
            setBookingLoading(false);
        }
    };

    const conectarGoogle = async () => {
        try {
            const res = await api.get('/google/connect-cliente');
            if (res.data.url) window.location.href = res.data.url;
            else if (res.data.connected) { setIsGoogleConnected(true); }
        } catch (error) {
            const msg = error.response?.data?.erro || '';
            showToast(msg || "Erro ao conectar com Google Agenda.", "error");
        }
    };

    const desconectarGoogle = async () => {
        try {
            await api.post('/google/disconnect-cliente');
            showToast("Google Calendar desconectado!", "success");
            setIsGoogleConnected(false);
        } catch (e) { showToast("Erro ao desconectar Google Calendar", "error"); }
    };

    const salvarPerfil = async () => {
        const telefoneParaSalvar = toE164National(profilePhoneState.ddi, profilePhoneState.number);
        try {
            const payload = {};
            if (profileNome !== cliente?.nome) payload.nome = profileNome;
            if (profilePhoneState.number !== extractNationalDigits(cliente?.telefone || ''))
                payload.telefone = telefoneParaSalvar;
            if (senhaAtual && novaSenha) {
                payload.senhaAtual = senhaAtual;
                payload.novaSenha = novaSenha;
            }
            if (Object.keys(payload).length === 0) return showToast("Nenhuma alteração para salvar.", "warning");
            await api.put('/auth/alterar-dados-cliente', payload);
            showToast("Perfil atualizado!", "success");
            setSenhaAtual('');
            setNovaSenha('');
            const stored = JSON.parse(localStorage.getItem('cliente') || '{}');
            if (payload.nome) stored.nome = payload.nome;
            if (payload.telefone) stored.telefone = payload.telefone;
            localStorage.setItem('cliente', JSON.stringify(stored));
        } catch (e) { showToast(e.response?.data?.erro || "Erro ao atualizar perfil.", "error"); }
    };

    const confirmCancelar = (id) => {
        setConfirm({
            open: true,
            message: "Deseja cancelar este agendamento?",
            onConfirm: async () => {
                setConfirm({ open: false, message: '', onConfirm: null });
                try {
                    await api.delete(`/agendamentos/${id}`);
                    setAgendamentos(prev => prev.filter(a => a.id !== id));
                    setSelectedAppt(null);
                    showToast("Agendamento cancelado!", "success");
                } catch (e) { showToast("Erro ao cancelar agendamento.", "error"); }
            }
        });
    };

    const dismissOnboarding = () => {
        localStorage.setItem(`agendaflow_ob_${cliente?.id}`, '1');
        setShowOnboarding(false);
    };

    const nextOnboardingStep = () => {
        if (onboardingStep < onboardingSteps.length - 1) {
            setOnboardingStep(s => s + 1);
        } else {
            dismissOnboarding();
        }
    };

    const now = new Date();
    const activeAppts = agendamentos.filter(a => a.status !== 'Cancelado' && a.status !== 'Concluído');
    const pastAppts = agendamentos.filter(a => a.status === 'Cancelado' || a.status === 'Concluído');

    const hoje = new Date().toISOString().split('T')[0];
    const Btn = ({ onClick, children, color = 'green', className = '', disabled }) => {
        const colors = {
            green: 'text-white shadow-lg',
            red: 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20',
            ghost: 'bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white border border-white/[0.08] hover:border-white/[0.15]',
            purple: 'bg-rocket-purple hover:bg-rocket-purple/90 text-white shadow-lg shadow-rocket-purple/20',
        };
        return (
            <motion.button whileHover={{ scale: disabled ? 1 : 1.03 }} whileTap={{ scale: disabled ? 1 : 0.97 }} onClick={onClick} disabled={disabled}
                className={`${colors[color]} px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
                style={color === 'green' ? { background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130,87,229,0.3)', border: 'none' } : {}}>
                {children}
            </motion.button>
        );
    };

    const tabs = [
        { key: 'agendamentos', label: 'Meus Agendamentos', icon: IconCalendar },
        { key: 'novo', label: 'Novo Agendamento', icon: IconPlus },
        { key: 'perfil', label: 'Meu Perfil', icon: IconUser },
    ];

    return (
        <div className="min-h-screen text-[#e1e1e6] font-inter relative overflow-hidden" style={{ background: '#120F17' }}>


            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`fixed top-0 left-0 z-40 h-full w-64 glass border-r border-white/[0.06] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                            <Logo className="w-7 h-7 text-rocket-purple-light" />
                            <span className="text-lg font-bold text-white">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#a0a0b8] hover:text-white cursor-pointer bg-transparent border-none">
                            <IconChevronLeft className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-5 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rocket-purple/20 flex items-center justify-center text-sm font-bold text-rocket-purple-light shrink-0">
                                {cliente?.nome ? cliente.nome.charAt(0).toUpperCase() + (cliente.nome.split(' ')[1]?.[0]?.toUpperCase() || '') : 'C'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate text-white">{cliente?.nome || 'Cliente'}</p>
                                <p className="text-xs text-[#a0a0b8] truncate">{cliente?.email || ''}</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border-none ${
                                        activeTab === tab.key
                                            ? 'bg-rocket-purple/20 text-rocket-purple-light border border-rocket-purple/30'
                                            : 'text-[#a0a0b8] hover:text-white hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="px-3 py-3 border-t border-white/[0.06]">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all duration-200 cursor-pointer border-none"
                        >
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                            <span>Sair</span>
                        </button>
                    </div>
                </div>
            </aside>

            <div className="lg:ml-64 min-h-screen">
                <header className="sticky top-0 z-20 glass border-b border-white/[0.06]">
                    <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2 lg:hidden">
                            <button onClick={() => setSidebarOpen(true)} className="text-[#a0a0b8] hover:text-white cursor-pointer bg-transparent border-none">
                                <IconMenu className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="hidden lg:flex items-center gap-2.5">
                            <Logo className="w-7 h-7 text-rocket-purple-light" />
                            <span className="text-lg font-bold text-white">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => cliente?.telefone ? null : setActiveTab('perfil')}
                                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${cliente?.telefone ? 'bg-[#25d366]/10 text-[#25d366] border border-[#25d366]/20' : 'bg-white/5 text-[#a0a0b8] border border-white/10 hover:bg-white/10'}`}>
                                <IconWhatsApp className="w-4 h-4" />
                                <span className="hidden sm:inline">{cliente?.telefone ? 'WhatsApp Conectado' : 'Adicionar WhatsApp'}</span>
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={conectarGoogle}
                                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${isGoogleConnected ? 'bg-rocket-green/10 text-rocket-green border border-rocket-green/20' : 'bg-rocket-purple/10 text-rocket-purple-light border border-rocket-purple/20 hover:bg-rocket-purple/20'}`}>
                                <IconGoogle className="w-4 h-4" />
                                <span className="hidden sm:inline">{isGoogleConnected ? 'Google Sincronizado' : 'Conectar Google'}</span>
                            </motion.button>
                            <div className="hidden sm:flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-rocket-purple/20 flex items-center justify-center text-xs font-bold text-rocket-purple-light shrink-0">
                                    {cliente?.nome ? cliente.nome.charAt(0).toUpperCase() + (cliente.nome.split(' ')[1]?.[0]?.toUpperCase() || '') : 'C'}
                                </div>
                                <span className="text-sm text-[#a0a0b8]">{cliente?.nome}</span>
                            </div>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onLogout}
                                className="flex items-center gap-2 bg-white/5 text-[#a0a0b8] hover:text-red-400 border border-white/[0.08] hover:border-red-400/30 hover:bg-red-400/10 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer">
                                <IconLogOut className="w-4 h-4" /> Sair
                            </motion.button>
                        </div>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'agendamentos' && (
                            <motion.div key="agendamentos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="mb-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h1 className="text-2xl font-bold flex items-center gap-3">
                                                <IconCalendar className="w-6 h-6 text-rocket-purple-light" />
                                                Meus Agendamentos
                                            </h1>
                                            <p className="text-[#a0a0b8] text-sm mt-1">Acompanhe e gerencie seus horários agendados</p>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setActiveTab('novo')}
                                            className="text-white shadow-lg px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 border-none"
                                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130,87,229,0.3)' }}
                                        >
                                            <IconPlus className="w-4 h-4" /> Novo Agendamento
                                        </motion.button>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="flex gap-3">
                                            <span className="w-4 h-4 rounded-full bg-rocket-purple loading-dot" />
                                            <span className="w-4 h-4 rounded-full bg-rocket-purple loading-dot" />
                                            <span className="w-4 h-4 rounded-full bg-rocket-purple loading-dot" />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {activeAppts.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-lg font-semibold text-[#a0a0b8] mb-4 uppercase tracking-wider text-sm">Próximos Agendamentos</h2>
                                                <div className="space-y-3">
                                                    {activeAppts.map((appt, idx) => (
                                                        <motion.div
                                                            key={appt.id}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="glass-card rounded-xl p-5 hover:border-rocket-purple/30 transition-all duration-300 cursor-pointer"
                                                            onClick={() => setSelectedAppt(selectedAppt?.id === appt.id ? null : appt)}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                                    <div className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: statusColors[appt.status] || '#6366f1', width: '4px' }} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <h3 className="font-semibold text-base truncate">{appt.space?.nome || 'Espaço'}</h3>
                                                                        <p className="text-sm text-[#a0a0b8] mt-0.5">
                                                                            {new Date(appt.dataInicio).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                                        </p>
                                                                        <p className="text-sm text-[#a0a0b8]">
                                                                            {new Date(appt.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(appt.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-medium px-3 py-1 rounded-full flex-shrink-0" style={{
                                                                    backgroundColor: `${statusColors[appt.status] || '#6366f1'}20`,
                                                                    color: statusColors[appt.status] || '#6366f1'
                                                                }}>
                                                                    {statusLabels[appt.status] || appt.status}
                                                                </span>
                                                            </div>
                                                            {selectedAppt?.id === appt.id && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/[0.06]">
                                                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                                        {(appt.status === 'Agendado' || appt.status === 'Confirmado' || appt.status === 'Pendente') && (
                                                                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                                                                onClick={(e) => { e.stopPropagation(); confirmCancelar(appt.id); }}
                                                                                className="w-full sm:w-auto bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer">
                                                                                Cancelar Agendamento
                                                                            </motion.button>
                                                                        )}
                                                                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedAppt(null); }}
                                                                            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer">
                                                                            Fechar
                                                                        </motion.button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {activeAppts.length === 0 && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-12 text-center mb-10">
                                                <IconCalendar className="w-12 h-12 text-[#a0a0b8] mx-auto mb-4 opacity-50" />
                                                <h3 className="text-lg font-semibold mb-2">Nenhum agendamento ativo</h3>
                                                <p className="text-[#a0a0b8] text-sm">Você não possui agendamentos futuros no momento.</p>
                                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                                    onClick={() => setActiveTab('novo')}
                                                    className="mt-4 text-white shadow-lg px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer inline-flex items-center gap-2 border-none"
                                                    style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130,87,229,0.3)' }}>
                                                    <IconPlus className="w-4 h-4" /> Agendar agora
                                                </motion.button>
                                            </motion.div>
                                        )}

                                        {espacos.length > 0 && (
                                            <section className="mb-10">
                                                <h2 className="text-lg font-semibold text-[#a0a0b8] mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                                                    <IconMapPin className="w-4 h-4" /> Espaços Disponíveis
                                                </h2>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {espacos.map((esp, idx) => (
                                                        <motion.button
                                                            key={esp.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            whileHover={{ scale: 1.03 }}
                                                            whileTap={{ scale: 0.97 }}
                                                            onClick={() => { setSelectedSpaceId(esp.id); setActiveTab('novo'); }}
                                                            className="glass-card rounded-xl p-4 text-left hover:border-rocket-green/30 transition-all duration-300 cursor-pointer border border-white/[0.06]"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h3 className="font-semibold text-white text-sm">{esp.nome}</h3>
                                                                <span className="text-xs text-[#a0a0b8]">Cap: {esp.capacidade || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-rocket-green text-xs font-medium">
                                                                <IconPlus className="w-3 h-3" /> Agendar
                                                                <IconArrowRight className="w-3 h-3" />
                                                            </div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {pastAppts.length > 0 && (
                                            <section>
                                                <h2 className="text-lg font-semibold text-[#a0a0b8] mb-4 uppercase tracking-wider text-sm">Histórico</h2>
                                                <div className="space-y-2">
                                                    {pastAppts.map(appt => (
                                                        <div key={appt.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between gap-4 opacity-70 sm:hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[appt.status] || '#6366f1' }} />
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium truncate">{appt.space?.nome}</p>
                                                                    <p className="text-xs text-[#a0a0b8]">{new Date(appt.dataInicio).toLocaleDateString('pt-BR')}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0" style={{
                                                                backgroundColor: `${statusColors[appt.status] || '#6366f1'}20`,
                                                                color: statusColors[appt.status] || '#6366f1'
                                                            }}>
                                                                {statusLabels[appt.status] || appt.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'novo' && (
                            <motion.div key="novo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="mb-8">
                                    <h1 className="text-2xl font-bold flex items-center gap-3">
                                        <IconPlus className="w-6 h-6 text-rocket-purple-light" />
                                        Novo Agendamento
                                    </h1>
                                    <p className="text-[#a0a0b8] text-sm mt-1">Escolha o espaço, data e horário desejado</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="glass-card rounded-xl p-5">
                                            <h3 className="text-sm font-semibold text-[#a0a0b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <IconMapPin className="w-4 h-4" /> Espaço
                                            </h3>
                                            <div className="space-y-2">
                                                {espacos.map(esp => (
                                                    <motion.button
                                                        key={esp.id}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => { setSelectedSpaceId(esp.id); setSelectedSlots([]); }}
                                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border ${
                                                            selectedSpaceId === esp.id
                                                                ? 'bg-rocket-purple/20 text-rocket-purple-light border-rocket-purple/30'
                                                                : 'bg-white/[0.03] text-[#a0a0b8] hover:text-white hover:bg-white/[0.06] border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span>{esp.nome}</span>
                                                            <span className="text-xs opacity-60">Cap: {esp.capacidade || 'N/A'}</span>
                                                        </div>
                                                    </motion.button>
                                                ))}
                                                {espacos.length === 0 && (
                                                    <p className="text-sm text-[#a0a0b8] text-center py-4">Nenhum espaço disponível</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="glass-card rounded-xl p-5">
                                            <h3 className="text-sm font-semibold text-[#a0a0b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <IconCalendar className="w-4 h-4" /> Data
                                            </h3>
                                            <MiniCalendar
                                                value={selectedDate}
                                                onChange={d => { setSelectedDate(d); setSelectedSlots([]); }}
                                            />
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2">
                                        <div className="glass-card rounded-xl p-5">
                                            <h3 className="text-sm font-semibold text-[#a0a0b8] uppercase tracking-wider mb-4">
                                                Horários Disponíveis
                                                {selectedSpaceId && selectedDate && !slotsLoading && (
                                                    <span className="text-xs font-normal ml-2 text-[#a0a0b8]">
                                                        ({slots.length} vaga{slots.length !== 1 ? 's' : ''}
                                                        {selectedSlots.length > 0 && (
                                                            <> &middot; {selectedSlots.length} selecionado{selectedSlots.length !== 1 ? 's' : ''}</>
                                                        )}
                                                        )
                                                    </span>
                                                )}
                                            </h3>

                                            {!selectedSpaceId ? (
                                                <div className="text-center py-12">
                                                    <IconMapPin className="w-10 h-10 text-[#a0a0b8] mx-auto mb-3 opacity-40" />
                                                    <p className="text-sm text-[#a0a0b8]">Selecione um espaço ao lado</p>
                                                </div>
                                            ) : !selectedDate ? (
                                                <div className="text-center py-12">
                                                    <IconCalendar className="w-10 h-10 text-[#a0a0b8] mx-auto mb-3 opacity-40" />
                                                    <p className="text-sm text-[#a0a0b8]">Selecione uma data</p>
                                                </div>
                                            ) : slotsLoading ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <div className="flex gap-2">
                                                        <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                                                        <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                                                        <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                                                    </div>
                                                </div>
                                            ) : slots.length === 0 ? (
                                                <div className="text-center py-8">
                                                    {slotsMessage && slotsMessage.includes('bloqueio') ? (
                                                        <>
                                                            <div className="w-14 h-14 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-3">
                                                                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            </div>
                                                            <p className="text-sm text-red-400 font-medium">{slotsMessage}</p>
                                                            {blockInfo.length > 0 && (
                                                                <div className="mt-3 flex flex-col gap-1.5 max-w-xs mx-auto">
                                                                    {blockInfo.map((b, i) => (
                                                                        <div key={i} className="bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2 text-xs text-[#a0a0b8]">
                                                                            <span className="text-red-400 font-medium">Bloqueado</span>: {new Date(b.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {new Date(b.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                            {b.motivo && <> ({b.motivo})</>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : slotsMessage && slotsMessage.includes('funcionamos') ? (
                                                        <>
                                                            <div className="w-14 h-14 rounded-full bg-yellow-400/10 flex items-center justify-center mx-auto mb-3">
                                                                <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            </div>
                                                            <p className="text-sm text-yellow-400 font-medium">{slotsMessage}</p>
                                                            {businessHours && (
                                                                <p className="text-xs text-[#a0a0b8] mt-2">
                                                                    Funcionamos {businessHours.inicio} às {businessHours.fim} em dias úteis.
                                                                </p>
                                                            )}
                                                        </>
                                                    ) : slotsMessage && slotsMessage.includes('ocupados') ? (
                                                        <>
                                                            <div className="w-14 h-14 rounded-full bg-orange-400/10 flex items-center justify-center mx-auto mb-3">
                                                                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                            </div>
                                                            <p className="text-sm text-orange-400 font-medium">{slotsMessage}</p>
                                                            <p className="text-xs text-[#a0a0b8] mt-2">Tente outra data ou escolha outro espaço.</p>
                                                        </>
                                                    ) : slotsMessage ? (
                                                        <div className="text-center py-8">
                                                            <IconCalendar className="w-10 h-10 text-[#a0a0b8] mx-auto mb-3 opacity-40" />
                                                            <p className="text-sm text-[#a0a0b8]">{slotsMessage}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12">
                                                            <IconCalendar className="w-10 h-10 text-[#a0a0b8] mx-auto mb-3 opacity-40" />
                                                            <p className="text-sm text-[#a0a0b8]">Nenhum horário disponível nesta data</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    {blockInfo.length > 0 && (
                                                        <div className="mb-4 p-3 bg-red-400/5 border border-red-400/10 rounded-lg">
                                                            <p className="text-xs text-red-400 font-medium mb-1.5">
                                                                <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                Períodos bloqueados neste dia
                                                            </p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {blockInfo.map((b, i) => (
                                                                    <span key={i} className="text-xs bg-red-400/10 text-red-400 px-2 py-0.5 rounded">
                                                                        {new Date(b.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}—{new Date(b.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        {b.motivo && <> ({b.motivo})</>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
                                                        {slots.map((slot, idx) => {
                                                            const inicio = new Date(slot.dataInicio);
                                                            const fim = new Date(slot.dataFim);
                                                            const slotTime = inicio.getTime();
                                                            const isSelected = selectedSlots.some(s => new Date(s.dataInicio).getTime() === slotTime);
                                                            return (
                                                                <motion.button
                                                                    key={idx}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: idx * 0.03 }}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => {
                                                                        setSelectedSlots(prev => {
                                                                            if (prev.some(s => new Date(s.dataInicio).getTime() === slotTime)) {
                                                                                return prev.filter(s => new Date(s.dataInicio).getTime() !== slotTime);
                                                                            }
                                                                            return [...prev, slot];
                                                                        });
                                                                    }}
                                                                    className={`py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border ${
                                                                        isSelected
                                                                            ? 'bg-rocket-green/20 text-rocket-green border-rocket-green/40 shadow-lg shadow-rocket-green/10'
                                                                            : 'bg-white/[0.04] text-[#a0a0b8] hover:text-white hover:bg-white/[0.08] border-white/[0.06]'
                                                                    }`}
                                                                >
                                                                    {inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    <span className="block text-xs opacity-60">
                                                                        {fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </motion.button>
                                                            );
                                                        })}
                                                    </div>

                                                    {selectedSlots.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="bg-rocket-green/[0.06] border border-rocket-green/20 rounded-xl p-5 flex flex-col gap-4"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm text-white font-medium">
                                                                        {espacos.find(e => e.id === parseInt(selectedSpaceId))?.nome}
                                                                    </p>
                                                                    <p className="text-xs text-[#a0a0b8] mt-0.5">
                                                                        {new Date(selectedSlots[0].dataInicio).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                                    </p>
                                                                </div>
                                                                <span className="text-xs font-medium text-rocket-green bg-rocket-green/10 px-3 py-1 rounded-full">
                                                                    {selectedSlots.length} horário{selectedSlots.length !== 1 ? 's' : ''} selecionado{selectedSlots.length !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedSlots
                                                                    .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
                                                                    .map((slot, i) => (
                                                                        <span key={i} className="text-xs bg-rocket-purple/20 text-rocket-purple-light px-2.5 py-1 rounded-full">
                                                                            {new Date(slot.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                            {' — '}
                                                                            {new Date(slot.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    ))}
                                                            </div>
                                                            <Btn onClick={criarAgendamento} disabled={bookingLoading}>
                                                                {bookingLoading ? (
                                                                    <span className="flex gap-1.5">
                                                                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                                                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                                                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                                                    </span>
                                                                ) : (
                                                                    <>Confirmar Agendamento</>
                                                                )}
                                                            </Btn>
                                                        </motion.div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'perfil' && (
                            <motion.div key="perfil" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto space-y-6">
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-full bg-rocket-purple/20 flex items-center justify-center text-2xl font-bold text-rocket-purple-light">
                                            {cliente?.nome ? cliente.nome.charAt(0).toUpperCase() + (cliente.nome.split(' ')[1]?.[0]?.toUpperCase() || '') : 'C'}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{cliente?.nome || 'Cliente'}</h2>
                                            <p className="text-sm text-[#a0a0b8]">Cliente</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium flex items-center gap-2"><IconUser className="w-4 h-4" /> Nome</label>
                                            <input type="text" value={profileNome} onChange={e => setProfileNome(e.target.value)}
                                                className="glass-input rounded-lg px-3 py-2.5 text-white text-sm w-full focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium flex items-center gap-2"><IconPhone className="w-4 h-4" /> Telefone</label>
                                            <PhoneInput
                                                value={profilePhoneState}
                                                onChange={setProfilePhoneState}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium flex items-center gap-2"><IconMail className="w-4 h-4" /> Email</label>
                                            <input type="email" value={cliente?.email || ''} disabled
                                                className="glass-input rounded-lg px-3 py-2.5 text-[#a0a0b8] text-sm w-full opacity-60 cursor-not-allowed" />
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><IconKey className="w-5 h-5 text-rocket-purple-light" /> Alterar Senha</h3>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium">Senha Atual</label>
                                            <input type="password" placeholder="••••••••" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                                                className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium">Nova Senha</label>
                                            <input type="password" placeholder="••••••••" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                                                className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple transition-all" />
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><IconGoogle className="w-5 h-5 text-rocket-purple-light" /> Google Calendar</h3>
                                    {isGoogleConnected ? (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-white">Conectado ao Google Calendar</p>
                                                {googleEmail && (
                                                    <p className="text-xs text-rocket-purple-light mt-0.5 font-medium">{googleEmail}</p>
                                                )}
                                                <p className="text-xs text-[#a0a0b8] mt-0.5">
                                                    Seus agendamentos aparecerão no seu calendário automaticamente.
                                                </p>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={desconectarGoogle}
                                                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20"
                                            >
                                                <IconGoogle className="w-4 h-4" />
                                                Desconectar
                                            </motion.button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-sm text-[#a0a0b8]">
                                                Conecte seu Google Agenda para receber os agendamentos automaticamente no seu calendário. Siga os passos:
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                {[
                                                    { num: '1', text: 'Clique em "Conectar Google Agenda" abaixo' },
                                                    { num: '2', text: 'Escolha sua conta do Google' },
                                                    { num: '3', text: 'Permita o acesso ao Google Calendar' },
                                                    { num: '4', text: 'Pronto! Seus agendamentos aparecerão no calendário' }
                                                ].map((passo) => (
                                                    <div key={passo.num} className="flex items-start gap-3">
                                                        <div className="w-7 h-7 rounded-full bg-rocket-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <span className="text-xs font-bold text-rocket-purple-light">{passo.num}</span>
                                                        </div>
                                                        <p className="text-sm text-white">{passo.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={conectarGoogle}
                                                className="w-full text-white shadow-lg py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border-none flex items-center justify-center gap-2"
                                                style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130,87,229,0.3)' }}
                                            >
                                                <IconGoogle className="w-4 h-4" />
                                                Conectar Google Agenda
                                            </motion.button>
                                        </div>
                                    )}
                                </motion.div>

                                <div className="flex justify-end">
                                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={salvarPerfil}
                                        className="text-white shadow-lg px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 border-none"
                                        style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130,87,229,0.3)' }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 6L9 17l-5-5" /></svg>
                                        Salvar Alterações
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            <ConfirmDialog open={confirm.open} message={confirm.message}
                onConfirm={confirm.onConfirm}
                onCancel={() => setConfirm({ open: false, message: '', onConfirm: null })}
            />

            {/* Modal de configuração inicial (onboarding) */}
            <AnimatePresence>
                {showOnboarding && onboardingSteps.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 24 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            className="glass-card rounded-2xl w-full max-w-md relative overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 pt-6 pb-5 border-b border-white/[0.06]">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-rocket-purple-light uppercase tracking-wider">
                                        Configure sua conta
                                    </span>
                                    <button
                                        onClick={dismissOnboarding}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a0a0b8] hover:text-white hover:bg-white/10 transition-all cursor-pointer bg-transparent border-none"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                {/* Progress dots */}
                                {onboardingSteps.length > 1 && (
                                    <div className="flex items-center gap-2 mt-3">
                                        {onboardingSteps.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === onboardingStep ? 'w-6 bg-rocket-purple' : i < onboardingStep ? 'w-3 bg-rocket-purple/50' : 'w-3 bg-white/10'}`} />
                                        ))}
                                        <span className="text-xs text-[#a0a0b8] ml-1">{onboardingStep + 1} de {onboardingSteps.length}</span>
                                    </div>
                                )}
                            </div>

                            {/* Step: phone */}
                            {onboardingSteps[onboardingStep] === 'phone' && (
                                <div className="px-6 py-6">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                                            <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white">Adicione seu WhatsApp</h3>
                                            <p className="text-sm text-[#a0a0b8] mt-0.5">Receba confirmações e lembretes dos seus agendamentos</p>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 mb-5">
                                        {['Confirmação imediata ao agendar', 'Lembrete 1 dia antes', 'Aviso 1 hora antes do horário'].map(item => (
                                            <li key={item} className="flex items-center gap-2.5 text-sm text-[#c0c0d8]">
                                                <svg className="w-4 h-4 text-[#25D366] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <PhoneInput
                                        value={onboardingPhoneState}
                                        onChange={setOnboardingPhoneState}
                                        placeholder="(DDD) 99999-9999"
                                    />
                                    <div className="flex gap-2 mt-4">
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                            onClick={nextOnboardingStep}
                                            className="flex-1 text-sm text-[#a0a0b8] hover:text-white py-2.5 rounded-lg transition-colors cursor-pointer bg-white/5 hover:bg-white/10 border-none">
                                            Pular
                                        </motion.button>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                            onClick={async () => {
                                                const num = onboardingPhoneState.number;
                                                if (!num || num.replace(/\D/g, '').length < 10) return showToast('Informe um número válido.', 'warning');
                                                setSavingOnboardingPhone(true);
                                                try {
                                                    const tel = toE164National(onboardingPhoneState.ddi, num);
                                                    await api.put('/auth/alterar-dados-cliente', { telefone: tel });
                                                    setProfilePhoneState({ ddi: onboardingPhoneState.ddi, number: num });
                                                    const stored = JSON.parse(localStorage.getItem('cliente') || '{}');
                                                    stored.telefone = tel;
                                                    localStorage.setItem('cliente', JSON.stringify(stored));
                                                    showToast('WhatsApp salvo!', 'success');
                                                    nextOnboardingStep();
                                                } catch {
                                                    showToast('Erro ao salvar número.', 'error');
                                                } finally {
                                                    setSavingOnboardingPhone(false);
                                                }
                                            }}
                                            disabled={savingOnboardingPhone}
                                            className="flex-1 text-white font-medium py-2.5 rounded-lg transition-all duration-200 cursor-pointer border-none disabled:opacity-50"
                                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)' }}>
                                            {savingOnboardingPhone ? 'Salvando...' : onboardingSteps.length > 1 ? 'Salvar e continuar →' : 'Salvar'}
                                        </motion.button>
                                    </div>
                                </div>
                            )}

                            {/* Step: google */}
                            {onboardingSteps[onboardingStep] === 'google' && (
                                <div className="px-6 py-6">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-rocket-purple/15 flex items-center justify-center shrink-0">
                                            <IconGoogle className="w-6 h-6 text-rocket-purple-light" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white">Conecte o Google Agenda</h3>
                                            <p className="text-sm text-[#a0a0b8] mt-0.5">Seus agendamentos aparecem automaticamente no calendário</p>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 mb-6">
                                        {['Agendamentos sincronizados em tempo real', 'Funciona no Google Calendar e no celular', 'Cancelamentos removem o evento automaticamente'].map(item => (
                                            <li key={item} className="flex items-center gap-2.5 text-sm text-[#c0c0d8]">
                                                <svg className="w-4 h-4 text-rocket-purple-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                        onClick={() => { dismissOnboarding(); conectarGoogle(); }}
                                        className="w-full flex items-center justify-center gap-2.5 text-white font-medium py-3 rounded-xl transition-all duration-200 cursor-pointer border-none mb-2"
                                        style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 4px 20px rgba(130,87,229,0.3)' }}>
                                        <IconGoogle className="w-5 h-5" />
                                        Conectar Google Agenda
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                        onClick={dismissOnboarding}
                                        className="w-full text-sm text-[#a0a0b8] hover:text-white py-2.5 rounded-lg transition-colors cursor-pointer bg-transparent hover:bg-white/5 border-none">
                                        Concluir sem conectar
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AIAssistant userRole="client" />
        </div>
    );
}

export default ClientDashboard;
