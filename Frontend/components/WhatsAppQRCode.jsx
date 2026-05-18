'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const IconWhatsApp = ({ className = '' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const STATUS_LABELS = {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    qr: 'Escaneie o QR Code',
    connected: 'Conectado',
};

const STATUS_COLORS = {
    disconnected: 'text-[#a0a0b8]',
    connecting: 'text-yellow-400',
    qr: 'text-yellow-400',
    connected: 'text-emerald-400',
};

const DOT_COLORS = {
    disconnected: 'bg-[#a0a0b8]',
    connecting: 'bg-yellow-400',
    qr: 'bg-yellow-400',
    connected: 'bg-emerald-400',
};

export default function WhatsAppQRCode({ showToast }) {
    const [status, setStatus] = useState('disconnected');
    const [qr, setQr] = useState(null);
    const [loading, setLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const prevStatusRef = React.useRef('disconnected');

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/whatsapp/status');
            const newStatus = res.data.status;
            setStatus(newStatus);
            setQr(res.data.qr || null);
            if (prevStatusRef.current !== 'connected' && newStatus === 'connected') {
                showToast('WhatsApp conectado com sucesso!', 'success');
            }
            if (prevStatusRef.current === 'connected' && newStatus !== 'connected') {
                showToast('WhatsApp desconectado.', 'warning');
            }
            prevStatusRef.current = newStatus;
        } catch (_) {}
    }, [showToast]);

    useEffect(() => {
        fetchStatus();
        // Poll sempre: rápido enquanto conectando, lento quando conectado/desconectado
        const interval = setInterval(fetchStatus, status === 'qr' || status === 'connecting' ? 2500 : 8000);
        return () => clearInterval(interval);
    }, [status === 'qr' || status === 'connecting']);

    const handleConnect = async () => {
        setLoading(true);
        try {
            const res = await api.post('/whatsapp/connect');
            setStatus(res.data.status);
            setQr(res.data.qr || null);
        } catch (e) {
            showToast(e.response?.data?.erro || 'Erro ao iniciar WhatsApp.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        if (!testPhone.trim()) return showToast('Digite um número para testar.', 'warning');
        setTestLoading(true);
        try {
            await api.post('/whatsapp/test', { telefone: testPhone.trim() });
            showToast('Mensagem de teste enviada! Verifique o WhatsApp.', 'success');
        } catch (e) {
            showToast(e.response?.data?.erro || 'Falha ao enviar. Verifique o console do backend.', 'error');
        } finally {
            setTestLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            await api.post('/whatsapp/disconnect');
            setStatus('disconnected');
            setQr(null);
            showToast('WhatsApp desconectado.', 'success');
        } catch (e) {
            showToast('Erro ao desconectar.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Status row */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full inline-block ${DOT_COLORS[status]} ${status === 'connected' ? 'animate-pulse' : ''}`} />
                        <span className={`text-sm font-medium ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
                    </div>
                    <p className="text-xs text-[#a0a0b8]">
                        {status === 'connected'
                            ? 'Notificações por WhatsApp ativas para todos os agendamentos.'
                            : status === 'qr'
                            ? 'Abra o WhatsApp no celular › Dispositivos vinculados › Vincular.'
                            : 'Conecte para enviar confirmações e lembretes por WhatsApp.'}
                    </p>
                </div>

                <div className="flex gap-2 shrink-0">
                    {status === 'connected' ? (
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleDisconnect} disabled={loading}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 transition-all cursor-pointer disabled:opacity-50">
                            {loading ? 'Aguarde...' : 'Desconectar'}
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleConnect} disabled={loading || status === 'connecting'}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)', boxShadow: '0 2px 16px rgba(37,211,102,0.3)' }}>
                            <IconWhatsApp className="w-4 h-4" />
                            {loading || status === 'connecting' ? 'Iniciando...' : 'Conectar WhatsApp'}
                        </motion.button>
                    )}
                </div>
            </div>

            {/* QR Code */}
            {/* Teste de envio quando conectado */}
            <AnimatePresence>
                {status === 'connected' && (
                    <motion.div
                        key="test"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2 items-center pt-1"
                    >
                        <input
                            type="text"
                            placeholder="Ex: 5511999999999 (testar envio)"
                            value={testPhone}
                            onChange={e => setTestPhone(e.target.value)}
                            className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-[#a0a0b8] bg-white/[0.04] border border-white/[0.08] focus:outline-none focus:border-[#25d366]/40 transition-all"
                        />
                        <button
                            onClick={handleTest}
                            disabled={testLoading}
                            className="px-3 py-2 rounded-lg text-xs font-medium text-[#25d366] border border-[#25d366]/20 bg-[#25d366]/10 hover:bg-[#25d366]/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                            {testLoading ? '...' : 'Testar'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {status === 'qr' && qr && (
                    <motion.div
                        key="qr"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <p className="text-xs text-[#a0a0b8] text-center">
                            Escaneie com o WhatsApp para vincular
                        </p>
                        <div className="p-3 bg-white rounded-xl">
                            <img src={qr} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                        </div>
                        <p className="text-xs text-[#a0a0b8] text-center">
                            O QR Code expira em alguns segundos. Um novo será gerado automaticamente.
                        </p>
                    </motion.div>
                )}

                {(status === 'connecting') && !qr && (
                    <motion.div
                        key="connecting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2 py-6 text-[#a0a0b8] text-sm">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Gerando QR Code...
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
