'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={e => e.stopPropagation()}
                        className="glass-card rounded-2xl p-6 w-full max-w-sm relative"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{title || "Confirmação"}</h3>
                                <p className="text-sm text-[#a0a0b8] mt-0.5">{message}</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onConfirm}
                                className="w-full sm:flex-1 bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer">
                Sim, confirmar
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCancel}
                                className="w-full sm:flex-1 bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer">
                Cancelar
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ConfirmDialog;
