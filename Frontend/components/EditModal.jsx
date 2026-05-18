'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from './Icons';

function EditModal({ open, title, fields, values, onChange, onSave, onClose, espacos }) {
    if (!open) return null;
    return (
        <AnimatePresence>
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
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-rocket-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {title}
                    </h2>
                    <div className="space-y-4">
                        {fields.map(field => (
                            <div key={field.key}>
                                <label className="block text-sm text-[#a0a0b8] mb-1.5 font-medium">{field.label}</label>
                                {field.type === 'select' ? (
                                    <select value={values[field.key] || ''} onChange={e => onChange(field.key, e.target.value)}
                                        className="w-full glass-input rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all">
                                        <option value="">Selecione...</option>
                                        {(field.options || espacos || []).map(opt => (
                                            <option key={opt.value || opt.id} value={opt.value || opt.id}>{opt.label || opt.nome}</option>
                                        ))}
                                    </select>
                                ) : field.type === 'datetime-local' ? (
                                    <input type="datetime-local" value={values[field.key] || ''} onChange={e => onChange(field.key, e.target.value)}
                                        className="w-full glass-input rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all" />
                                ) : (
                                    <input type={field.type || 'text'} value={values[field.key] || ''} onChange={e => onChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="w-full glass-input rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all placeholder-[#a0a0b8]" />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onSave}
                            className="w-full sm:flex-1 bg-rocket-green hover:bg-rocket-green/90 text-white px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-rocket-green/20 flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Salvar
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
                            className="w-full sm:flex-1 bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer">
                            Cancelar
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default EditModal;
