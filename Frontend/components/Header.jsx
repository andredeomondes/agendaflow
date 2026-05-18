'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Logo, IconGoogle, IconLogOut } from '../components/Icons';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const IconWhatsApp = ({ className = '' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

function Header({ user, isGoogleConnected, onConnectGoogle, onLogout, isWhatsAppConnected, onGoToWhatsApp }) {
    const showToast = useToast();
    const [showGoogleMenu, setShowGoogleMenu] = useState(false);
    const [showWppMenu, setShowWppMenu] = useState(false);
    const googleRef = useRef(null);
    const wppRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (googleRef.current && !googleRef.current.contains(e.target)) setShowGoogleMenu(false);
            if (wppRef.current && !wppRef.current.contains(e.target)) setShowWppMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const desconectarGoogle = async () => {
        try {
            await api.post('/google/disconnect');
            showToast('Google Calendar desconectado!', 'success');
            setShowGoogleMenu(false);
            window.location.reload();
        } catch (e) {
            showToast('Erro ao desconectar Google Calendar', 'error');
        }
    };

    const desconectarWhatsApp = async () => {
        try {
            await api.post('/whatsapp/disconnect');
            showToast('WhatsApp desconectado!', 'success');
            setShowWppMenu(false);
            if (onGoToWhatsApp) onGoToWhatsApp();
        } catch (e) {
            showToast('Erro ao desconectar WhatsApp', 'error');
        }
    };

    return (
        <header className="sticky top-0 z-40" style={{ background: 'rgba(18,15,23,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2.5"
                >
                    <Logo className="w-7 h-7 text-rocket-purple-light" />
                    <span className="text-lg font-bold text-white">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                </motion.div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Google Calendar */}
                    <div className="relative" ref={googleRef}>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                if (isGoogleConnected) {
                                    setShowGoogleMenu(!showGoogleMenu);
                                } else {
                                    onConnectGoogle();
                                }
                            }}
                            className={`flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                                isGoogleConnected
                                    ? 'bg-[#04d361]/10 text-[#04d361] border border-[#04d361]/20 hover:bg-[#04d361]/20'
                                    : 'text-rocket-purple-light border border-white/[0.1] hover:bg-white/5'
                            }`}
                        >
                            <IconGoogle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{isGoogleConnected ? 'Google Conectado' : 'Conectar Google'}</span>
                        </motion.button>
                        {showGoogleMenu && isGoogleConnected && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 mt-2 w-56 rounded-lg py-2 z-50 overflow-hidden"
                                style={{ background: 'rgba(18,15,23,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                            >
                                <button
                                    onClick={desconectarGoogle}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none flex items-center gap-2"
                                >
                                    <IconLogOut className="w-4 h-4" />
                                    Desconectar Google Agenda
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* WhatsApp — sempre visível; conectado mostra dropdown, desconectado leva às configs */}
                    <div className="relative" ref={wppRef}>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                if (isWhatsAppConnected) {
                                    setShowWppMenu(!showWppMenu);
                                } else {
                                    if (onGoToWhatsApp) onGoToWhatsApp();
                                }
                            }}
                            className={`flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                                isWhatsAppConnected
                                    ? 'bg-[#25d366]/10 text-[#25d366] border border-[#25d366]/20 hover:bg-[#25d366]/20'
                                    : 'text-[#a0a0b8] border border-white/[0.1] hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <IconWhatsApp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{isWhatsAppConnected ? 'WhatsApp' : 'Conectar WhatsApp'}</span>
                            {isWhatsAppConnected && <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />}
                        </motion.button>
                        {showWppMenu && isWhatsAppConnected && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 mt-2 w-52 rounded-lg py-2 z-50 overflow-hidden"
                                style={{ background: 'rgba(18,15,23,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                            >
                                <div className="px-4 py-2 border-b border-white/[0.06]">
                                    <p className="text-xs text-[#a0a0b8]">Notificações ativas</p>
                                    <p className="text-xs text-[#25d366] font-medium mt-0.5">Mensagens automáticas ligadas</p>
                                </div>
                                <button
                                    onClick={() => { setShowWppMenu(false); if (onGoToWhatsApp) onGoToWhatsApp(); }}
                                    className="w-full text-left px-4 py-2 text-sm text-[#a0a0b8] hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none flex items-center gap-2 mt-1"
                                >
                                    <IconWhatsApp className="w-4 h-4" />
                                    Gerenciar WhatsApp
                                </button>
                                <button
                                    onClick={desconectarWhatsApp}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none flex items-center gap-2"
                                >
                                    <IconLogOut className="w-4 h-4" />
                                    Desconectar WhatsApp
                                </button>
                            </motion.div>
                        )}
                    </div>

                    <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(130,87,229,0.08)' }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)' }}>
                            {user?.nome ? user.nome.charAt(0).toUpperCase() + (user.nome.split(' ')[1]?.[0]?.toUpperCase() || '') : 'A'}
                        </div>
                        <span className="text-sm text-[#c4c4d4]">{user?.nome || 'Admin'}</span>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onLogout}
                        className="flex items-center gap-2 text-[#a0a0b8] hover:text-red-400 text-xs sm:text-sm px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer"
                        style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
                    >
                        <IconLogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sair</span>
                    </motion.button>
                </div>
            </div>
        </header>
    );
}

export default Header;
