'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconPlus } from './Icons';

const statusColors = {
    Confirmado: '#10b981',
    Pendente: '#f59e0b',
    Cancelado: '#ef4444',
    Agendado: '#6366f1',
    Concluído: '#374151'
};

function DayEventsModal({ events, onSelectEvent, onCreateAppointment, onClose, selectedDate }) {
    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);
    const dataSelecionada = selectedDate ? new Date(selectedDate) : null;
    const podeAgendar = dataSelecionada && dataSelecionada >= dataAtual;
    return (
        <AnimatePresence>
            {events && (
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
                        className="glass-card rounded-2xl p-6 w-full max-w-md relative"
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-[#a0a0b8] hover:text-white transition-colors cursor-pointer bg-transparent border-none">
                            <IconX className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Agendamentos do Dia</h2>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {events.length === 0 ? (
                                <p className="text-[#a0a0b8] text-sm text-center py-8">Nenhum agendamento neste dia</p>
                            ) : (
                                events.map((event, idx) => (
                                    <motion.button
                                        key={event.id || idx}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onSelectEvent(event)}
                                        className="w-full text-left p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 cursor-pointer border border-white/[0.06]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: statusColors[event.status] || '#6366f1' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{event.title}</p>
                                                <p className="text-xs text-[#a0a0b8] mt-0.5">
                                                    {event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className="text-xs font-medium px-2 py-1 rounded-full" style={{
                                                backgroundColor: `${statusColors[event.status] || '#6366f1'}20`,
                                                color: statusColors[event.status] || '#6366f1'
                                            }}>
                                                {event.status}
                                            </span>
                                        </div>
                                    </motion.button>
                                ))
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                            <motion.button
                                whileHover={podeAgendar ? { scale: 1.03 } : {}}
                                whileTap={podeAgendar ? { scale: 0.97 } : {}}
                                onClick={podeAgendar ? onCreateAppointment : undefined}
                                disabled={!podeAgendar}
                                className={`w-full sm:flex-1 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                    podeAgendar
                                        ? 'bg-rocket-green hover:bg-rocket-green/90 text-white cursor-pointer shadow-lg shadow-rocket-green/20'
                                        : 'bg-white/[0.03] text-[#a0a0b8] cursor-not-allowed opacity-50'
                                }`}
                            >
                                <IconPlus className="w-4 h-4" /> {podeAgendar ? 'Novo Agendamento' : 'Data já passou'}
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={onClose}
                                className="w-full sm:flex-1 bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                            >
                                Fechar
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default DayEventsModal;
