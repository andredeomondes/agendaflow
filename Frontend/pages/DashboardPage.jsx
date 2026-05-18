'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPlus, IconTrash, IconUsers, IconMapPin, IconBlock, IconSettings, IconCalendar, IconCheck, IconEdit, IconChart, IconUser, IconMenu, IconKey, IconMail, IconPhone, IconGoogle, IconLogOut2, IconChevronLeft } from '../components/Icons';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getWhatsAppLink, formatNationalPhone, toE164National, DEFAULT_DDI, phoneNationalDigitsChain } from '../utils/phone';
import PhoneInput from '../components/PhoneInput';
import Header from '../components/Header';
import CalendarView from '../components/CalendarView';
import EventModal from '../components/EventModal';
import AppointmentModal from '../components/AppointmentModal';
import EditModal from '../components/EditModal';
import { CardSkeleton, TableSkeleton, ListSkeleton } from '../components/SkeletonLoader';
import ConfirmDialog from '../components/ConfirmDialog';
import AIAssistant from '../components/AIAssistant';
import AIInsights from '../components/AIInsights';
import WhatsAppQRCode from '../components/WhatsAppQRCode';

function DashboardPage({ user, token, onLogout }) {
    const showToast = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Client form
    const [clientes, setClientes] = useState([]);
    const [nome, setNome] = useState('');
    const [phoneState, setPhoneState] = useState({ ddi: DEFAULT_DDI, number: '' });
    const [email, setEmail] = useState('');
    const [clienteBusca, setClienteBusca] = useState('');

    // Space form
    const [espacos, setEspacos] = useState([]);
    const [nomeEspaco, setNomeEspaco] = useState('');
    const [capacidade, setCapacidade] = useState('');

    // Appointment form
    const [agendamentos, setAgendamentos] = useState([]);

    // Block form
    const [bloqueios, setBloqueios] = useState([]);
    const [motivoBloqueio, setMotivoBloqueio] = useState('');
    const [espacoBloqueioId, setEspacoBloqueioId] = useState('');
    const [dataInicioBloqueio, setDataInicioBloqueio] = useState('');
    const [dataFimBloqueio, setDataFimBloqueio] = useState('');

    // Config
    const [config, setConfig] = useState({ horaInicio: '08:00', horaFim: '18:00', intervaloEntreAtend: 15, diasFuncionamento: '1,2,3,4,5' });
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [googleEmail, setGoogleEmail] = useState(null);
    const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);

    // Profile
    const [profileNome, setProfileNome] = useState(user?.nome || '');
    const [profileEmail, setProfileEmail] = useState(user?.email || '');
    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');

    // Loading
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [dayEvents, setDayEvents] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editModal, setEditModal] = useState({ open: false, type: '', data: {} });
    const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null });
    const [bloqueioConflitos, setBloqueioConflitos] = useState(null);

    const buscarDados = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [resClientes, resEspacos, resAgendamentos, resBloqueios, resConfig, resGoogle, resWpp] = await Promise.all([
                api.get('/clientes'), api.get('/espacos'), api.get('/agendamentos'),
                api.get('/bloqueios'), api.get('/config'), api.get('/google/status'),
                api.get('/whatsapp/status').catch(() => ({ data: { status: 'disconnected' } }))
            ]);
            setClientes(resClientes.data || []);
            setEspacos(resEspacos.data || []);
            setAgendamentos(resAgendamentos.data || []);
            setBloqueios(resBloqueios.data || []);
            if (resConfig.data) setConfig(resConfig.data);
            setIsGoogleConnected(resGoogle.data.connected);
            setGoogleEmail(resGoogle.data.email || null);
            setIsWhatsAppConnected(resWpp.data.status === 'connected');
        } catch (error) {
            if (error.response?.status === 401) onLogout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        buscarDados();
        const params = new URLSearchParams(window.location.search);
        if (params.has('google')) {
            const status = params.get('google');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            setTimeout(() => buscarDados(), 500);
            if (status === 'connected') showToast('Google Agenda conectado com sucesso!', 'success');
            else if (status === 'error') showToast('Erro ao conectar Google Agenda.', 'error');
            else if (status === 'no_refresh_token') showToast('Revogue o acesso no Google e tente novamente.', 'warning');
        }
    }, [token]);

    const conectarGoogle = async () => {
        try {
            const res = await api.get('/google/connect');
            if (res.data.url) window.location.href = res.data.url;
            else if (res.data.connected) { showToast(res.data.message, "success"); setIsGoogleConnected(true); }
        } catch (error) {
            showToast(error.response?.data?.erro || "Erro ao conectar com Google Agenda.", "error");
        }
    };

    const desconectarGoogle = async () => {
        try {
            await api.post('/google/disconnect');
            showToast("Google Calendar desconectado!", "success");
            setIsGoogleConnected(false);
        } catch (e) { showToast("Erro ao desconectar Google Calendar", "error"); }
    };

    // --- CLIENTES ---
    const telefoneParaSalvar = toE164National(phoneState.ddi, phoneState.number);

    const salvarCliente = async () => {
        if (!nome || !phoneState.number || !email) return showToast("Preencha todos os campos!", "warning");

        const phoneValidation = phoneNationalDigitsChain.safeParse(phoneState.number);
        if (!phoneValidation.success)
            return showToast(phoneValidation.error.issues[0].message || "Telefone inválido.", "warning");

        try { await api.post('/clientes', { nome, telefone: telefoneParaSalvar, email }); setNome(''); setPhoneState({ ddi: DEFAULT_DDI, number: '' }); setEmail(''); showToast("Cliente adicionado!", "success"); buscarDados(); }
        catch (e) { showToast("Erro ao salvar cliente.", "error"); }
    };

    const editarCliente = async () => {
        try {
            await api.patch(`/clientes/${editModal.data.id}`, editModal.data);
            setEditModal({ open: false, type: '', data: {} });
            showToast("Cliente atualizado!", "success");
            buscarDados();
        } catch (e) { showToast("Erro ao editar cliente.", "error"); }
    };

    const abrirEdicaoCliente = (cliente) => {
        const formattedNumber = formatNationalPhone(cliente.telefone);
        setEditModal({ open: true, type: 'cliente', data: {
            id: cliente.id,
            nome: cliente.nome,
            telefone: formattedNumber,
            email: cliente.email,
        }});
    };

    // --- ESPAÇOS ---
    const salvarEspaco = async () => {
        if (!nomeEspaco || !capacidade) return showToast("Preencha Nome e Capacidade!", "warning");
        try { await api.post('/espacos', { nome: nomeEspaco, capacidade: parseInt(capacidade) }); setNomeEspaco(''); setCapacidade(''); showToast("Espaço criado!", "success"); buscarDados(); }
        catch (e) { showToast("Erro ao salvar espaço.", "error"); }
    };

    const editarEspaco = async () => {
        try {
            await api.patch(`/espacos/${editModal.data.id}`, editModal.data);
            setEditModal({ open: false, type: '', data: {} });
            showToast("Espaço atualizado!", "success");
            buscarDados();
        } catch (e) { showToast("Erro ao editar espaço.", "error"); }
    };

    const abrirEdicaoEspaco = (espaco) => {
        setEditModal({ open: true, type: 'espaco', data: { id: espaco.id, nome: espaco.nome, capacidade: espaco.capacidade || '' } });
    };

    // --- AGENDAMENTOS ---
    const atualizarStatus = async () => {
        if (!selectedEvent || !newStatus || selectedEvent.type === 'bloqueio') return;
        try { await api.patch(`/agendamentos/${selectedEvent.id}/status`, { status: newStatus }); setSelectedEvent(null); showToast("Status atualizado!", "success"); buscarDados(); }
        catch (e) { showToast("Erro ao atualizar status.", "error"); }
    };

    // --- BLOQUEIOS ---
    const salvarBloqueio = async (cancelOverlapping) => {
        if (!espacoBloqueioId || !dataInicioBloqueio || !dataFimBloqueio) return showToast("Preencha todos os campos!", "warning");
        try {
            const payload = { spaceId: parseInt(espacoBloqueioId), dataInicio: dataInicioBloqueio, dataFim: dataFimBloqueio, motivo: motivoBloqueio };
            if (cancelOverlapping) payload.cancelOverlapping = true;
            const res = await api.post('/bloqueios', payload);
            setEspacoBloqueioId(''); setDataInicioBloqueio(''); setDataFimBloqueio(''); setMotivoBloqueio('');
            showToast("Horário bloqueado!", "success");
            buscarDados();
        } catch (e) {
            if (e.response?.status === 409 && e.response?.data?.conflitos) {
                const conflitos = e.response.data.conflitos;
                setBloqueioConflitos(conflitos);
            } else {
                showToast("Erro ao salvar bloqueio.", "error");
            }
        }
    };

    const editarBloqueio = async () => {
        try {
            await api.patch(`/bloqueios/${editModal.data.id}`, editModal.data);
            setEditModal({ open: false, type: '', data: {} });
            showToast("Bloqueio atualizado!", "success");
            buscarDados();
        } catch (e) { showToast("Erro ao editar bloqueio.", "error"); }
    };

    const abrirEdicaoBloqueio = (bloqueio) => {
        const dataInicio = bloqueio.dataInicio ? bloqueio.dataInicio.slice(0, 16) : '';
        const dataFim = bloqueio.dataFim ? bloqueio.dataFim.slice(0, 16) : '';
        setEditModal({
            open: true, type: 'bloqueio', data: {
                id: bloqueio.id, spaceId: bloqueio.spaceId || '',
                dataInicio, dataFim, motivo: bloqueio.motivo || ''
            }
        });
    };

    // --- CONFIG ---
    const salvarConfiguracoes = async () => {
        try { await api.put('/config', { ...config, id: config.id || 1 }); showToast("Configurações atualizadas!", "success"); buscarDados(); }
        catch (e) { showToast("Erro ao salvar configurações.", "error"); }
    };

    // --- PERFIL ---
    const salvarPerfil = async () => {
        try {
            const payload = {};
            if (profileNome !== user?.nome) payload.nome = profileNome;
            if (senhaAtual && novaSenha) {
                payload.senhaAtual = senhaAtual;
                payload.novaSenha = novaSenha;
            }
            if (Object.keys(payload).length === 0) return showToast("Nenhuma alteração para salvar.", "warning");
            await api.patch(`/auth/perfil`, payload);
            showToast("Perfil atualizado!", "success");
            setSenhaAtual('');
            setNovaSenha('');
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            if (payload.nome) {
                stored.nome = payload.nome;
                localStorage.setItem('user', JSON.stringify(stored));
            }
        } catch (e) { showToast(e.response?.data?.erro || "Erro ao atualizar perfil.", "error"); }
    };

    // --- CONFIRM ---
    const showConfirm = (message, onConfirm) => {
        setConfirm({ open: true, message, onConfirm: () => { setConfirm({ open: false, message: '', onConfirm: null }); onConfirm(); } });
    };

    // --- DELETE ---
    const handleDelete = (endpoint, id) => {
        showConfirm("Deseja realmente excluir este registro?", async () => {
            try { await api.delete(`/${endpoint}/${id}`); showToast("Registro excluído!", "success"); buscarDados(); } catch (e) { showToast("Erro ao excluir.", "error"); }
        });
    };

    const tabs = [
        { key: 'dashboard', label: 'Dashboard', icon: IconChart },
        { key: 'agendamentos', label: 'Agendamentos', icon: IconCalendar },
        { key: 'clientes', label: 'Clientes', icon: IconUsers },
        { key: 'espacos', label: 'Espaços', icon: IconMapPin },
        { key: 'bloqueios', label: 'Bloqueios', icon: IconBlock },
        { key: 'perfil', label: 'Meu Perfil', icon: IconUser },
        { key: 'configuracoes', label: 'Configurações', icon: IconSettings },
    ];

    const Btn = ({ onClick, children, color = 'green', className = '' }) => {
        const colors = {
            green: 'text-white shadow-lg',
            red: 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20',
            ghost: 'bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white border border-white/[0.08] hover:border-white/[0.15]',
        };
        return (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClick}
                className={`${colors[color]} px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${className}`}
                style={color === 'green' ? { background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130,87,229,0.3)', border: 'none' } : {}}>
                {children}
            </motion.button>
        );
    };

    const Input = ({ type = 'text', placeholder, value, onChange, className = '' }) => (
        <input type={type} placeholder={placeholder} value={value} onChange={onChange}
            className={`glass-input rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all ${className}`} />
    );

    const Select = ({ value, onChange, children, className = '' }) => (
        <select value={value} onChange={onChange}
            className={`glass-input rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all ${className}`}>
            {children}
        </select>
    );

    const Table = ({ data, columns, onEdit }) => (
        <div className="responsive-table overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm text-left">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        {columns.map(col => <th key={col.id} className="py-3 px-4 text-[#a0a0b8] font-medium uppercase tracking-wider text-xs">{col.name}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            {columns.map(col => (
                                <td key={col.id} className="py-3 px-4">{col.template ? col.template(item) : item[col.id]}</td>
                            ))}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={columns.length} className="py-12 text-center text-[#a0a0b8]">Nenhum registro encontrado</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const editModalConfig = () => {
        if (editModal.type === 'cliente') return {
            title: 'Editar Cliente',
            fields: [
                { key: 'nome', label: 'Nome', type: 'text' },
                { key: 'telefone', label: 'Telefone', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
            ],
            onSave: editarCliente
        };
        if (editModal.type === 'espaco') return {
            title: 'Editar Espaço',
            fields: [
                { key: 'nome', label: 'Nome', type: 'text' },
                { key: 'capacidade', label: 'Capacidade', type: 'number' },
            ],
            onSave: editarEspaco
        };
        if (editModal.type === 'bloqueio') return {
            title: 'Editar Bloqueio',
            fields: [
                { key: 'spaceId', label: 'Espaço', type: 'select', options: espacos.map(e => ({ value: e.id, label: e.nome })) },
                { key: 'dataInicio', label: 'Data/Hora Início', type: 'datetime-local' },
                { key: 'dataFim', label: 'Data/Hora Fim', type: 'datetime-local' },
                { key: 'motivo', label: 'Motivo', type: 'text' },
            ],
            onSave: editarBloqueio
        };
        return null;
    };

    const hoje = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen text-[#e1e1e6] font-inter relative overflow-hidden" style={{ background: '#120F17' }}>


            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-40 h-full w-64 glass border-r border-white/[0.06] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-7 h-7 text-rocket-purple-light" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="6" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
                                <path d="M8 2V10M24 2V10M6 14H26M6 20H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                <circle cx="24" cy="24" r="6" fill="currentColor" className="text-rocket-purple" />
                                <path d="M22 24L23.5 25.5L26 22" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-lg font-bold text-white">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#a0a0b8] hover:text-white cursor-pointer bg-transparent border-none">
                            <IconChevronLeft className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Admin info */}
                    <div className="px-5 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rocket-purple/20 flex items-center justify-center text-sm font-bold text-rocket-purple-light shrink-0">
                                {user?.nome ? user.nome.charAt(0).toUpperCase() + (user.nome.split(' ')[1]?.[0]?.toUpperCase() || '') : 'A'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate text-white">{user?.nome || 'Administrador'}</p>
                                <p className="text-xs text-[#a0a0b8] truncate">{user?.email || ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Nav */}
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

                    {/* Logout */}
                    <div className="px-3 py-3 border-t border-white/[0.06]">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all duration-200 cursor-pointer border-none"
                        >
                            <IconLogOut2 className="w-5 h-5 shrink-0" />
                            <span>Sair</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:ml-64 min-h-screen">
                <Header
                    user={user}
                    isGoogleConnected={isGoogleConnected}
                    onConnectGoogle={conectarGoogle}
                    onLogout={onLogout}
                    isWhatsAppConnected={isWhatsAppConnected}
                    onGoToWhatsApp={() => { setIsWhatsAppConnected(false); setActiveTab('perfil'); }}
                />

                {/* Mobile hamburger */}
                <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-[#a0a0b8] hover:text-white cursor-pointer bg-transparent border-none"
                    >
                        <IconMenu className="w-6 h-6" />
                    </button>
                    <span className="text-sm font-medium text-[#a0a0b8]">{tabs.find(t => t.key === activeTab)?.label || 'Dashboard'}</span>
                    <div className="w-6" />
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            {/* === DASHBOARD === */}
                            {activeTab === 'dashboard' && (
                                <div className="space-y-6">
                                    {loading ? (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div className="glass-card rounded-xl p-5"><ListSkeleton items={3} /></div>
                                                <div className="glass-card rounded-xl p-5"><ListSkeleton items={2} /></div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Clientes', value: clientes.length, icon: IconUsers, color: '#6366f1' },
                                            { label: 'Espaços', value: espacos.length, icon: IconMapPin, color: '#f59e0b' },
                                            { label: 'Agendamentos Hoje', value: agendamentos.filter(a => {
                                                const hoje = new Date(); return new Date(a.dataInicio).toDateString() === hoje.toDateString() && a.status !== 'Cancelado';
                                            }).length, icon: IconCalendar, color: '#04d361' },
                                            { label: 'Ativos (7 dias)', value: agendamentos.filter(a => {
                                                const semana = new Date(Date.now() + 7*86400000); const d = new Date(a.dataInicio);
                                                return d <= semana && d >= new Date() && a.status !== 'Cancelado' && a.status !== 'Concluído';
                                            }).length, icon: IconChart, color: '#8257e5' },
                                        ].map((card, i) => {
                                            const Icon = card.icon;
                                            return (
                                                <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                                    className="glass-card rounded-xl p-5 hover:border-rocket-purple/30 transition-all duration-300">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</span>
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                                                            <Icon className="w-5 h-5" style={{ color: card.color }} />
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-[#a0a0b8]">{card.label}</p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="glass-card rounded-xl p-5">
                                            <h3 className="text-sm font-semibold text-[#a0a0b8] uppercase tracking-wider mb-4">Próximos Agendamentos</h3>
                                            {agendamentos.filter(a => {
                                                const d = new Date(a.dataInicio);
                                                return d >= new Date() && a.status !== 'Cancelado' && a.status !== 'Concluído';
                                            }).sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio)).slice(0, 5).length === 0 ? (
                                                <p className="text-sm text-[#a0a0b8] text-center py-8">Nenhum agendamento futuro</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {agendamentos.filter(a => {
                                                        const d = new Date(a.dataInicio);
                                                        return d >= new Date() && a.status !== 'Cancelado' && a.status !== 'Concluído';
                                                    }).sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio)).slice(0, 5).map((appt, i) => (
                                                        <motion.div key={appt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                                            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-rocket-purple-light" style={{ backgroundColor: '#8257e515' }}>
                                                                {new Date(appt.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{appt.client?.nome} — {appt.space?.nome}</p>
                                                                <p className="text-xs text-[#a0a0b8]">{new Date(appt.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                                appt.status === 'Confirmado' ? 'text-[#04d361] bg-[#04d36115]' :
                                                                appt.status === 'Pendente' ? 'text-[#f59e0b] bg-[#f59e0b15]' :
                                                                appt.status === 'Agendado' ? 'text-[#6366f1] bg-[#6366f115]' :
                                                                'text-[#a0a0b8] bg-white/[0.05]'
                                                            }`}>{appt.status}</span>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="glass-card rounded-xl p-5">
                                            <h3 className="text-sm font-semibold text-[#a0a0b8] uppercase tracking-wider mb-4">Bloqueios Ativos</h3>
                                            {bloqueios.filter(b => new Date(b.dataFim) > new Date()).length === 0 ? (
                                                <p className="text-sm text-[#a0a0b8] text-center py-8">Nenhum bloqueio ativo</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {bloqueios.filter(b => new Date(b.dataFim) > new Date()).map((bl, i) => (
                                                        <motion.div key={bl.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                                            className="flex items-center gap-3 p-3 rounded-lg bg-red-400/[0.04] hover:bg-red-400/[0.08] transition-colors border border-red-400/10">
                                                            <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{bl.space?.nome} {bl.motivo ? `— ${bl.motivo}` : ''}</p>
                                                                <p className="text-xs text-[#a0a0b8]">{new Date(bl.dataInicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} até {new Date(bl.dataFim).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <AIInsights />
                                    </>
                                    )}
                                </div>
                            )}

                            {/* === CLIENTES === */}
                            {activeTab === 'clientes' && (
                                <div className="glass-card rounded-xl p-6">
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        <Input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} className="flex-1 min-w-[140px]" />
                                        <PhoneInput
                                            value={phoneState}
                                            onChange={setPhoneState}
                                            className="flex-1 min-w-[140px]"
                                        />
                                        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 min-w-[180px]" />
                                        <Btn onClick={salvarCliente}><IconPlus className="w-4 h-4" /> Adicionar</Btn>
                                    </div>
                                    {/* Busca */}
                                    <div className="relative mb-4">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0b8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Buscar por nome, telefone ou email..."
                                            value={clienteBusca}
                                            onChange={e => setClienteBusca(e.target.value)}
                                            className="glass-input w-full rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all"
                                        />
                                        {clienteBusca && (
                                            <button onClick={() => setClienteBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0b8] hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        )}
                                    </div>
                                    {loading ? (
                                        <TableSkeleton rows={4} cols={3} />
                                    ) : (
                                    <>
                                    {clienteBusca && (
                                        <p className="text-xs text-[#a0a0b8] mb-3">
                                            {clientes.filter(c => {
                                                const q = clienteBusca.toLowerCase();
                                                return c.nome?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.telefone?.includes(q);
                                            }).length} resultado(s) para "{clienteBusca}"
                                        </p>
                                    )}
                                    <Table data={clientes.filter(c => {
                                        if (!clienteBusca) return true;
                                        const q = clienteBusca.toLowerCase();
                                        const digits = clienteBusca.replace(/\D/g, '');
                                        return c.nome?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || (digits.length > 0 && c.telefone?.replace(/\D/g, '').includes(digits));
                                    })} columns={[
                                        { id: 'nome', name: 'Nome' },
                                        {
                                            id: 'telefone', name: 'Telefone', template: (item) => {
                                                const wpp = getWhatsAppLink(item.telefone);
                                                return (
                                                    <span className="flex items-center gap-1.5">
                                                        <span>{formatNationalPhone(item.telefone)}</span>
                                                        {wpp && (
                                                            <a href={wpp} target="_blank" rel="noopener noreferrer"
                                                                className="text-[#25D366] hover:text-green-400 transition-colors"
                                                                title="Abrir WhatsApp">
                                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                                </svg>
                                                            </a>
                                                        )}
                                                    </span>
                                                );
                                            }
                                        },
                                        { id: 'email', name: 'Email' },
                                        {
                                            id: 'acoes', name: 'Ações', template: (item) => (
                                                <div className="flex gap-2">
                                                    <Btn onClick={() => abrirEdicaoCliente(item)} color="ghost">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Editar
                                                    </Btn>
                                                    <Btn onClick={() => handleDelete('clientes', item.id)} color="red">
                                                        <IconTrash className="w-4 h-4" />
                                                    </Btn>
                                                </div>
                                            )
                                        }
                                    ]} onEdit />
                                    </>
                                    )}
                                </div>
                            )}

                            {/* === ESPAÇOS === */}
                            {activeTab === 'espacos' && (
                                <div className="glass-card rounded-xl p-6">
                                    <div className="flex flex-wrap gap-3 mb-6">
                                        <Input placeholder="Nome (Ex: Sala 01)" value={nomeEspaco} onChange={e => setNomeEspaco(e.target.value)} className="flex-1 min-w-[160px]" />
                                        <Input type="number" placeholder="Capacidade" value={capacidade} onChange={e => setCapacidade(e.target.value)} className="w-24 sm:w-32" />
                                        <Btn onClick={salvarEspaco}><IconPlus className="w-4 h-4" /> Criar</Btn>
                                    </div>
                                    {loading ? (
                                        <TableSkeleton rows={3} cols={2} />
                                    ) : (
                                    <Table data={espacos} columns={[
                                        { id: 'nome', name: 'Nome' },
                                        { id: 'capacidade', name: 'Capacidade' },
                                        {
                                            id: 'acoes', name: 'Ações', template: (item) => (
                                                <div className="flex gap-2">
                                                    <Btn onClick={() => abrirEdicaoEspaco(item)} color="ghost">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Editar
                                                    </Btn>
                                                    <Btn onClick={() => handleDelete('espacos', item.id)} color="red">
                                                        <IconTrash className="w-4 h-4" />
                                                    </Btn>
                                                </div>
                                            )
                                        }
                                    ]} />
                                    )}
                                </div>
                            )}

                            {/* === BLOQUEIOS === */}
                            {activeTab === 'bloqueios' && (
                                <div className="glass-card rounded-xl p-4 sm:p-6">
                                    <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-black/30 rounded-lg p-4">
                                        <div>
                                            <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">Espaço</label>
                                            <Select value={espacoBloqueioId} onChange={e => setEspacoBloqueioId(e.target.value)} className="w-full">
                                                <option value="">Selecione</option>
                                                {espacos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">Início</label>
                                            <input type="datetime-local" value={dataInicioBloqueio} onChange={e => setDataInicioBloqueio(e.target.value)}
                                                className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">Fim</label>
                                            <input type="datetime-local" value={dataFimBloqueio} onChange={e => setDataFimBloqueio(e.target.value)}
                                                className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">Motivo</label>
                                            <div className="flex gap-2">
                                                <Input placeholder="Motivo" value={motivoBloqueio} onChange={e => setMotivoBloqueio(e.target.value)} className="flex-1" />
                                                <Btn onClick={salvarBloqueio} color="red"><IconBlock className="w-4 h-4" /></Btn>
                                            </div>
                                        </div>
                                    </div>
                                    <Table data={bloqueios} columns={[
                                        { id: 'espaco', name: 'Espaço', template: (item) => item.space?.nome },
                                        { id: 'motivo', name: 'Motivo' },
                                        { id: 'dataInicio', name: 'Início', template: (item) => new Date(item.dataInicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                                        { id: 'dataFim', name: 'Fim', template: (item) => new Date(item.dataFim).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                                        {
                                            id: 'acoes', name: 'Ações', template: (item) => (
                                                <div className="flex gap-2">
                                                    <Btn onClick={() => abrirEdicaoBloqueio(item)} color="ghost">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Editar
                                                    </Btn>
                                                    <Btn onClick={() => handleDelete('bloqueios', item.id)} color="red">
                                                        <IconTrash className="w-4 h-4" />
                                                    </Btn>
                                                </div>
                                            )
                                        }
                                    ]} />
                                </div>
                            )}

                            {/* === PERFIL === */}
                            {activeTab === 'perfil' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-full bg-rocket-purple/20 flex items-center justify-center text-2xl font-bold text-rocket-purple-light">
                                                {user?.nome ? user.nome.charAt(0).toUpperCase() + (user.nome.split(' ')[1]?.[0]?.toUpperCase() || '') : 'A'}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">{user?.nome || 'Administrador'}</h2>
                                                <p className="text-sm text-[#a0a0b8]">Administrador</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium flex items-center gap-2"><IconUser className="w-4 h-4" /> Nome</label>
                                                <Input type="text" value={profileNome} onChange={e => setProfileNome(e.target.value)} className="w-full" />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium flex items-center gap-2"><IconMail className="w-4 h-4" /> Email</label>
                                                <input type="email" value={profileEmail} disabled
                                                    className="glass-input rounded-lg px-3 py-2.5 text-[#a0a0b8] text-sm w-full opacity-60 cursor-not-allowed" />
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><IconKey className="w-5 h-5 text-rocket-purple-light" /> Alterar Senha</h3>
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium">Senha Atual</label>
                                                <Input type="password" placeholder="••••••••" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className="w-full" />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium">Nova Senha</label>
                                                <Input type="password" placeholder="••••••••" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full" />
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><IconGoogle className="w-5 h-5 text-rocket-purple-light" /> Google Calendar</h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-white">{isGoogleConnected ? 'Conectado ao Google Calendar' : 'Não conectado ao Google Calendar'}</p>
                                            {isGoogleConnected && googleEmail && (
                                                <p className="text-xs text-rocket-purple-light mt-0.5 font-medium">{googleEmail}</p>
                                            )}
                                            <p className="text-xs text-[#a0a0b8] mt-0.5">
                                                {isGoogleConnected ? 'Seus agendamentos serão sincronizados automaticamente.' : 'Conecte para sincronizar agendamentos.'}
                                            </p>
                                        </div>
                                        <Btn onClick={isGoogleConnected ? desconectarGoogle : conectarGoogle} color={isGoogleConnected ? 'red' : 'green'}>
                                            <IconGoogle className="w-4 h-4" />
                                            {isGoogleConnected ? 'Desconectar' : 'Conectar'}
                                        </Btn>
                                    </div>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            WhatsApp
                                        </h3>
                                        <WhatsAppQRCode showToast={showToast} />
                                    </motion.div>

                                    <div className="flex justify-end">
                                        <Btn onClick={salvarPerfil}><IconCheck className="w-4 h-4" /> Salvar Alterações</Btn>
                                    </div>
                                </div>
                            )}

                            {/* === CONFIGURAÇÕES === */}
                            {activeTab === 'configuracoes' && (
                                <div className="glass-card rounded-xl p-6 max-w-lg">
                                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><IconSettings className="w-5 h-5 text-rocket-purple-light" /> Configurações da Agenda</h2>
                                    <div className="flex flex-col gap-5">
                                        {[
                                            { label: 'Hora de Início', value: config.horaInicio, type: 'time', onChange: v => setConfig({ ...config, horaInicio: v }) },
                                            { label: 'Hora de Fim', value: config.horaFim, type: 'time', onChange: v => setConfig({ ...config, horaFim: v }) },
                                            { label: 'Duração do Atendimento (min)', value: config.duracaoAtendimento, type: 'number', onChange: v => setConfig({ ...config, duracaoAtendimento: parseInt(v) || 50 }) },
                                            { label: 'Pausa entre atendimentos (min)', value: config.intervaloEntreAtend, type: 'number', onChange: v => setConfig({ ...config, intervaloEntreAtend: parseInt(v) || 10 }) },
                                        ].map(field => {
                                            const isDuration = field.label === 'Duração do Atendimento (min)';
                                            const isInterval = field.label === 'Pausa entre atendimentos (min)';
                                            return (
                                            <div key={field.label}>
                                                <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium">{field.label}</label>
                                                <input type={field.type} value={field.value} onChange={e => field.onChange(e.target.value)}
                                                    className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple transition-all" />
                                                {isDuration && (
                                                    <div className="flex gap-2 mt-2">
                                                        {[30, 45, 50, 60].map(min => (
                                                            <motion.button key={min} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setConfig({ ...config, duracaoAtendimento: min })}
                                                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer border-none ${
                                                                    config.duracaoAtendimento === min
                                                                        ? 'bg-rocket-purple/20 text-rocket-purple-light border border-rocket-purple/30'
                                                                        : 'bg-white/5 text-[#a0a0b8] hover:bg-white/10 hover:text-white border border-white/[0.06]'
                                                                }`}>
                                                                {min}min
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                )}
                                                {isInterval && (
                                                    <div className="flex gap-2 mt-2">
                                                        {[5, 10, 15, 30].map(min => (
                                                            <motion.button key={min} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setConfig({ ...config, intervaloEntreAtend: min })}
                                                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer border-none ${
                                                                    config.intervaloEntreAtend === min
                                                                        ? 'bg-rocket-purple/20 text-rocket-purple-light border border-rocket-purple/30'
                                                                        : 'bg-white/5 text-[#a0a0b8] hover:bg-white/10 hover:text-white border border-white/[0.06]'
                                                                }`}>
                                                                {min}min
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                        <div>
                                            <label className="block text-sm text-[#a0a0b8] mb-2.5 font-medium">Dias de Funcionamento</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { key: 0, label: 'Dom' },
                                                    { key: 1, label: 'Seg' },
                                                    { key: 2, label: 'Ter' },
                                                    { key: 3, label: 'Qua' },
                                                    { key: 4, label: 'Qui' },
                                                    { key: 5, label: 'Sex' },
                                                    { key: 6, label: 'Sáb' },
                                                ].map(dia => {
                                                    const selected = config.diasFuncionamento.split(',').includes(String(dia.key));
                                                    return (
                                                        <motion.button
                                                            key={dia.key}
                                                            type="button"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => {
                                                                const atuais = config.diasFuncionamento.split(',').filter(Boolean);
                                                                const novo = selected
                                                                    ? atuais.filter(d => d !== String(dia.key))
                                                                    : [...atuais, String(dia.key)];
                                                                setConfig({ ...config, diasFuncionamento: novo.sort().join(',') || '' });
                                                            }}
                                                            className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border-none ${
                                                                selected
                                                                    ? 'bg-rocket-purple text-white shadow-lg shadow-rocket-purple/20'
                                                                    : 'bg-white/5 text-[#a0a0b8] hover:bg-white/10 hover:text-white'
                                                            }`}
                                                        >
                                                            {dia.label}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <Btn onClick={salvarConfiguracoes}><IconCheck className="w-4 h-4" /> Salvar Configurações</Btn>
                                    </div>
                                </div>
                            )}

                            {/* === AGENDAMENTOS === */}
                            {activeTab === 'agendamentos' && (
                                <div className="glass-card rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold">Calendário de Agendamentos</h2>
                                        <Btn onClick={() => { setSelectedDate(new Date()); setDayEvents([]); }}>
                                            <IconPlus className="w-4 h-4" /> Novo Agendamento
                                        </Btn>
                                    </div>
                                    <div className="h-[400px] sm:h-[600px]">
                                        <CalendarView agendamentos={agendamentos} bloqueios={bloqueios} config={config} espacos={espacos}
                                            onSelectEvent={(event) => {
                                                if (event.type === 'agendamento') { setSelectedEvent(event); setNewStatus(event.status); setDayEvents(null); }
                                            }}
                                            onSelectDay={(events, date) => { setDayEvents(events); setSelectedDate(date); }} />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <EventModal selectedEvent={selectedEvent} newStatus={newStatus} setNewStatus={setNewStatus} onUpdateStatus={atualizarStatus}
                onDelete={(id) => showConfirm("Deseja realmente excluir este agendamento?", () => { api.delete(`/agendamentos/${id}`).then(() => { setSelectedEvent(null); buscarDados(); }); })}
                onClose={() => setSelectedEvent(null)}
            />
            <AppointmentModal
                selectedDate={selectedDate}
                clientes={clientes}
                espacos={espacos}
                agendamentos={agendamentos}
                config={config}
                onEventClick={(ag) => { setSelectedDate(null); setSelectedEvent({ ...ag, title: `${ag.client?.nome || 'Cliente'} - ${ag.space?.nome || 'Espaço'}`, start: new Date(ag.dataInicio), end: new Date(ag.dataFim), type: 'agendamento', raw: ag }); setNewStatus(ag.status); }}
                onSave={buscarDados}
                onClose={() => { setDayEvents(null); setSelectedDate(null); }}
            />

            {(() => {
                const cfg = editModalConfig();
                if (!cfg) return null;
                return (
                    <EditModal
                        open={editModal.open}
                        title={cfg.title}
                        fields={cfg.fields}
                        values={editModal.data}
                        onChange={(key, value) => setEditModal(prev => ({ ...prev, data: { ...prev.data, [key]: key === 'telefone' ? formatNationalPhone(value) : value } }))}
                        onSave={cfg.onSave}
                        onClose={() => setEditModal({ open: false, type: '', data: {} })}
                        espacos={espacos}
                    />
                );
            })()}
            <ConfirmDialog open={confirm.open} message={confirm.message}
                onConfirm={confirm.onConfirm}
                onCancel={() => setConfirm({ open: false, message: '', onConfirm: null })}
            />
            <AIAssistant userRole="admin" />
        </div>
    );
}

export default DashboardPage;