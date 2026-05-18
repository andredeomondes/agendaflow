'use client';
import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Logo, IconCalendar, IconBell, IconSync, IconBlock, IconSettings, IconChart, IconArrowRight } from '../components/Icons';
import CustomCursor from '../components/CustomCursor';
import Aurora from '../components/bits/Aurora';
import BlurText from '../components/bits/BlurText';
import AnimatedTestimonials from '../components/bits/AnimatedTestimonials';
import MouseGlow from '../components/bits/MouseGlow';
import DotField from '../components/bits/DotField';

const features = [
    { icon: IconCalendar, title: 'Agendamento Inteligente', desc: 'Gerencie horários com calendário visual e verificação automática de capacidade e conflitos.' },
    { icon: IconBell, title: 'Lembretes Automáticos', desc: 'Seus clientes recebem lembretes por e-mail automaticamente antes de cada agendamento.' },
    { icon: IconSync, title: 'Google Agenda', desc: 'Sincronize seus agendamentos com o Google Calendar em um clique.' },
    { icon: IconBlock, title: 'Bloqueio de Horários', desc: 'Bloqueie horários específicos para manutenção, feriados ou pausas.' },
    { icon: IconSettings, title: 'Configurável', desc: 'Ajuste horários de funcionamento, intervalos e dias úteis conforme sua necessidade.' },
    { icon: IconChart, title: 'Gestão Completa', desc: 'Cadastre clientes, espaços e acompanhe tudo em um só lugar.' }
];

function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    return <motion.div className="scroll-progress" style={{ scaleX: scrollYProgress, transformOrigin: 'left' }} />;
}

function ParallaxOrb({ className, speed = 0.5, style = {} }) {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 1000], [0, 200 * speed]);
    return <motion.div style={{ y, ...style }} className={className} />;
}

function RevealText({ children, className, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

function StarField() {
    const stars = Array.from({ length: 50 }, (_, i) => {
        const h = (i * 157) % 100;
        return {
            id: i,
            left: `${(h * 1.7) % 100}%`,
            top: `${(h * 3.1 + 13) % 100}%`,
            size: ((h * 0.9) % 2) + 1,
            delay: ((h * 0.07) % 4),
        };
    });
    return (
        <div className="fixed inset-0 pointer-events-none -z-4">
            {stars.map((s) => (
                <div
                    key={s.id}
                    className="absolute rounded-full bg-white animate-twinkle"
                    style={{
                        left: s.left,
                        top: s.top,
                        width: s.size,
                        height: s.size,
                        animationDelay: `${s.delay}s`,
                        opacity: 0.3,
                    }}
                />
            ))}
        </div>
    );
}

export default function LandingPage({ onEntrar }) {
    const { scrollY } = useScroll();
    const heroParallax = useTransform(scrollY, [0, 800], [0, -120]);
    const opacityParallax = useTransform(scrollY, [0, 600], [1, 0.3]);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e1e1e6] font-inter overflow-x-hidden sm:snap-y sm:snap-mandatory bg-noise">
            <MouseGlow color="130,87,229" size="400" />
            <CustomCursor />
            <ScrollProgress />
            <StarField />

            {/* Floating gradient orbs with parallax */}
            <ParallaxOrb
                speed={0.3}
                className="fixed top-[-10%] left-[-5%] w-[250px] h-[250px] sm:w-[600px] sm:h-[600px] blob-purple rounded-full blur-3xl pointer-events-none -z-5 animate-float"
            />
            <ParallaxOrb
                speed={0.5}
                className="fixed bottom-[-10%] right-[-5%] w-[200px] h-[200px] sm:w-[500px] sm:h-[500px] blob-orange rounded-full blur-3xl pointer-events-none -z-5 animate-float-delayed"
            />
            <ParallaxOrb
                speed={0.4}
                className="fixed top-1/3 right-[10%] w-[180px] h-[180px] sm:w-[400px] sm:h-[400px] blob-green rounded-full blur-3xl pointer-events-none -z-5 animate-float-slow"
            />

            {/* Floating Rounded Navbar */}
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl rounded-full glass backdrop-blur-xl border border-white/[0.08]" style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(130,87,229,0.1)' }}>
                <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
                    <motion.a
                        href="#home"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 shrink-0"
                    >
                        <Logo className="w-6 h-6 sm:w-7 sm:h-7 text-rocket-purple-light" />
                        <span className="text-base sm:text-xl font-bold text-white hidden sm:inline">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                    </motion.a>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {[
                            { href: '#home', label: 'Início' },
                            { href: '#features', label: 'Recursos' },
                            { href: '#depoimentos', label: 'Depoimentos' },
                        ].map(link => (
                            <a key={link.href} href={link.href}
                                className="text-xs sm:text-sm text-[#a0a0b8] hover:text-white px-2 sm:px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-white/[0.06]">
                                {link.label}
                            </a>
                        ))}
                        <motion.a
                            href="#cta"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.preventDefault();
                                onEntrar();
                            }}
                            className="hover:brightness-110 text-white text-xs sm:text-sm px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium transition-all duration-200 cursor-pointer shrink-0 ml-1"
                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130, 87, 229, 0.3)' }}
                        >
                            Começar
                        </motion.a>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section id="home" className="relative min-h-screen sm:h-screen sm:snap-start flex items-center justify-center px-6 overflow-hidden" style={{ background: '#120F17' }}>
                <Aurora colors={['#8257e5', '#996dff', '#633bbc']} speed={0.3} />
                <DotField color="130,87,229" dotSize={1.5} spacing={28} radius={100} />
                <div className="absolute inset-4 glass-section" />
                <motion.div
                    style={{ y: heroParallax, opacity: opacityParallax }}
                    className="max-w-4xl mx-auto text-center relative z-10 pt-16 sm:pt-0"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6"
                    >
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Logo className="w-8 h-8 sm:w-10 sm:h-10 text-rocket-purple-light" />
                        </motion.div>
                        <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold leading-tight">
                            Agenda<BlurText className="text-rocket-purple-light" delay={0.4} duration={0.6}>Flow</BlurText>
                        </h1>
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-xs sm:text-lg md:text-xl text-[#a0a0b8] mb-4 sm:mb-10 max-w-2xl mx-auto px-2 sm:px-0"
                    >
                        Organize espaços, gerencie horários, evite conflitos e mantenha seus clientes informados.
                        Tudo em uma plataforma moderna e intuitiva.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onEntrar}
                            className="w-full sm:w-auto hover:brightness-110 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-lg font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 4px 24px rgba(130, 87, 229, 0.35)' }}
                        >
                            Começar Agora
                            <IconArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </motion.button>
                        <motion.a
                            href="#features"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full sm:w-auto glass glass-hover text-[#a0a0b8] hover:text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-lg font-semibold transition-all duration-200 cursor-pointer inline-block text-center"
                        >
                            Conhecer Recursos
                        </motion.a>
                    </motion.div>
                </motion.div>
            </section>

            {/* Features */}
            <section id="features" className="relative min-h-screen sm:h-screen sm:snap-start flex flex-col items-center justify-center px-6 py-20 sm:py-0" style={{ background: '#120F17' }}>
                <div className="absolute inset-0 bg-grid-animated pointer-events-none" style={{ opacity: 0.06, maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)' }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(130,87,229,0.08) 0%, transparent 60%)' }} />
                <div className="absolute inset-4 glass-card-strong pointer-events-none z-[1]" />
                <RevealText className="text-center mb-6 sm:mb-12 relative z-10">
                    <motion.span
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-rocket-purple-light bg-rocket-purple/10 mb-4"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        RECURSOS
                    </motion.span>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">Tudo que você precisa</h2>
                    <p className="text-sm sm:text-lg text-[#a0a0b8] max-w-xl mx-auto px-4 sm:px-0">
                        Funcionalidades pensadas para simplificar a gestão da sua agenda.
                    </p>
                </RevealText>
                <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 relative z-10 px-2 sm:px-4">
                    {features.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ delay: i * 0.12, duration: 0.5, ease: 'easeOut' }}
                                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
                                className="glass-card rounded-xl p-4 sm:p-6 hover:border-rocket-purple/40 hover:shadow-xl hover:shadow-rocket-purple/5 transition-all duration-300 group"
                            >
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-rocket-purple/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-rocket-purple/20 transition-colors duration-300">
                                    <motion.div
                                        whileHover={{ rotate: 10 }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-rocket-purple-light" />
                                    </motion.div>
                                </div>
                                <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">{f.title}</h3>
                                <p className="text-[#a0a0b8] text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            <AnimatedTestimonials />

            {/* CTA */}
            <motion.section
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                id="cta" className="relative min-h-screen sm:h-screen sm:snap-start flex flex-col items-center justify-center px-6 py-16 sm:py-0 text-center" style={{ background: '#120F17' }}
            >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(130,87,229,0.1) 0%, transparent 60%)' }} />
                <div className="absolute inset-4 glass-card-strong pointer-events-none z-[1]" />
                <div className="absolute inset-0 bg-grid-animated-reverse pointer-events-none" style={{ opacity: 0.06 }} />
                <RevealText className="max-w-2xl mx-auto relative z-10">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6">
                        Pronto para <span className="text-rocket-purple-light">começar</span>?
                    </h2>
                    <p className="text-sm sm:text-lg text-[#a0a0b8] mb-6 sm:mb-8 px-4 sm:px-0">
                        Crie sua conta em segundos e transforme a gestão da sua agenda.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(130,87,229,0.5)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onEntrar}
                        className="hover:brightness-110 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-sm sm:text-lg font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 mx-auto"
                        style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 4px 24px rgba(130, 87, 229, 0.35)' }}
                    >
                        Acessar o Sistema
                        <motion.div
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <IconArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </motion.div>
                    </motion.button>
                </RevealText>
            </motion.section>

            {/* Footer */}
            <footer className="relative min-h-screen sm:h-screen sm:snap-start flex flex-col items-center justify-center px-6 text-center" style={{ background: '#08080e' }}>
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(130,87,229,0.06) 0%, transparent 50%)' }} />
                <div className="absolute inset-0 bg-grid-pulse pointer-events-none" style={{ opacity: 0.05 }} />
                <RevealText>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative z-10 flex flex-col items-center gap-4 glass-card-strong rounded-2xl px-10 py-12"
                    >
                        <Logo className="w-8 h-8 text-rocket-purple-light" />
                        <p className="text-lg font-semibold">AgendaFlow</p>
                        <p className="text-[#a0a0b8]">&copy; {new Date().getFullYear()} AgendaFlow. Todos os direitos reservados.</p>
                    </motion.div>
                </RevealText>
            </footer>
        </div>
    );
}
