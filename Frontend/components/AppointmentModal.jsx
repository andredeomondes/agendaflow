'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconPlus } from './Icons';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const statusColors = {
    Confirmado: '#10b981',
    Pendente: '#f59e0b',
    Cancelado: '#ef4444',
    Agendado: '#6366f1',
    Concluído: '#374151'
};

function AppointmentModal({ selectedDate, clientes, espacos, agendamentos, config, onEventClick, onClose, onSave }) {
    const showToast = useToast();

    const [activeView, setActiveView] = useState('list');

    const [formClienteId, setFormClienteId] = useState('');
    const [formStatus, setFormStatus] = useState('Agendado');
    const [formEspacoId, setFormEspacoId] = useState('');

    useEffect(() => {
        setActiveView('list');
        setFormClienteId('');
        setFormStatus('Agendado');
        setFormEspacoId('');
        setSelectedSlots([]);
    }, [selectedDate]);
    const formData = useMemo(() => {
        if (selectedDate) {
            const d = new Date(selectedDate);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    }, [selectedDate]);
    const [slotsPorEspaco, setSlotsPorEspaco] = useState({});
    const [loadingEspacos, setLoadingEspacos] = useState(false);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [saving, setSaving] = useState(false);

    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);
    const dataSelecionada = selectedDate ? new Date(selectedDate) : null;
    dataSelecionada?.setHours(0, 0, 0, 0);
    const podeAgendar = dataSelecionada && dataSelecionada >= dataAtual;

    const dayEvents = useMemo(() => agendamentos.filter(ag => {
        if (!selectedDate) return false;
        const d = new Date(selectedDate);
        const agDate = new Date(ag.dataInicio);
        return agDate.toDateString() === d.toDateString() && ag.status !== 'Cancelado';
    }), [agendamentos, selectedDate]);

    useEffect(() => {
        if (!espacos?.length || !formData) {
            setSlotsPorEspaco({});
            return;
        }
        const buscarSlotsDeTodosEspacos = async () => {
            setLoadingEspacos(true);
            try {
                const results = {};
                await Promise.all(espacos.map(async (esp) => {
                    try {
                        const res = await api.get('/agendamentos/slots', {
                            params: { spaceId: esp.id, data: formData }
                        });
                        results[esp.id] = res.data.slots || [];
                    } catch {
                        results[esp.id] = [];
                    }
                }));
                setSlotsPorEspaco(results);
            } finally {
                setLoadingEspacos(false);
            }
        };
        buscarSlotsDeTodosEspacos();
    }, [espacos, formData]);

    const espacosComSlots = useMemo(() => {
        return espacos.filter(esp => (slotsPorEspaco[esp.id] || []).length > 0);
    }, [espacos, slotsPorEspaco]);

    const slotsDoEspacoSelecionado = slotsPorEspaco[formEspacoId] || [];

    const handleSave = async () => {
        if (!formClienteId || !formEspacoId || selectedSlots.length === 0) {
            return showToast("Preencha todos os campos e selecione ao menos um horário!", "warning");
        }
        const inicio = new Date(selectedSlots[0].dataInicio);
        const fim = new Date(selectedSlots[selectedSlots.length - 1].dataFim);
        if (inicio <= new Date()) {
            return showToast("Não é permitido agendar em horários passados.", "warning");
        }
        setSaving(true);
        try {
            await api.post('/agendamentos', {
                clientId: parseInt(formClienteId),
                spaceId: parseInt(formEspacoId),
                dataInicio: inicio.toISOString(),
                dataFim: fim.toISOString(),
                status: formStatus
            });
            showToast("Agendamento criado com sucesso!", "success");
            onSave?.();
            onClose?.();
        } catch (e) {
            showToast(e.response?.data?.erro || "Erro ao marcar agendamento.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {(selectedDate || activeView === 'create') && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={e => e.stopPropagation()}
                        className="glass-card rounded-2xl p-5 sm:p-6 w-full max-w-lg relative mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-[#a0a0b8] hover:text-white transition-colors cursor-pointer bg-transparent border-none">
                            <IconX className="w-5 h-5" />
                        </button>

                        {activeView === 'list' && (
                            <>
                                <h2 className="text-xl font-semibold mb-4">
                                    Agendamentos — {selectedDate?.toLocaleDateString?.('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) || ''}
                                </h2>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
                                    {dayEvents.length === 0 ? (
                                        <p className="text-[#a0a0b8] text-sm text-center py-8">Nenhum agendamento neste dia</p>
                                    ) : (
                                        dayEvents.map((ag, idx) => (
                                            <motion.button
                                                key={ag.id || idx}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => onEventClick?.(ag)}
                                                className="w-full text-left p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 cursor-pointer border border-white/[0.06]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: statusColors[ag.status] || '#6366f1' }} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">
                                                            {ag.client?.nome || 'Cliente'} — {ag.space?.nome || 'Espaço'}
                                                        </p>
                                                        <p className="text-xs text-[#a0a0b8] mt-0.5">
                                                            {new Date(ag.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {new Date(ag.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{
                                                        backgroundColor: `${statusColors[ag.status] || '#6366f1'}20`,
                                                        color: statusColors[ag.status] || '#6366f1'
                                                    }}>
                                                        {ag.status}
                                                    </span>
                                                </div>
                                            </motion.button>
                                        ))
                                    )}
                                </div>

                                {podeAgendar && (
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setActiveView('create')}
                                            className="flex-1 hover:brightness-110 text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 4px 20px rgba(130,87,229,0.3)' }}
                                        >
                                            <IconPlus className="w-4 h-4" /> Novo Agendamento
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={onClose}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                                        >
                                            Fechar
                                        </motion.button>
                                    </div>
                                )}
                            </>
                        )}

                        {activeView === 'create' && (
                            <>
                                <h2 className="text-xl font-semibold mb-4">Novo Agendamento</h2>
                                <p className="text-sm text-[#a0a0b8] mb-4">
                                    Data: {new Date(formData + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>

                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">Cliente</label>
                                        <select value={formClienteId} onChange={e => setFormClienteId(e.target.value)}
                                            className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all">
                                            <option value="">Selecione</option>
                                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">Status</label>
                                        <select value={formStatus} onChange={e => setFormStatus(e.target.value)}
                                            className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all">
                                            <option value="Agendado">Agendado</option>
                                            <option value="Confirmado">Confirmado</option>
                                            <option value="Pendente">Pendente</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">Espaço</label>
                                        {loadingEspacos ? (
                                            <div className="flex gap-1.5 py-2">
                                                <span className="w-2 h-2 rounded-full bg-rocket-purple loading-dot" />
                                                <span className="w-2 h-2 rounded-full bg-rocket-purple loading-dot" />
                                                <span className="w-2 h-2 rounded-full bg-rocket-purple loading-dot" />
                                            </div>
                                        ) : (
                                            <select value={formEspacoId} onChange={e => { setFormEspacoId(e.target.value); setSelectedSlot(null); }}
                                                className="glass-input w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all">
                                                <option value="">Selecione</option>
                                                {espacos.map(e => <option key={e.id} value={e.id}>
                                                    {e.nome}{slotsPorEspaco[e.id]?.length > 0 ? ' ✓' : ' ⛔'}
                                                </option>)}
                                            </select>
                                        )}
                                    </div>

                                    {formEspacoId && (
                                        <div>
                                            <label className="block text-xs text-[#a0a0b8] mb-1 font-medium uppercase tracking-wider">
                                                Horários Disponíveis
                                                {selectedSlots.length > 0 && (
                                                    <span className="text-[10px] text-rocket-green ml-2">
                                                        {selectedSlots.length} bloco(s) — {selectedSlots.reduce((acc, s) => acc + (new Date(s.dataFim) - new Date(s.dataInicio)), 0) / 60000}min
                                                    </span>
                                                )}
                                            </label>
                                            {slotsDoEspacoSelecionado.length === 0 ? (
                                                <p className="text-sm text-red-400 py-2">Nenhum horário disponível neste espaço</p>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1 max-h-[200px] overflow-y-auto hide-scrollbar">
                                                    {slotsDoEspacoSelecionado.map((slot, idx) => {
                                                        const inicio = new Date(slot.dataInicio);
                                                        const fim = new Date(slot.dataFim);
                                                        const slotTime = inicio.getTime();
                                                        const isSelected = selectedSlots.some(s => new Date(s.dataInicio).getTime() === slotTime);
                                                        const isMultiStart = isSelected && selectedSlots[0] && new Date(selectedSlots[0].dataInicio).getTime() === slotTime;
                                                        return (
                                                            <React.Fragment key={idx}>
                                                                <motion.button
                                                                    type="button"
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => {
                                                                        setSelectedSlots(prev => {
                                                                            if (prev.some(s => new Date(s.dataInicio).getTime() === slotTime)) {
                                                                                return prev.filter(s => new Date(s.dataInicio).getTime() !== slotTime);
                                                                            }
                                                                            if (prev.length === 0) return [slot];
                                                                            const firstTime = new Date(prev[0].dataInicio).getTime();
                                                                            const lastTime = new Date(prev[prev.length - 1].dataInicio).getTime();
                                                                            const stepMs = 3600000;
                                                                            if (slotTime === lastTime + stepMs) return [...prev, slot];
                                                                            if (slotTime === firstTime - stepMs) return [slot, ...prev];
                                                                            return [slot];
                                                                        });
                                                                    }}
                                                                    className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all border-2 cursor-pointer touch-target ${
                                                                        isSelected
                                                                            ? 'bg-[#04d361]/20 text-[#04d361] border-[#04d361] shadow-lg shadow-[#04d361]/20 scale-[1.02]'
                                                                            : 'bg-white/[0.04] text-[#a0a0b8] hover:text-white hover:bg-white/[0.08] border-white/[0.06] hover:border-white/[0.12]'
                                                                    }`}
                                                                >
                                                                    {String(inicio.getHours()).padStart(2,'0')}:{String(inicio.getMinutes()).padStart(2,'0')} - {String(fim.getHours()).padStart(2,'0')}:{String(fim.getMinutes()).padStart(2,'0')}
                                                                    {isMultiStart && (
                                                                        <span className="block text-[10px] text-[#04d361] font-bold mt-1">INÍCIO</span>
                                                                    )}
                                                                </motion.button>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!formEspacoId && espacosComSlots.length > 0 && (
                                        <div>
                                            <label className="block text-xs text-[#a0a0b8] mb-2 font-medium uppercase tracking-wider">
                                                Espaços com vagas hoje
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {espacosComSlots.map(esp => (
                                                    <motion.button
                                                        key={esp.id}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setFormEspacoId(esp.id)}
                                                        className="bg-rocket-green/10 text-rocket-green border border-rocket-green/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-rocket-green/20 transition-all cursor-pointer"
                                                    >
                                                        {esp.nome} • {slotsPorEspaco[esp.id]?.length || 0} horários
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleSave}
                                            disabled={saving || selectedSlots.length === 0}
                                            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 4px 20px rgba(130,87,229,0.3)' }}
                                        >
                                            {saving ? (
                                                <span className="flex gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                                </span>
                                            ) : (
                                                <>Confirmar Agendamento</>
                                            )}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setActiveView('list')}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                                        >
                                            Voltar
                                        </motion.button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default AppointmentModal;
