'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '../components/Icons';
import { formatNationalPhone, getWhatsAppLink } from '../utils/phone';

function EventModal({ selectedEvent, newStatus, setNewStatus, onUpdateStatus, onDelete, onClose }) {
    const cliente = selectedEvent?.raw?.client || selectedEvent?.client;
    const currentStatus = (selectedEvent?.raw?.status || selectedEvent?.status || '').toLowerCase();
    const whatsappLink = cliente?.telefone ? getWhatsAppLink(cliente.telefone) : null;
    const podeConfirmar = ['agendado', 'pendente'].includes(currentStatus);

    return (
        <AnimatePresence>
            {selectedEvent && (
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
                        className="glass-card rounded-2xl w-full max-w-md relative flex flex-col max-h-[85vh]"
                    >
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/[0.06] shrink-0">
                            <h2 className="text-xl font-semibold">Detalhes do Agendamento</h2>
                            <button onClick={onClose} className="text-[#a0a0b8] hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1">
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm p-6 pt-4 overflow-y-auto">
                            <p><span className="text-[#a0a0b8]">Resumo:</span> {selectedEvent.title}</p>
                            <p>
                                <span className="text-[#a0a0b8]">Data:</span>{' '}
                                {selectedEvent.start.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p>
                                <span className="text-[#a0a0b8]">Horário:</span>{' '}
                                {selectedEvent.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até {selectedEvent.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {cliente && (
                                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                                    <p><span className="text-[#a0a0b8]">Cliente:</span> {cliente.nome}</p>
                                    <p className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[#a0a0b8]">Telefone:</span>
                                        <span>{formatNationalPhone(cliente.telefone)}</span>
                                        {whatsappLink && (
                                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 hover:text-white transition-all"
                                                title="Abrir WhatsApp">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                </svg>
                                            </a>
                                        )}
                                    </p>
                                    {cliente.email && (
                                        <p><span className="text-[#a0a0b8]">Email:</span> {cliente.email}</p>
                                    )}
                                </div>
                            )}
                            <div className="pt-3 border-t border-white/[0.06]">
                                <label className="block text-[#a0a0b8] mb-2">Atualizar Status:</label>
                                <select
                                    value={newStatus}
                                    onChange={e => setNewStatus(e.target.value)}
                                    className="w-full glass-input rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all"
                                >
                                    <option value="Agendado">Agendado</option>
                                    <option value="Confirmado">Confirmado</option>
                                    <option value="Pendente">Pendente</option>
                                    <option value="Cancelado">Cancelado</option>
                                    <option value="Concluído">Concluído</option>
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                                {podeConfirmar && (
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => { setNewStatus('Confirmado'); onUpdateStatus(); }}
                                        className="w-full sm:w-auto text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border-none"
                                        style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130,87,229,0.3)' }}
                                    >
                                        Confirmar Agendamento
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={onUpdateStatus}
                                    className="w-full sm:w-auto bg-[#04d361]/10 text-[#04d361] border border-[#04d361]/20 hover:bg-[#04d361]/20 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                                >
                                    Salvar Status
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => onDelete(selectedEvent.raw?.id || selectedEvent.id)}
                                    className="w-full sm:w-auto bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                                >
                                    Cancelar Agendamento
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={onClose}
                                    className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                                >
                                    Fechar
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default EventModal;
