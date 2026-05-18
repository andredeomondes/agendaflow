'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Logo, IconArrowRight, IconCalendar as IconCalendar2, IconCheck, IconMail } from '../components/Icons';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { DEFAULT_DDI, toE164National, phoneNationalDigitsChain } from '../utils/phone';
import PhoneInput from '../components/PhoneInput';

const statusColors = {
    Confirmado: '#10b981',
    Pendente: '#f59e0b',
    Cancelado: '#ef4444',
    Agendado: '#6366f1',
    Concluído: '#374151'
};
const statusLabels = {
    Agendado: 'Agendado', Confirmado: 'Confirmado', Pendente: 'Pendente',
    Cancelado: 'Cancelado', Concluído: 'Concluído'
};

function RegistroCliente({ onVoltar, onLoginSuccess: onLogin }) {
    const showToast = useToast();
    const [nome, setNome] = useState('');
    const [phoneState, setPhoneState] = useState({ ddi: DEFAULT_DDI, number: '' });
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [loading, setLoading] = useState(false);

    const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validarSenha = (senha) => senha.length >= 4;

    const telefoneParaSalvar = toE164National(phoneState.ddi, phoneState.number);

    const [feito, setFeito] = useState(false);
    const handleSubmit = async () => {
        if (!nome || !phoneState.number || !email || !senha || !confirmarSenha)
            return showToast("Preencha todos os campos.", "warning");
        if (!senha) return showToast("Informe a senha.", "warning");

        const phoneValidation = phoneNationalDigitsChain.safeParse(phoneState.number);
        if (!phoneValidation.success)
            return showToast(phoneValidation.error.issues[0].message || "Telefone inválido.", "warning");

        if (!validarSenha(senha)) return showToast("A senha deve ter no mínimo 4 caracteres.", "warning");
        if (!validarEmail(email)) return showToast("Email inválido.", "warning");
        if (senha !== confirmarSenha) return showToast("As senhas não conferem.", "warning");

        setLoading(true);
        try {
            await api.post('/clientes/registro', { nome, telefone: telefoneParaSalvar, email, senha });
            showToast("Cadastro realizado!", "success");
            setFeito(true);
            const loginRes = await api.post('/auth/login-unificado', { email, senha });
            const { token, usuario } = loginRes.data;
            if (onLogin) onLogin(token, usuario);
        } catch (e) {
            showToast(e.response?.data?.erro || "Erro ao cadastrar.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (feito) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="w-14 h-14 rounded-full bg-rocket-purple/20 flex items-center justify-center mx-auto mb-3">
                    <IconMail className="w-7 h-7 text-rocket-purple-light" />
                </div>
                <p className="text-white font-semibold mb-1">Cadastro realizado!</p>
                <p className="text-[#a0a0b8] text-sm mb-2">Enviamos um email de confirmação para <strong className="text-white">{email}</strong>.</p>
                <p className="text-[#a0a0b8] text-xs mb-4">Verifique sua caixa de entrada e clique no link para ativar sua conta.</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onVoltar}
                        className="text-rocket-purple-light hover:text-white text-sm transition-colors cursor-pointer bg-transparent border-none">
                        Ir para o login
                    </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <p className="text-[#a0a0b8] text-sm text-center mb-1">Preencha para se cadastrar.</p>
            <input type="text" placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)}
                className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple transition-all" />
            <PhoneInput
                value={phoneState}
                onChange={setPhoneState}
                placeholder="(DDD) 99999-9999"
            />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple transition-all" />
            <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)}
                className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple transition-all" />
            <input type="password" placeholder="Confirmar senha" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
                className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple transition-all" />
            <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="w-full disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200 cursor-pointer mt-1 flex items-center justify-center gap-2 border-none"
                style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130, 87, 229, 0.3)' }}
            >
                {loading ? (
                    <span className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                    </span>
                ) : (
                    <>Cadastrar <IconArrowRight className="w-4 h-4" /></>
                )}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onVoltar}
                className="text-[#a0a0b8] hover:text-white text-sm mt-1 transition-colors cursor-pointer bg-transparent border-none">
                Voltar
            </motion.button>
        </motion.div>
    );
}

function ConsultaAgendamentos({ onVoltar, onCadastrar }) {
    const showToast = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState('');

    const handleConsultar = async () => {
        if (!email) return showToast("Informe seu email.", "warning");
        setLoading(true);
        setErro('');
        setDados(null);
        try {
            const res = await api.get('/agendamentos/consulta', { params: { email } });
            setDados(res.data);
        } catch (e) {
            const msg = e.response?.data?.erro || "Erro ao consultar.";
            setErro(msg);
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    if (dados) {
        const { cliente, agendamentos } = dados;
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-rocket-purple/20 flex items-center justify-center mx-auto mb-3">
                        <IconCalendar2 className="w-7 h-7 text-rocket-purple-light" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Olá, {cliente.nome}!</h3>
                    <p className="text-[#a0a0b8] text-sm">{agendamentos.length} agendamento(s) encontrado(s)</p>
                </div>
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                    {agendamentos.map(a => (
                        <div key={a.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{a.space?.nome}</p>
                                <p className="text-[#a0a0b8] text-xs">{new Date(a.dataInicio).toLocaleString('pt-BR')} — {new Date(a.dataFim).toLocaleString('pt-BR')}</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{
                                background: `${statusColors[a.status] || '#6366f1'}20`,
                                color: statusColors[a.status] || '#6366f1'
                            }}>
                                {statusLabels[a.status] || a.status}
                            </span>
                        </div>
                    ))}
                    {agendamentos.length === 0 && (
                        <p className="text-[#a0a0b8] text-sm text-center py-4">Nenhum agendamento encontrado.</p>
                    )}
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setDados(null); setEmail(''); }}
                    className="w-full text-[#a0a0b8] hover:text-white text-sm mt-4 transition-colors cursor-pointer bg-transparent border-none">
                    Consultar outro email
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onVoltar}
                    className="w-full text-[#a0a0b8] hover:text-rocket-purple-light text-sm mt-1 transition-colors cursor-pointer bg-transparent border-none">
                    Voltar
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <p className="text-[#a0a0b8] text-sm text-center mb-2">
                Digite seu email para consultar seus agendamentos.
            </p>
            <input type="email" placeholder="Seu email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConsultar()}
                className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all" />
            <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={handleConsultar}
                disabled={loading}
                className="w-full disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200 cursor-pointer mt-2 flex items-center justify-center gap-2 border-none"
                style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130, 87, 229, 0.3)' }}
            >
                {loading ? (
                    <span className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                    </span>
                ) : (
                    <>Consultar <IconArrowRight className="w-4 h-4" /></>
                )}
            </motion.button>
            {erro && <p className="text-red-400 text-xs text-center">{erro}</p>}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onCadastrar}
                className="text-[#a0a0b8] hover:text-rocket-purple-light text-sm mt-1 transition-colors cursor-pointer bg-transparent border-none">
                Não tem cadastro? Clique aqui
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onVoltar}
                className="text-[#a0a0b8] hover:text-white text-sm transition-colors cursor-pointer bg-transparent border-none">
                Voltar
            </motion.button>
        </motion.div>
    );
}

function EsqueciSenha({ onVoltar }) {
    const showToast = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const handleSubmit = async () => {
        if (!email) return showToast("Informe seu email.", "warning");
        setLoading(true);
        try {
            await api.post('/auth/esqueci-senha-cliente', { email });
            setEnviado(true);
            showToast("Email de redefinição enviado! Verifique sua caixa de entrada.", "success");
        } catch (e) {
            showToast(e.response?.data?.erro || "Erro ao redefinir senha.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (enviado) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="w-14 h-14 rounded-full bg-rocket-green/20 flex items-center justify-center mx-auto mb-3">
                    <IconCheck className="w-7 h-7 text-rocket-green" />
                </div>
                <p className="text-white font-semibold mb-1">Email enviado!</p>
                <p className="text-[#a0a0b8] text-sm mb-2">Verifique sua caixa de entrada para redefinir sua senha.</p>
                <p className="text-[#a0a0b8] text-xs mb-4">A senha padrão é: <strong className="text-white">123456</strong></p>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onVoltar}
                    className="text-rocket-purple-light hover:text-white text-sm transition-colors cursor-pointer bg-transparent border-none">
                    Voltar ao login
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <p className="text-[#a0a0b8] text-sm text-center mb-2">
                Digite seu email para redefinir sua senha.
            </p>
            <input type="email" placeholder="Seu email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all" />
            <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="w-full disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200 cursor-pointer mt-2 flex items-center justify-center gap-2 border-none"
                style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130, 87, 229, 0.3)' }}
            >
                {loading ? (
                    <span className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                        <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                    </span>
                ) : (
                    <>Redefinir Senha <IconArrowRight className="w-4 h-4" /></>
                )}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onVoltar}
                className="text-[#a0a0b8] hover:text-white text-sm mt-1 transition-colors cursor-pointer bg-transparent border-none">
                Voltar
            </motion.button>
        </motion.div>
    );
}

function LoginPage({ onLoginSuccess, onClientLoginSuccess }) {
    const showToast = useToast();
    const [activeTab, setActiveTab] = useState('entrar');
    const [emailLogin, setEmailLogin] = useState('');
    const [senhaLogin, setSenhaLogin] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConsulta, setShowConsulta] = useState(false);
    const [showEsqueciSenha, setShowEsqueciSenha] = useState(false);
    const [emailNaoVerificado, setEmailNaoVerificado] = useState(false);
    const [reenviando, setReenviando] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('google_login') === 'error') {
            showToast('Erro ao entrar com Google. Tente novamente.', 'error');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, []);

    const reenviarVerificacao = async () => {
        if (!emailLogin) return showToast("Informe seu email.", "warning");
        setReenviando(true);
        try {
            await api.post('/clientes/reenviar-verificacao', { email: emailLogin });
            showToast("Email de verificação reenviado! Verifique sua caixa de entrada.", "success");
        } catch (e) {
            showToast(e.response?.data?.erro || "Erro ao reenviar.", "error");
        } finally {
            setReenviando(false);
        }
    };

    const handleLogin = async () => {
        if (!emailLogin || !senhaLogin) return showToast("Preencha todos os campos.", "warning");
        setLoading(true);
        setEmailNaoVerificado(false);
        try {
            const res = await api.post('/auth/login-unificado', { email: emailLogin, senha: senhaLogin });
            const { token, usuario, primeiroAcesso } = res.data;
            if (usuario.role === 'admin') {
                onLoginSuccess(token, usuario);
            } else {
                onClientLoginSuccess(token, usuario, primeiroAcesso);
            }
        } catch (e) {
            const data = e.response?.data;
            if (data?.emailNaoVerificado) {
                setEmailNaoVerificado(true);
                showToast(data.erro, "warning");
            } else {
                showToast("Email ou senha inválidos.", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    if (showConsulta) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#120F17' }}>
                <div className="absolute inset-0 bg-grid-animated pointer-events-none" style={{ opacity: 0.15 }} />
                <div className="absolute inset-0 bg-grid-animated-reverse pointer-events-none" style={{ opacity: 0.08 }} />

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-8 w-full max-w-md relative">
                    <div className="text-center mb-6">
                        <Logo className="w-8 h-8 text-rocket-purple-light mx-auto mb-2" />
                        <span className="text-xl font-bold text-white">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                        <p className="text-[#a0a0b8] text-sm mt-1">Consultar Agendamentos</p>
                    </div>
                    <ConsultaAgendamentos
                        onVoltar={() => setShowConsulta(false)}
                        onCadastrar={() => { setShowConsulta(false); setActiveTab('cadastrar'); }}
                    />
                </motion.div>
            </div>
        );
    }

    if (showEsqueciSenha) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#120F17' }}>
                <div className="absolute inset-0 bg-grid-animated pointer-events-none" style={{ opacity: 0.15 }} />
                <div className="absolute inset-0 bg-grid-animated-reverse pointer-events-none" style={{ opacity: 0.08 }} />

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-8 w-full max-w-md relative">
                    <div className="text-center mb-6">
                        <Logo className="w-8 h-8 text-rocket-purple-light mx-auto mb-2" />
                        <span className="text-xl font-bold text-white">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                        <p className="text-[#a0a0b8] text-sm mt-1">Redefinir Senha</p>
                    </div>
                    <EsqueciSenha
                        onVoltar={() => setShowEsqueciSenha(false)}
                    />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#120F17' }}>
            <div className="absolute inset-0 bg-grid-animated pointer-events-none" style={{ opacity: 0.15 }} />
            <div className="absolute inset-0 bg-grid-animated-reverse pointer-events-none" style={{ opacity: 0.08 }} />
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-card rounded-2xl p-8 w-full max-w-md relative"
            >
                <div className="text-center mb-8">
                    <motion.div
                        className="flex items-center justify-center gap-2.5 mb-3"
                    >
                        <Logo className="w-8 h-8 text-rocket-purple-light" />
                        <span className="text-2xl font-bold text-white">Agenda<span className="text-rocket-purple-light">Flow</span></span>
                    </motion.div>
                </div>

                <div className="flex mb-6 bg-black/30 rounded-lg p-1">
                    <motion.button
                        onClick={() => setActiveTab('entrar')}
                        className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer border-none ${activeTab === 'entrar' ? 'bg-rocket-purple text-white shadow-lg shadow-rocket-purple/20' : 'text-[#a0a0b8] hover:text-white bg-transparent'}`}>
                        Entrar
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveTab('cadastrar')}
                        className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer border-none ${activeTab === 'cadastrar' ? 'bg-rocket-purple text-white shadow-lg shadow-rocket-purple/20' : 'text-[#a0a0b8] hover:text-white bg-transparent'}`}>
                        Cadastrar
                    </motion.button>
                </div>

                {activeTab === 'entrar' ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                        <p className="text-[#a0a0b8] text-sm text-center mb-1">Entre com seu email e senha.</p>
                        <input type="email" placeholder="Email" value={emailLogin} onChange={e => setEmailLogin(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all" />
                        <input type="password" placeholder="Senha" value={senhaLogin} onChange={e => setSenhaLogin(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            className="w-full glass-input rounded-lg px-4 py-3 text-white placeholder-[#a0a0b8] focus:outline-none focus:border-rocket-purple focus:shadow-[0_0_0_1px_rgba(130,87,229,0.3)] transition-all" />

                        <motion.button
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200 cursor-pointer mt-2 flex items-center justify-center gap-2 border-none"
                            style={{ background: 'linear-gradient(135deg, #8257e5, #633bbc)', boxShadow: '0 2px 16px rgba(130, 87, 229, 0.3)' }}
                        >
                            {loading ? (
                                <span className="flex gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                </span>
                            ) : (
                                <>Entrar <IconArrowRight className="w-4 h-4" /></>
                            )}
                        </motion.button>

                        <div className="flex items-center gap-3 my-1">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-xs text-[#a0a0b8]">ou</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                                setGoogleLoading(true);
                                try {
                                    const res = await api.get('/auth/google');
                                    if (res.data.url) window.location.href = res.data.url;
                                } catch (e) {
                                    showToast('Erro ao conectar com Google.', 'error');
                                    setGoogleLoading(false);
                                }
                            }}
                            disabled={googleLoading}
                            className="w-full disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 border border-white/20 bg-white/5 hover:bg-white/10"
                        >
                            {googleLoading ? (
                                <span className="flex gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                    <span className="w-2 h-2 rounded-full bg-white loading-dot" />
                                </span>
                            ) : (
                                <><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                Entrar com Google</>
                            )}
                        </motion.button>

                        {emailNaoVerificado && (
                            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 text-center">
                                <p className="text-yellow-400 text-xs mb-2">
                                    Seu email ainda não foi confirmado. Verifique sua caixa de entrada ou reenvie o email.
                                </p>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={reenviarVerificacao} disabled={reenviando}
                                    className="text-yellow-400 hover:text-white text-xs font-medium underline cursor-pointer bg-transparent border-none disabled:opacity-50">
                                    {reenviando ? 'Reenviando...' : 'Reenviar email de verificação'}
                                </motion.button>
                            </div>
                        )}

                        <motion.button
                            onClick={() => setShowEsqueciSenha(true)}
                            className="text-[#a0a0b8] hover:text-rocket-purple-light text-sm mt-1 transition-colors cursor-pointer bg-transparent border-none">
                            Esqueci minha senha
                        </motion.button>
                        <motion.button
                            onClick={() => setShowConsulta(true)}
                            className="text-[#a0a0b8] hover:text-rocket-purple-light text-sm mt-1 transition-colors cursor-pointer bg-transparent border-none">
                            Consultar agendamentos sem entrar
                        </motion.button>
                    </motion.div>
                ) : (
                    <RegistroCliente onVoltar={() => setActiveTab('entrar')} onLoginSuccess={onClientLoginSuccess} />
                )}
            </motion.div>
        </div>
    );
}

export default LoginPage;
