<h1 align="center">🗓️ AgendaFlow</h1>

<p align="center">
  <strong>Sistema de Agendamentos Inteligente</strong><br>
  Calendário visual, Google Agenda, WhatsApp, Assistente IA e gestão completa de espaços.
</p>

<p align="center">
  <strong>👉 <a href="https://agendaflow-iota.vercel.app">https://agendaflow-iota.vercel.app</a></strong>
</p>

<p align="center">
  <em>Responsivo para mobile, tablet e desktop 📱💻🖥️</em>
</p>

---

## Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Primeiro Acesso](#primeiro-acesso)
- [Painel do Administrador](#painel-do-administrador)
- [Área do Cliente](#área-do-cliente)
- [Integrações](#integrações)
- [Status dos Agendamentos](#status-dos-agendamentos)
- [Desenvolvimento Local](#desenvolvimento-local)

---

## Visão Geral

O **AgendaFlow** é um sistema completo de agendamentos com:

- Calendário visual interativo (mês, semana, dia, lista)
- Assistente de IA integrado para criar e gerenciar agendamentos por chat
- Notificações automáticas por **e-mail** e **WhatsApp**
- Lembretes **1 dia antes**, **1 hora antes** e **10 minutos antes**
- Sincronização com **Google Agenda**
- Gestão de clientes, espaços e bloqueios de horário

---

## Funcionalidades

| Funcionalidade | Admin | Cliente |
|---|:---:|:---:|
| Calendário visual | ✅ | - |
| Criar agendamentos | ✅ | ✅ |
| Cancelar agendamentos | ✅ | ✅ |
| Gerenciar clientes | ✅ | - |
| Gerenciar espaços | ✅ | - |
| Bloquear horários | ✅ | - |
| Configurar expediente | ✅ | - |
| Assistente de IA | ✅ | ✅ |
| WhatsApp (QR Code) | ✅ | - |
| Google Agenda | ✅ | ✅ |
| Notificações e-mail | ✅ | ✅ |
| Lembretes automáticos | ✅ | ✅ |

---

## Primeiro Acesso

1. Acesse **[https://agendaflow-iota.vercel.app](https://agendaflow-iota.vercel.app)**
2. Clique em **"Acessar Sistema"** ou **"Começar Agora"**
3. Escolha entre **Admin** ou **Cliente**

### Credenciais de Teste

| Perfil | Email | Senha |
|---|---|---|
| **Administrador** | `admin@agendaflow.com` | `123456` |

> O banco de testes já vem populado com clientes, espaços e agendamentos de exemplo.

**Para criar conta de administrador:**
1. Clique na aba **Admin** → **"Criar uma conta"**
2. Preencha nome, e-mail e senha

> Popular com dados de exemplo:
> ```bash
> npm run seed
> ```
> Cria o admin acima + 6 clientes, 5 espaços, agendamentos e bloqueios.

---

## Painel do Administrador

Após o login, o painel é dividido em abas:

| Aba | Função |
|---|---|
| 📊 **Dashboard** | Visão geral com indicadores |
| 📅 **Agendamentos** | Calendário + criar agendamentos |
| 👥 **Clientes** | Gerenciar clientes |
| 📍 **Espaços** | Gerenciar espaços |
| 🚫 **Bloqueios** | Bloquear horários |
| ⚙️ **Configurações** | Personalizar agenda + WhatsApp |
| 🤖 **IA** | Assistente de IA (ícone no canto) |

### 📅 Agendamentos — Calendário

- Dias **verdes** (leve): têm horários disponíveis
- Dias **vermelhos** (leve): sem horários disponíveis ou bloqueados
- Clique em um evento para ver detalhes e alterar o status

### ⚙️ Configurações — WhatsApp

Na aba Configurações há um card **WhatsApp**:

1. Clique em **"Conectar WhatsApp"**
2. Escaneie o QR Code com o WhatsApp do celular
3. Após conectar, o status muda para **"Conectado"** (verde) na navbar
4. Notificações são enviadas automaticamente a clientes com telefone cadastrado

---

## Área do Cliente

1. Na tela de login, clique na aba **"Cliente"**
2. Faça login com e-mail e senha
3. Visualize próximos agendamentos e histórico
4. Use o **Assistente IA** para criar ou cancelar agendamentos por chat
5. Conecte o **Google Agenda** para sincronizar eventos

---

## Integrações

### Google Agenda

1. No cabeçalho, clique em **"Conectar Google"**
2. Autorize o acesso na página do Google
3. Todo agendamento criado é sincronizado automaticamente

### WhatsApp (Admin)

- Autenticação via QR Code usando Baileys (WhatsApp Web API)
- Sessão persistente — reconecta automaticamente ao reiniciar o servidor
- Notificações enviadas: confirmação de agendamento, cancelamento e lembretes

### E-mail

Configurado via variáveis de ambiente (Gmail/SMTP). Envios automáticos:
- **Confirmação** ao criar agendamento
- **Cancelamento** ao cancelar
- **Lembrete 1 dia antes** (9h)
- **Lembrete 1 hora antes** (a cada hora)
- **Lembrete 10 minutos antes** (a cada 10min)

### Assistente de IA

Alimentado por **Groq (LLaMA 3.3 70B)**. O assistente consegue:
- Criar, consultar e cancelar agendamentos
- Listar espaços e clientes disponíveis
- Verificar horários livres
- Responder perguntas sobre o sistema

---

## Status dos Agendamentos

| Cor | Status | Significado |
|---|---|---|
| 🟣 Roxo | **Agendado** | Criado, aguardando |
| 🟢 Verde | **Confirmado** | Confirmado pelo admin |
| 🟡 Amarelo | **Pendente** | Aguardando confirmação |
| 🔴 Vermelho | **Cancelado** | Cancelado |
| ⚫ Cinza | **Concluído** | Realizado |
| ⚪ Listrado | **Bloqueado** | Horário indisponível |

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- PostgreSQL (ou [Supabase](https://supabase.com))

### Variáveis de Ambiente

Crie `Backend/.env` com base em `Backend/.env.example`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="seu-secret-aqui"

# E-mail (Gmail com App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu@gmail.com
EMAIL_PASS=sua-app-password

# Groq (IA)
GROQ_API_KEY=gsk_...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3333/api/google/callback
```

### Passos

```bash
# 1. Instalar dependências
npm install
cd Backend && npm install

# 2. Sincronizar banco de dados
cd Backend
npx prisma generate
npx prisma db push

# 3. (Opcional) Popular com dados de exemplo
npm run seed

# 4. Iniciar backend (terminal 1)
cd Backend && npm start
# API em http://localhost:3333

# 5. Iniciar frontend (terminal 2)
npm run dev
# App em http://localhost:3000
```

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia Next.js (dev) |
| `npm run build` | Gera build de produção |
| `npm start` | Inicia servidor Next.js (produção) |
| `npm run backend` | Inicia API Express na porta 3333 |
| `npm run seed` | Popula banco com dados iniciais |
| `npm test` | Testes de banco (Prisma) |
| `npm run test:api` | Testes dos endpoints da API |

---

<p align="center">
  <strong>AgendaFlow</strong> — <a href="https://agendaflow-iota.vercel.app">https://agendaflow-iota.vercel.app</a>
</p>
