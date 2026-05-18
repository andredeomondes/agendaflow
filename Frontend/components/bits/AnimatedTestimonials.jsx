'use client';
import { motion } from 'framer-motion';

const users = [
    { nome: 'Dr. Carlos Silva', cargo: 'Consultório Particular', text: 'Desde que comecei a usar o AgendaFlow, nunca mais tive conflitos de horário. Meus pacientes adoram os lembretes automáticos!', cor: '#8257e5' },
    { nome: 'Maria Souza', cargo: 'Clínica Estética', text: 'A sincronização com Google Agenda foi um divisor de águas. Minha agenda fica atualizada em tempo real.', cor: '#04d361' },
    { nome: 'João Pereira', cargo: 'Salão de Beleza', text: 'Conseguia gerenciar meus 5 profissionais sem dor de cabeça. Interface muito intuitiva!', cor: '#996dff' },
    { nome: 'Ana Oliveira', cargo: 'Studio de Pilates', text: 'Meus alunos agendam direto pelo link. Reduziu 80% das ligações perdidas.', cor: '#f59e0b' },
    { nome: 'Roberto Lima', cargo: 'Espaço Coworking', text: 'O bloqueio de horários para manutenção evita booking em dias que estamos fechados. Simples e eficiente.', cor: '#8257e5' },
];

function TestimonialCard({ user, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="glass-card rounded-xl p-4 sm:p-5 min-w-[260px] sm:min-w-[300px] flex-shrink-0 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
        >
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${user.cor}, ${user.cor}88)` }}
                >
                    {user.nome.charAt(0)}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.nome}</p>
                    <p className="text-xs text-[#a0a0b8]">{user.cargo}</p>
                </div>
            </div>
            <p className="text-sm text-[#c4c4d4] leading-relaxed">&ldquo;{user.text}&rdquo;</p>
        </motion.div>
    );
}

export default function AnimatedTestimonials() {
    return (
        <section id="depoimentos" className="relative py-16 sm:py-24 overflow-hidden" style={{ background: '#120F17' }}>
            <div className="absolute inset-0 bg-grid-animated pointer-events-none" style={{ opacity: 0.06 }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(130,87,229,0.06) 0%, transparent 60%)' }} />
            <div className="max-w-6xl mx-auto px-6 mb-8 sm:mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h2 className="text-2xl sm:text-4xl font-bold mb-3">Quem usa, <span className="text-rocket-purple-light">aprova</span></h2>
                    <p className="text-sm sm:text-base text-[#a0a0b8] max-w-xl mx-auto">Veja o que nossos clientes estão dizendo.</p>
                </motion.div>
            </div>
            <div className="relative px-6"
                style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
            >
                <div className="flex gap-4 animate-marquee w-max">
                    {[...users, ...users, ...users].map((user, i) => (
                        <TestimonialCard key={i} user={user} index={i % users.length} />
                    ))}
                </div>
            </div>
        </section>
    );
}
