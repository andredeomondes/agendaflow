'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo, IconCheck } from '../../Frontend/components/Icons';
import api from '../../Frontend/services/api';

function ConfirmarEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState('loading');
    const [mensagem, setMensagem] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('erro');
            setMensagem('Token de confirmação não encontrado.');
            return;
        }
        api.get('/clientes/confirmar-email', { params: { token } })
            .then(res => {
                setStatus('sucesso');
                setMensagem(res.data.mensagem);
            })
            .catch(err => {
                setStatus('erro');
                setMensagem(err.response?.data?.erro || 'Erro ao confirmar email.');
            });
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden gradient-hero">
            <div className="absolute top-1/4 left-1/3 w-80 h-80 blob-purple rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/3 right-1/4 w-72 h-72 blob-orange rounded-full blur-3xl pointer-events-none" />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-8 w-full max-w-md relative text-center">
                <Logo className="w-10 h-10 text-rocket-purple-light mx-auto mb-4" />

                {status === 'loading' && (
                    <>
                        <span className="flex gap-1.5 justify-center mb-4">
                            <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                            <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                            <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                        </span>
                        <p className="text-[#a0a0b8] text-sm">Confirmando seu email...</p>
                    </>
                )}

                {status === 'sucesso' && (
                    <>
                        <IconCheck className="w-12 h-12 text-rocket-green mx-auto mb-3" />
                        <h2 className="text-white text-xl font-bold mb-2">Email Confirmado!</h2>
                        <p className="text-[#a0a0b8] text-sm mb-6">{mensagem}</p>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/login')}
                            className="bg-rocket-green hover:bg-rocket-green/90 text-white font-semibold py-3 px-6 rounded-lg transition-all cursor-pointer border-none">
                            Ir para o Login
                        </motion.button>
                    </>
                )}

                {status === 'erro' && (
                    <>
                        <div className="w-14 h-14 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-3">
                            <span className="text-red-400 text-2xl font-bold">!</span>
                        </div>
                        <h2 className="text-white text-xl font-bold mb-2">Erro</h2>
                        <p className="text-red-400 text-sm mb-6">{mensagem}</p>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/login')}
                            className="bg-rocket-purple hover:bg-rocket-purple/90 text-white font-semibold py-3 px-6 rounded-lg transition-all cursor-pointer border-none">
                            Voltar para o Login
                        </motion.button>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function ConfirmarEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <span className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                    <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                    <span className="w-3 h-3 rounded-full bg-rocket-purple loading-dot" />
                </span>
            </div>
        }>
            <ConfirmarEmailContent />
        </Suspense>
    );
}
