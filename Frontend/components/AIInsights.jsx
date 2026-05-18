'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';

function AIInsights({ token }) {
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState(null);

    const carregar = useCallback(async () => {
        setLoading(true);
        setErro(null);
        try {
            const res = await api.post('/ai/ask', {
                mensagem: 'Faça um resumo rápido do dia de hoje: quantos agendamentos, horários mais cheios, ocupação geral. Seja breve em 3 frases.',
                historico: []
            });
            setInsight(res.data.resposta);
        } catch (e) {
            setErro('Indisponível');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-5"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rocket-purple/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-rocket-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-white">Resumo do Dia</h3>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={carregar}
                    disabled={loading}
                    className="text-xs text-rocket-purple-light hover:text-white transition-colors cursor-pointer bg-transparent border-none disabled:opacity-40"
                >
                    {loading ? 'Atualizando...' : 'Atualizar'}
                </motion.button>
            </div>

            {loading ? (
                <div className="flex gap-1.5 py-2">
                    <span className="w-2 h-2 rounded-full bg-rocket-purple loading-dot" />
                    <span className="w-2 h-2 rounded-full bg-rocket-purple loading-dot" />
                    <span className="w-2 h-2 rounded-full bg-rocket-purple loading-dot" />
                </div>
            ) : erro ? (
                <p className="text-xs text-[#a0a0b8]">{erro}</p>
            ) : (
                <p className="text-sm text-[#e1e1e6] leading-relaxed">{insight}</p>
            )}
        </motion.div>
    );
}

export default AIInsights;
