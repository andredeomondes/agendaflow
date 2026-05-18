'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

// Renderiza texto com quebras de linha e negrito (**texto**)
function MsgText({ content }) {
    const linhas = content.split('\n').filter((l, i, arr) => !(l.trim() === '' && arr[i - 1]?.trim() === ''));
    return (
        <span>
            {linhas.map((linha, i) => {
                const partes = linha.split(/\*\*(.+?)\*\*/g);
                return (
                    <span key={i}>
                        {partes.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{p}</strong> : p)}
                        {i < linhas.length - 1 && <br />}
                    </span>
                );
            })}
        </span>
    );
}

function AIAssistant({ userRole = 'admin' }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: userRole === 'admin' ? 'Olá! Sou seu assistente IA do AgendaFlow. Como posso ajudar?' : 'Olá! Como posso ajudar com seus agendamentos?', opcoes: [] }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const enviar = async (texto) => {
        const msg = (texto || input).trim();
        if (!msg || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg, opcoes: [] }]);
        setLoading(true);

        try {
            const historico = messages.map(m => ({ role: m.role, content: m.content }));
            const res = await api.post('/ai/ask', { mensagem: msg, historico });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.resposta,
                opcoes: res.data.opcoes || []
            }]);
        } catch (e) {
            const detalhe = e.response?.data?.erro || e.response?.data?.resposta || e.message || '';
            setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${detalhe || 'Sem conexão com o assistente.'}`, opcoes: [] }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer border-none"
                style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 4px 20px rgba(130,87,229,0.4)' }}
            >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[540px] rounded-2xl flex flex-col overflow-hidden"
                        style={{ background: 'rgba(18,15,23,0.92)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-rocket-purple/20 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-rocket-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Assistente IA</p>
                                    <p className="text-xs text-[#04d361]">● Online</p>
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-[#a0a0b8] hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Mensagens */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-rocket-purple/20 text-white border border-rocket-purple/20'
                                            : 'bg-white/[0.04] text-[#e1e1e6] border border-white/[0.06]'
                                    }`}>
                                        <MsgText content={msg.content} />
                                    </div>

                                    {/* Chips clicáveis */}
                                    {msg.role === 'assistant' && msg.opcoes?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2 max-w-[88%]">
                                            {msg.opcoes.map((op, j) => (
                                                <motion.button
                                                    key={j}
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={() => enviar(op)}
                                                    disabled={loading || i < messages.length - 1}
                                                    className="text-xs px-2.5 py-1 rounded-full border border-rocket-purple/40 text-rocket-purple-light bg-rocket-purple/10 hover:bg-rocket-purple/20 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    {op}
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
                                        <span className="flex gap-1">
                                            <span className="w-2 h-2 rounded-full bg-[#a0a0b8] loading-dot" />
                                            <span className="w-2 h-2 rounded-full bg-[#a0a0b8] loading-dot" />
                                            <span className="w-2 h-2 rounded-full bg-[#a0a0b8] loading-dot" />
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/[0.06] shrink-0">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && enviar()}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 glass-input rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple transition-all"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => enviar()}
                                    disabled={loading || !input.trim()}
                                    className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer border-none shrink-0 disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)' }}
                                >
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default AIAssistant;
