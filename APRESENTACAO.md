# AgendaFlow
### Sistema Inteligente de Agendamento com IA

---

## O que é o AgendaFlow?

O **AgendaFlow** é uma plataforma completa de gestão de agendamentos voltada para negócios que precisam organizar atendimentos com clientes. O sistema oferece:

- **Painel do Administrador** — visualização em calendário, gestão de clientes, espaços, bloqueios e configurações
- **Portal do Cliente** — agendamento self-service, histórico, cancelamentos e perfil
- **Assistente de IA** — chat que entende linguagem natural e executa ações reais no sistema (agendar, consultar, cancelar)
- **Notificações automáticas** — confirmações, cancelamentos e lembretes por e-mail e WhatsApp
- **Integração com Google Agenda** — eventos sincronizados automaticamente no calendário do admin e do cliente

---

## Stack Tecnológica

| Camada | Tecnologia | Onde roda |
|--------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) | Vercel |
| **Backend** | Node.js + Express.js | Railway |
| **Banco de Dados** | PostgreSQL (Supabase) | Supabase Cloud |
| **ORM** | Prisma 7 | — |
| **Autenticação** | JWT (jsonwebtoken) | — |
| **UI / Estilos** | Tailwind CSS + Framer Motion | — |
| **Calendário** | react-big-calendar | — |
| **IA** | Mistral AI (`mistral-small-latest`) | Mistral Cloud |
| **E-mail** | Nodemailer (SMTP Gmail) | Railway |
| **WhatsApp** | Baileys (WhatsApp Web protocol) | Railway |
| **Google Agenda** | Google Calendar API v3 (OAuth2) | — |

---

## Banco de Dados

### Modelagem com Prisma + PostgreSQL

O banco foi modelado com **7 entidades** principais:

```
User          → Admin do sistema (login, Google Calendar, agendamentos)
Client        → Clientes que agendam (login próprio, Google Calendar)
Space         → Espaços/salas disponíveis para agendamento
Appointment   → Agendamentos (relaciona Client + Space + User)
Bloqueio      → Períodos bloqueados por espaço (manutenção, feriado etc.)
Lembrete      → Registro de lembretes enviados (evita duplicatas)
ConfigAgenda  → Configuração global: horários, dias e duração dos slots
```

### Diagrama de Relacionamentos

```
User ──────────────────┐
                        ↓
Client ──── Appointment ──── Space
              │
              └──── Lembrete

Space ──── Bloqueio

ConfigAgenda (global, sem chave estrangeira)
```

### Como os slots são gerados

A `ConfigAgenda` define:
- **Horário de funcionamento** (ex: 08:00 às 18:00)
- **Duração do atendimento** (ex: 50 minutos)
- **Intervalo entre atendimentos** (ex: 10 minutos)
- **Dias de funcionamento** (ex: segunda a sexta)

O backend divide o dia em slots fixos, verifica bloqueios e agendamentos simultâneos, e retorna apenas os horários disponíveis — tudo em tempo real.

> **Timezone:** O servidor Railway roda em UTC. Para garantir horários corretos em Brasília (UTC-3), todos os cálculos usam `Date.UTC(ano, mes, dia, hora + 3, min, 0)` em vez de `setHours()`.

---

## Frontend

### Next.js 15 — App Router

O frontend é dividido em duas experiências distintas:

#### Painel do Admin
- Visão em **calendário interativo** (react-big-calendar) com navegação por mês/semana/dia
- Modal de detalhes ao clicar em um agendamento com opção de cancelar ou alterar status
- CRUD completo de clientes, espaços e bloqueios
- Configuração da agenda (horários, duração, dias de funcionamento)
- Integração com Google Calendar (botão de conectar/desconectar)
- Status do WhatsApp e QR Code para conectar

#### Portal do Cliente
- Login com email/senha ou **login social com Google**
- **Mini calendário visual** para seleção de data (componente custom sem dependência externa)
- Grade de horários disponíveis com seleção múltipla de slots
- Histórico de agendamentos com status em tempo real
- Perfil editável (nome, telefone, senha)
- Integração opcional com Google Calendar

#### Componentes-chave

| Componente | Função |
|-----------|--------|
| `CalendarView.jsx` | Calendário do admin (react-big-calendar, controlado) |
| `MiniCalendar.jsx` | Seletor de data visual no portal do cliente |
| `AIAssistant.jsx` | Chat flutuante com IA, chips clicáveis e formatação rich text |
| `ConfirmDialog.jsx` | Modal de confirmação reutilizável |
| `PhoneInput.jsx` | Input de telefone com DDI |
| `SkeletonLoader.jsx` | Loading states |

---

## Backend

### Express.js — API REST

O backend expõe **12 grupos de rotas**:

| Rota | Descrição |
|------|-----------|
| `/api/auth` | Login unificado (admin/cliente), JWT |
| `/api/clientes` | CRUD de clientes (admin) |
| `/api/client-auth` | Registro, login e perfil do cliente |
| `/api/agendamentos` | CRUD de agendamentos, slots disponíveis, self-service |
| `/api/espacos` | CRUD de espaços |
| `/api/bloqueios` | Bloqueios de horário por espaço |
| `/api/config` | Configuração da agenda |
| `/api/google` | OAuth2 Google Calendar (admin + cliente) |
| `/api/auth/google` | Login social do cliente via Google |
| `/api/whatsapp` | Status, QR Code, conectar/desconectar |
| `/api/ai` | Chat com assistente IA |

### Serviços principais

```
emailService.js         → 8 tipos de email com templates HTML responsivos
whatsappService.js      → Conexão Baileys, envio para cliente e admin
googleCalendarService.js → OAuth2, criar/deletar eventos (admin e cliente)
lembreteScheduler.js    → Cron jobs: lembrete 1 dia, 1 hora, 10 minutos
aiToolExecutor.js       → Executor seguro de ferramentas da IA
appointmentValidator.js → Validação centralizada de regras de negócio
```

### Validação de Agendamentos

Antes de criar qualquer agendamento (pelo admin, pelo cliente ou pela IA), o `appointmentValidator` verifica **5 regras em sequência**:

1. Datas válidas e início < fim
2. Não é data passada
3. Espaço existe e está ativo
4. Dia da semana dentro dos dias de funcionamento
5. Horário dentro do período configurado
6. Não há bloqueio no período
7. Capacidade do espaço não foi atingida

---

## Integrações

### Google Agenda (OAuth2)

O agendamento pode ser sincronizado com o Google Calendar de **admin e cliente** separadamente.

**Fluxo:**
1. Usuário clica em "Conectar Google Agenda"
2. Backend gera URL de autorização OAuth2 com escopo `calendar`
3. Google redireciona de volta com um código de autorização
4. Backend troca o código por um `refresh_token` e salva no banco
5. A partir daí, ao criar/cancelar agendamentos, eventos são criados/deletados automaticamente no Google Calendar

**Diferencial:** O login social do cliente com Google já solicita o escopo `calendar` — o cliente entra e já tem o calendário conectado automaticamente.

---

### E-mail (Nodemailer + Gmail SMTP)

São **8 tipos de email** disparados automaticamente:

| Evento | Para quem | Cor do tema |
|--------|-----------|-------------|
| Cadastro realizado | Cliente | Roxo |
| Agendamento criado | Cliente | Verde |
| Agendamento criado | Admin | Roxo |
| Agendamento cancelado | Cliente | Vermelho |
| Agendamento cancelado | Admin | Vermelho |
| Lembrete 1 dia antes | Cliente | Roxo |
| Lembrete 1 hora antes | Cliente | Âmbar |
| Lembrete 10 min antes | Cliente | Vermelho urgente |

Os lembretes são disparados por **3 cron jobs** rodando no Railway:
- `0 9 * * *` — checa agendamentos do dia seguinte
- `0 * * * *` — checa agendamentos na próxima hora
- `*/10 * * * *` — checa agendamentos nos próximos 10 minutos

O sistema registra cada lembrete enviado na tabela `Lembrete` para evitar duplicatas.

---

### WhatsApp (Baileys)

O backend conecta ao WhatsApp via **Baileys** — uma implementação do protocolo WhatsApp Web em Node.js (sem API oficial, sem custo).

**Como funciona:**
1. Admin escaneia o QR Code no painel
2. O backend mantém a sessão persistida em disco (`.whatsapp-session/`)
3. A partir daí, envia mensagens automaticamente como o próprio WhatsApp do negócio

**Notificações enviadas:**
- Cliente recebe confirmação e cancelamento de agendamento
- Admin recebe mensagem na **própria conversa consigo mesmo** (similar ao "Mensagens Salvas") com os dados do cliente

> O Baileys roda somente no Railway — no Vercel (serverless) ele é desabilitado automaticamente via `process.env.VERCEL`.

---

## Inteligência Artificial

### Como a IA funciona

O assistente usa o modelo **Mistral AI** (`mistral-small-latest`) via API compatível com OpenAI. O chat aceita linguagem natural tanto do admin quanto do cliente.

**Fluxo de uma conversa:**

```
Usuário: "Agende o João amanhã às 9h na Sala A"
   ↓
IA recebe a mensagem + histórico + system prompt
   ↓
IA decide chamar ferramentas (Tool Calling):
  1. buscar_cliente_por_nome({ nome: "João" })
  2. buscar_slots_admin({ spaceId: 1, data: "2026-05-18" })
  3. criar_agendamento({ clientId: 5, spaceId: 1, dataInicio: ..., dataFim: ... })
   ↓
Cada ferramenta retorna resultado ao modelo
   ↓
IA formula resposta em português e sugere próximos passos
```

### A IA tem acesso direto ao banco de dados?

**Não.** A IA **não executa SQL** e **não tem acesso direto ao banco**.

Ela só pode chamar ferramentas pré-definidas no `aiToolExecutor.js`. Cada ferramenta é uma função Node.js que:

1. Recebe argumentos estruturados (tipados)
2. Valida as regras de negócio (usando o `appointmentValidator`)
3. Chama o Prisma para acessar o banco
4. Retorna apenas os dados necessários

```
IA (modelo de linguagem)
     │
     │ chama ferramenta por nome
     ↓
aiToolExecutor.js
     │
     ├─ valida inputs
     ├─ aplica regras de negócio (appointmentValidator)
     ├─ chama Prisma ORM
     └─ retorna resultado estruturado
```

### Ferramentas disponíveis por perfil

**Admin** pode:
```
criar_agendamento       listar_agendamentos_hoje
cancelar_agendamento    listar_agendamentos_por_data
atualizar_status        buscar_slots_admin
listar_clientes         criar_cliente / atualizar_cliente / deletar_cliente
buscar_cliente_por_nome/email
listar_espacos          criar_espaco / atualizar_espaco / deletar_espaco
ver_configuracao        atualizar_configuracao
```

**Cliente** pode (apenas os próprios dados):
```
meus_agendamentos       buscar_slots
criar_meu_agendamento   cancelar_meu_agendamento
ver_meu_perfil          atualizar_meu_perfil
perguntar_faq
```

### Segurança da IA

| Risco | Como é mitigado |
|-------|----------------|
| IA criar agendamento inválido | `appointmentValidator` bloqueia antes de chegar no banco |
| IA acessar dados de outro cliente | Ferramentas do cliente filtram pelo `clientId` do JWT |
| IA executar código arbitrário | Impossível — só pode chamar ferramentas do mapa fixo |
| IA burlar bloqueios | O validador consulta a tabela `Bloqueio` independente da IA |
| IA ignorar horários de funcionamento | O validador consulta `ConfigAgenda` independente da IA |
| Prompt injection | A IA não interpreta comandos do banco — só chama ferramentas tipadas |

> **Em resumo:** A IA é um "despachante inteligente" — ela entende o pedido do usuário e sabe qual ferramenta acionar, mas quem executa a ação com todas as validações de segurança é o código Node.js, não o modelo de linguagem.

---

## Arquitetura Geral

```
┌─────────────────────────────────────┐
│           VERCEL (Frontend)         │
│  Next.js 15 — App Router            │
│  Admin Dashboard | Client Portal    │
│  AIAssistant (chat flutuante)       │
└────────────────┬────────────────────┘
                 │ HTTPS REST API
┌────────────────▼────────────────────┐
│          RAILWAY (Backend)          │
│  Express.js — 12 grupos de rotas   │
│  ├─ appointmentController           │
│  ├─ aiToolExecutor (seguro)         │
│  ├─ emailService (Nodemailer)       │
│  ├─ whatsappService (Baileys)       │
│  ├─ googleCalendarService (OAuth2)  │
│  └─ lembreteScheduler (cron)        │
└──────┬────────────────┬─────────────┘
       │                │
┌──────▼──────┐  ┌──────▼──────────────┐
│  SUPABASE   │  │  SERVIÇOS EXTERNOS  │
│  PostgreSQL │  │  Mistral AI         │
│  Prisma ORM │  │  Google Calendar    │
│  7 modelos  │  │  Gmail SMTP         │
└─────────────┘  │  WhatsApp Web       │
                 └─────────────────────┘
```

---

## Principais Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| Railway para backend | Processo persistente necessário para Baileys (WhatsApp) |
| Vercel para frontend | Deploy automático, edge network global, serverless |
| Baileys em vez de API oficial WhatsApp | Zero custo, sem aprovação de negócio necessária |
| Mistral em vez de GPT-4 | Custo menor, API compatível com OpenAI, boa qualidade em PT-BR |
| Tool Calling em vez de RAG | Ações estruturadas são mais seguras e previsíveis que texto livre |
| Prisma em vez de SQL direto | Type-safety, migrations automáticas, código mais legível |
| JWT em vez de sessions | Stateless, funciona bem com serverless e múltiplos serviços |

---

*Desenvolvido com Node.js, Next.js, Prisma, Mistral AI, Baileys e Google APIs.*
