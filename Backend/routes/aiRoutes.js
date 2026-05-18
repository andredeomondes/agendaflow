const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const auth = require('../middlewares/authMiddleware');
const { montarContextoAdmin, montarContextoCliente } = require('../services/aiContext');
const { executarFerramenta, ferramentasPorRole } = require('../services/aiToolExecutor');

// ─── Provedor de IA configurável via .env ─────────────────────────────────────
// AI_PROVIDER=mistral → Mistral AI (recomendado)
// AI_PROVIDER=gemini  → Google Gemini 2.0 Flash Lite
// AI_PROVIDER=groq    → Groq
const AI_PROVIDER = process.env.AI_PROVIDER || 'mistral';

function criarCliente() {
    if (AI_PROVIDER === 'groq') {
        return {
            client: new OpenAI({
                apiKey: process.env.GROQ_API_KEY || 'noop',
                baseURL: 'https://api.groq.com/openai/v1'
            }),
            model: process.env.AI_MODEL || 'llama-3.3-70b-versatile'
        };
    }
    if (AI_PROVIDER === 'gemini') {
        return {
            client: new OpenAI({
                apiKey: process.env.GOOGLE_AI_API_KEY || 'noop',
                baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
            }),
            model: process.env.AI_MODEL || 'gemini-2.0-flash-lite'
        };
    }
    // mistral (padrão)
    return {
        client: new OpenAI({
            apiKey: process.env.MISTRAL_API_KEY || 'noop',
            baseURL: 'https://api.mistral.ai/v1'
        }),
        model: process.env.AI_MODEL || 'mistral-small-latest'
    };
}

let _aiProvider = null;
function getAIProvider() {
    if (!_aiProvider) _aiProvider = criarCliente();
    return _aiProvider;
}
console.log(`[IA] Provedor: ${AI_PROVIDER}`);

// Extrai chips clicáveis da última resposta de ferramenta relevante
function extrairOpcoes(messages) {
    const toolMsgs = messages.filter(m => m.role === 'tool');
    const opcoes = [];
    for (let i = toolMsgs.length - 1; i >= 0; i--) {
        try {
            const dados = JSON.parse(toolMsgs[i].content);
            // Lista de espaços
            if (Array.isArray(dados) && dados[0]?.capacidade !== undefined) {
                dados.forEach(e => { if (e.disponivel !== false) opcoes.push(e.nome); });
                break;
            }
            // Resultado de buscar_slots com lista de horários
            if (dados?.slots?.length > 0) {
                dados.slots.forEach(s => opcoes.push(s.inicio));
                break;
            }
            // Lista de clientes (múltiplos resultados)
            if (Array.isArray(dados) && dados[0]?.email !== undefined && dados.length > 1) {
                dados.forEach(c => opcoes.push(c.nome));
                break;
            }
        } catch { /* ignorar */ }
    }
    return opcoes;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_ADMIN = `Voce e o assistente IA do AgendaFlow com acesso TOTAL ao sistema.
Fale sempre em portugues, seja objetivo e profissional.

CAPACIDADES COMPLETAS:
- Agendamentos: criar, cancelar, confirmar, listar por dia/data, ver slots livres
- Clientes: listar, buscar, criar, atualizar, analisar, deletar
- Espacos: listar, criar, atualizar (nome/capacidade/status), desativar
- Configuracao: ver e atualizar horarios, duracao, intervalo, dias de funcionamento

FLUXO PARA CRIAR AGENDAMENTO — SEJA PROATIVO, NAO PERGUNTE O QUE PODE DESCOBRIR:
1. Busque o cliente pelo nome/email
2. NA MESMA RESPOSTA: chame buscar_slots_admin para cada espaco no proximo dia util disponivel (use a data do CONTEXTO como referencia)
3. Apresente tudo de uma vez: cliente encontrado + espaços com vagas + horarios disponiveis
4. Aguarde o usuario escolher espaco e horario em UMA so mensagem
5. Confirme resumidamente (cliente, espaco, horario) e crie sem pedir nova confirmacao se o usuario ja disse "sim" ou escolheu claramente
6. Informe o resultado

EXEMPLO DE BOA RESPOSTA APOS ENCONTRAR CLIENTE:
"Maria Beatriz encontrada. Próximo dia: segunda 18/05. Vagas:
• Sala A: 08:00 09:00 10:00...
• Sala B: 08:00 09:00 10:00...
Qual espaço e horário?"

REGRAS:
- Maximo 500 caracteres por resposta
- Nunca pergunte data/espaco separadamente se pode buscar automaticamente
- Acoes destrutivas (cancelar, deletar): confirme antes com um resumo curto
- Para criar espaco ou configurar agenda, execute direto ao receber os dados
- Nunca invente dados — use apenas retornos das ferramentas`;

const SYSTEM_PROMPT_CLIENT = `Voce e o assistente IA do AgendaFlow para atender o cliente com excelencia.
Fale sempre em portugues, seja acolhedor, claro e proativo.

CAPACIDADES:
- Ver e gerenciar meus agendamentos
- Agendar novos horarios
- Cancelar agendamentos
- Ver e atualizar meu perfil (nome, telefone)
- Tirar duvidas sobre horarios e regras

FLUXO OBRIGATORIO PARA AGENDAR:
1. Mostre os espacos disponiveis do CONTEXTO (com ID e nome) — nao espere o cliente perguntar
2. Pergunte qual espaco e qual data o cliente deseja
3. Chame buscar_slots com o spaceId e a data informados
4. Apresente os horarios disponiveis (campo slots[])
5. Se o horario pedido nao existir, oferea o mais proximo e explique
6. Se o dia nao tiver atendimento, explique e sugira o campo proximaData do retorno
7. Confirme: espaco, data e horario antes de criar
8. Crie com criar_meu_agendamento usando dataInicio e dataFim do campo slots[]

REGRAS:
- Maximo 400 caracteres por resposta
- Se buscar_slots retornar slots[] vazio: leia o campo "mensagem" e explique
- Se o cliente pedir "16h40" e o horario mais proximo for "17h", explique e oferea
- Para cancelar: confirme o agendamento pelo ID antes de executar
- Seja sempre solícito — antecipe o proximo passo para o cliente`;

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

// Detecta intenção e retorna só as ferramentas necessárias (economiza ~50% de tokens)
function selecionarFerramentas(mensagem, historico, role) {
    const texto = [mensagem, ...historico.slice(-4).map(m => (typeof m.content === 'string' ? m.content : ''))]
        .join(' ').toLowerCase();

    if (role === 'client') {
        const agendar  = /agend|horari|slot|reserv|marcar|disponiv|quero|sala|espaco/i.test(texto);
        const cancelar = /cancel|desmarcar/i.test(texto);
        const perfil   = /perfil|meu nome|meu tel|meus dados|atualiz/i.test(texto);
        const listar   = /meus agend|ver agend|tenho agend|histórico/i.test(texto);

        const t = new Set(['perguntar_faq']);
        if (cancelar || listar) { t.add('meus_agendamentos'); }
        if (cancelar) { t.add('cancelar_meu_agendamento'); }
        if (perfil)   { t.add('ver_meu_perfil'); t.add('atualizar_meu_perfil'); }
        if (agendar || t.size <= 1) { t.add('buscar_slots'); t.add('criar_meu_agendamento'); }
        return [...t].filter(n => ferramentasPorRole.client.includes(n));
    }

    // Admin
    const agendar  = /agend|horari|slot|reserv|marcar|disponiv/i.test(texto);
    const cancelar = /cancel|desmarcar/i.test(texto);
    const cliente  = /cliente|cadastr|buscar|encontr|email/i.test(texto);
    const espaco   = /espaco|sala|ambiente/i.test(texto);
    const config   = /configur|funcionamento|duracao|intervalo|dias.*func/i.test(texto);
    const listar   = /list|hoje|agendamento|agenda/i.test(texto);

    const t = new Set();
    if (agendar)  { t.add('buscar_cliente_por_nome'); t.add('buscar_slots_admin'); t.add('criar_agendamento'); t.add('listar_espacos'); t.add('listar_agendamentos_por_data'); }
    if (cancelar) { t.add('cancelar_agendamento'); t.add('atualizar_status_agendamento'); t.add('listar_agendamentos_hoje'); t.add('listar_agendamentos_por_data'); }
    if (listar)   { t.add('listar_agendamentos_hoje'); t.add('listar_agendamentos_por_data'); }
    if (cliente)  { t.add('listar_clientes'); t.add('buscar_cliente_por_nome'); t.add('buscar_cliente_por_email'); t.add('criar_cliente'); t.add('atualizar_cliente'); t.add('deletar_cliente'); t.add('analisar_cliente'); }
    if (espaco)   { t.add('listar_espacos'); t.add('criar_espaco'); t.add('atualizar_espaco'); t.add('deletar_espaco'); }
    if (config)   { t.add('ver_configuracao'); t.add('atualizar_configuracao'); }

    // fallback se nenhuma intenção detectada
    if (t.size === 0) {
        ['listar_agendamentos_hoje', 'buscar_cliente_por_nome', 'buscar_slots_admin',
         'criar_agendamento', 'cancelar_agendamento', 'listar_espacos'].forEach(n => t.add(n));
    }
    return [...t].filter(n => ferramentasPorRole.admin.includes(n));
}

router.post('/ask', auth, async (req, res) => {
    const { mensagem, historico = [] } = req.body;
    const role = req.userRole;

    if (!mensagem || mensagem.trim().length === 0) {
        return res.status(400).json({ erro: 'Mensagem vazia' });
    }

    try {
        const isAdmin = role === 'admin';
        const contexto = isAdmin
            ? await montarContextoAdmin(req.userId)
            : await montarContextoCliente(req.userId);

        const nomesFerramentas = selecionarFerramentas(mensagem, historico, role);
        const tools = nomesFerramentas.map(nome => {
            const def = toolDefinitions[nome];
            return def ? { type: 'function', function: def } : null;
        }).filter(Boolean);

        const systemPrompt = (isAdmin ? SYSTEM_PROMPT_ADMIN : SYSTEM_PROMPT_CLIENT)
            + '\n\n## CONTEXTO ATUAL:\n' + contexto;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...historico.slice(-8),
            { role: 'user', content: mensagem }
        ];

        const maxIteracoes = 8;

        const { client: aiClient, model: aiModel } = getAIProvider();

        for (let i = 0; i < maxIteracoes; i++) {
            const completion = await aiClient.chat.completions.create({
                model: aiModel,
                messages,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: tools.length > 0 ? 'auto' : undefined,
                temperature: 0.2,
                max_tokens: 350
            });

            const choice = completion.choices[0];
            if (!choice) {
                return res.json({ resposta: 'Nao consegui processar. Tente novamente.', finalizada: true });
            }

            const msg = choice.message;

            if (!msg.tool_calls || msg.tool_calls.length === 0) {
                const opcoes = extrairOpcoes(messages);
                return res.json({ resposta: (msg.content || 'Pronto!').slice(0, 500), opcoes, finalizada: true });
            }

            messages.push(msg);

            for (const toolCall of msg.tool_calls) {
                let args = {};
                try { args = JSON.parse(toolCall.function.arguments); } catch {}

                const resultado = await executarFerramenta(toolCall.function.name, args, role, req.userId);

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(resultado)
                });
            }
        }

        // Forçar resposta textual após max iterações
        const finalCompletion = await aiClient.chat.completions.create({
            model: aiModel,
            messages,
            temperature: 0.2,
            max_tokens: 300
        });
        const textoFinal = (finalCompletion.choices[0]?.message?.content || 'Pronto! Como posso ajudar?').slice(0, 500);
        const opcoes = extrairOpcoes(messages);
        return res.json({ resposta: textoFinal, opcoes, finalizada: true });

    } catch (error) {
        console.error('Erro no assistente IA:', error);

        // Groq/OpenAI rate limit
        if (error.status === 429) {
            const retryAfter = error.headers?.get?.('retry-after');
            const minutos = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 30;
            const msgLimite = `⚠️ Limite de uso da IA atingido. Aguarde ${minutos} minuto(s) e tente novamente.`;
            return res.status(429).json({ resposta: msgLimite, finalizada: true });
        }

        res.status(500).json({ resposta: 'Erro interno. Tente novamente.', erro: error.message, finalizada: true });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFINICOES DAS FERRAMENTAS
// ─────────────────────────────────────────────────────────────────────────────

const toolDefinitions = {

    // ── Admin: Agendamentos ──────────────────────────────────────────────────

    criar_agendamento: {
        name: 'criar_agendamento',
        description: 'Cria um agendamento para um cliente. Use buscar_slots_admin antes para garantir que o horario esta livre.',
        parameters: {
            type: 'object',
            properties: {
                clientId: { type: 'number', description: 'ID do cliente (use buscar_cliente_por_nome se nao souber)' },
                spaceId: { type: 'number', description: 'ID do espaco (visivel no contexto ou use listar_espacos)' },
                dataInicio: { type: 'string', description: 'ISO datetime ex: 2026-05-20T09:00:00' },
                dataFim: { type: 'string', description: 'ISO datetime ex: 2026-05-20T09:50:00' },
                status: { type: 'string', enum: ['Agendado', 'Confirmado', 'Pendente'], description: 'Padrao: Agendado' }
            },
            required: ['clientId', 'spaceId', 'dataInicio', 'dataFim']
        }
    },

    cancelar_agendamento: {
        name: 'cancelar_agendamento',
        description: 'Cancela um agendamento pelo ID. Confirme com o admin antes.',
        parameters: {
            type: 'object',
            properties: { id: { type: 'number', description: 'ID do agendamento' } },
            required: ['id']
        }
    },

    atualizar_status_agendamento: {
        name: 'atualizar_status_agendamento',
        description: 'Muda o status de um agendamento (confirmar, concluir, etc)',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'ID do agendamento' },
                status: { type: 'string', enum: ['Agendado', 'Confirmado', 'Pendente', 'Cancelado', 'Concluído'] }
            },
            required: ['id', 'status']
        }
    },

    listar_agendamentos_hoje: {
        name: 'listar_agendamentos_hoje',
        description: 'Lista agendamentos de hoje',
        parameters: { type: 'object', properties: {} }
    },

    listar_agendamentos_por_data: {
        name: 'listar_agendamentos_por_data',
        description: 'Lista agendamentos de uma data especifica',
        parameters: {
            type: 'object',
            properties: { data: { type: 'string', description: 'Data YYYY-MM-DD' } },
            required: ['data']
        }
    },

    buscar_slots_admin: {
        name: 'buscar_slots_admin',
        description: 'Busca horarios livres para um espaco numa data. Retorna slots[] com dataInicio/dataFim/inicio/fim.',
        parameters: {
            type: 'object',
            properties: {
                spaceId: { type: 'number', description: 'ID do espaco' },
                data: { type: 'string', description: 'Data YYYY-MM-DD' }
            },
            required: ['spaceId', 'data']
        }
    },

    // ── Admin: Clientes ──────────────────────────────────────────────────────

    listar_clientes: {
        name: 'listar_clientes',
        description: 'Lista todos os clientes com ID, nome, email e telefone',
        parameters: { type: 'object', properties: {} }
    },

    buscar_cliente_por_nome: {
        name: 'buscar_cliente_por_nome',
        description: 'Busca clientes pelo nome (parcial)',
        parameters: {
            type: 'object',
            properties: { nome: { type: 'string', description: 'Nome ou parte do nome' } },
            required: ['nome']
        }
    },

    buscar_cliente_por_email: {
        name: 'buscar_cliente_por_email',
        description: 'Busca um cliente pelo email exato',
        parameters: {
            type: 'object',
            properties: { email: { type: 'string', description: 'Email do cliente' } },
            required: ['email']
        }
    },

    analisar_cliente: {
        name: 'analisar_cliente',
        description: 'Analisa historico, frequencia e preferencias de um cliente',
        parameters: {
            type: 'object',
            properties: { clientId: { type: 'number', description: 'ID do cliente' } },
            required: ['clientId']
        }
    },

    criar_cliente: {
        name: 'criar_cliente',
        description: 'Cadastra um novo cliente no sistema',
        parameters: {
            type: 'object',
            properties: {
                nome: { type: 'string', description: 'Nome completo' },
                email: { type: 'string', description: 'Email (unico)' },
                telefone: { type: 'string', description: 'Telefone (opcional)' },
                senha: { type: 'string', description: 'Senha inicial (opcional, gera automatico se omitido)' }
            },
            required: ['nome', 'email']
        }
    },

    atualizar_cliente: {
        name: 'atualizar_cliente',
        description: 'Atualiza dados de um cliente existente',
        parameters: {
            type: 'object',
            properties: {
                clientId: { type: 'number', description: 'ID do cliente' },
                nome: { type: 'string', description: 'Novo nome (opcional)' },
                email: { type: 'string', description: 'Novo email (opcional)' },
                telefone: { type: 'string', description: 'Novo telefone (opcional)' }
            },
            required: ['clientId']
        }
    },

    deletar_cliente: {
        name: 'deletar_cliente',
        description: 'Remove um cliente. Falha se tiver agendamentos ativos. Confirme antes.',
        parameters: {
            type: 'object',
            properties: { clientId: { type: 'number', description: 'ID do cliente' } },
            required: ['clientId']
        }
    },

    // ── Admin: Espacos ───────────────────────────────────────────────────────

    listar_espacos: {
        name: 'listar_espacos',
        description: 'Lista todos os espacos (ativos e inativos) com IDs',
        parameters: { type: 'object', properties: {} }
    },

    criar_espaco: {
        name: 'criar_espaco',
        description: 'Cria um novo espaco de atendimento',
        parameters: {
            type: 'object',
            properties: {
                nome: { type: 'string', description: 'Nome do espaco' },
                capacidade: { type: 'number', description: 'Capacidade simultanea (padrao: 1)' },
                disponivel: { type: 'boolean', description: 'Disponivel para agendamento (padrao: true)' }
            },
            required: ['nome']
        }
    },

    atualizar_espaco: {
        name: 'atualizar_espaco',
        description: 'Atualiza nome, capacidade ou disponibilidade de um espaco',
        parameters: {
            type: 'object',
            properties: {
                spaceId: { type: 'number', description: 'ID do espaco' },
                nome: { type: 'string', description: 'Novo nome (opcional)' },
                capacidade: { type: 'number', description: 'Nova capacidade (opcional)' },
                disponivel: { type: 'boolean', description: 'Ativar/desativar (opcional)' }
            },
            required: ['spaceId']
        }
    },

    deletar_espaco: {
        name: 'deletar_espaco',
        description: 'Desativa um espaco. Falha se tiver agendamentos ativos. Confirme antes.',
        parameters: {
            type: 'object',
            properties: { spaceId: { type: 'number', description: 'ID do espaco' } },
            required: ['spaceId']
        }
    },

    // ── Admin: Configuracao ──────────────────────────────────────────────────

    ver_configuracao: {
        name: 'ver_configuracao',
        description: 'Mostra a configuracao atual da agenda (horarios, duracao, dias)',
        parameters: { type: 'object', properties: {} }
    },

    atualizar_configuracao: {
        name: 'atualizar_configuracao',
        description: 'Atualiza configuracoes da agenda. diasFuncionamento usa numeros: 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab',
        parameters: {
            type: 'object',
            properties: {
                horaInicio: { type: 'string', description: 'Hora de abertura ex: 08:00' },
                horaFim: { type: 'string', description: 'Hora de fechamento ex: 18:00' },
                duracaoAtendimento: { type: 'number', description: 'Minutos por agendamento ex: 50' },
                intervaloEntreAtend: { type: 'number', description: 'Minutos de intervalo entre atendimentos ex: 10' },
                diasFuncionamento: { type: 'string', description: 'Dias separados por virgula ex: 1,2,3,4,5 (seg-sex)' }
            }
        }
    },

    // ── Cliente: Agendamentos ────────────────────────────────────────────────

    meus_agendamentos: {
        name: 'meus_agendamentos',
        description: 'Lista os agendamentos do cliente logado (ativos e historico)',
        parameters: { type: 'object', properties: {} }
    },

    buscar_slots: {
        name: 'buscar_slots',
        description: 'Busca horarios disponiveis para um espaco numa data. Retorna slots[] com inicio/fim e dataInicio/dataFim ISO. Se dia fechado, retorna proximaData.',
        parameters: {
            type: 'object',
            properties: {
                spaceId: { type: 'number', description: 'ID do espaco (visivel no contexto)' },
                data: { type: 'string', description: 'Data YYYY-MM-DD' }
            },
            required: ['spaceId', 'data']
        }
    },

    criar_meu_agendamento: {
        name: 'criar_meu_agendamento',
        description: 'Cria agendamento para o proprio cliente. Use os campos dataInicio e dataFim retornados por buscar_slots.',
        parameters: {
            type: 'object',
            properties: {
                spaceId: { type: 'number', description: 'ID do espaco' },
                dataInicio: { type: 'string', description: 'ISO datetime do inicio (do campo slots[].dataInicio)' },
                dataFim: { type: 'string', description: 'ISO datetime do fim (do campo slots[].dataFim)' }
            },
            required: ['spaceId', 'dataInicio', 'dataFim']
        }
    },

    cancelar_meu_agendamento: {
        name: 'cancelar_meu_agendamento',
        description: 'Cancela um agendamento do proprio cliente pelo ID',
        parameters: {
            type: 'object',
            properties: { id: { type: 'number', description: 'ID do agendamento (visivel em meus_agendamentos)' } },
            required: ['id']
        }
    },

    // ── Cliente: Perfil ──────────────────────────────────────────────────────

    ver_meu_perfil: {
        name: 'ver_meu_perfil',
        description: 'Mostra os dados do perfil do cliente logado',
        parameters: { type: 'object', properties: {} }
    },

    atualizar_meu_perfil: {
        name: 'atualizar_meu_perfil',
        description: 'Atualiza nome e/ou telefone do cliente logado',
        parameters: {
            type: 'object',
            properties: {
                nome: { type: 'string', description: 'Novo nome (opcional)' },
                telefone: { type: 'string', description: 'Novo telefone (opcional)' }
            }
        }
    },

    // ── Cliente: Info ────────────────────────────────────────────────────────

    perguntar_faq: {
        name: 'perguntar_faq',
        description: 'Responde duvidas sobre horarios de funcionamento, duracao, cancelamento e regras',
        parameters: { type: 'object', properties: {} }
    }
};

module.exports = router;
