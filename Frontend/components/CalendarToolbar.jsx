'use client';
import React from 'react';
import { motion } from 'framer-motion';

const views = [
    { key: 'month', label: 'Mês' },
    { key: 'week', label: 'Semana' },
    { key: 'day', label: 'Dia' },
    { key: 'agenda', label: 'Lista' },
];

function CalendarToolbar({ onNavigate, onView, label, view }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNavigate('TODAY')}
                    className="bg-rocket-purple hover:bg-rocket-purple-dark text-white px-3 sm:px-4 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-rocket-purple/20"
                >
                    Hoje
                </motion.button>
                <div className="flex items-center gap-1">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onNavigate('PREV')}
                        className="bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer border border-white/[0.06]"
                    >
                        Anterior
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onNavigate('NEXT')}
                        className="bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer border border-white/[0.06]"
                    >
                        Próximo
                    </motion.button>
                </div>
            </div>

            <h2 className="text-sm sm:text-base font-semibold text-white flex-1 text-center min-w-[140px] sm:min-w-[180px]">
                {label}
            </h2>

            <div className="flex items-center gap-1">
                {views.map((v) => (
                    <motion.button
                        key={v.key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onView(v.key)}
                        className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                            view === v.key
                                ? 'bg-rocket-purple text-white shadow-lg shadow-rocket-purple/20'
                                : 'bg-white/5 hover:bg-white/10 text-[#a0a0b8] hover:text-white border border-white/[0.06]'
                        }`}
                    >
                        {v.label}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

export default CalendarToolbar;
