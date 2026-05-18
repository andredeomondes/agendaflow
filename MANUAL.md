# Manual do Usuário — AgendaFlow

**AgendaFlow** é um sistema de agendamentos com calendário visual, notificações automáticas por e-mail e WhatsApp, e assistente de inteligência artificial.

Acesse em: **https://agendaflow-iota.vercel.app**

---

## Sumário

- [Tela Inicial](#tela-inicial)
- [Como fazer login](#como-fazer-login)
- [Manual do Administrador](#manual-do-administrador)
  - [Dashboard](#dashboard)
  - [Agendamentos e Calendário](#agendamentos-e-calendário)
  - [Clientes](#clientes)
  - [Espaços](#espaços)
  - [Bloqueios](#bloqueios)
  - [Configurações](#configurações)
  - [WhatsApp](#whatsapp)
  - [Google Agenda](#google-agenda-admin)
  - [Assistente IA (Admin)](#assistente-ia-admin)
- [Manual do Cliente](#manual-do-cliente)
  - [Ver Agendamentos](#ver-agendamentos)
  - [Criar Agendamento](#criar-agendamento-cliente)
  - [Cancelar Agendamento](#cancelar-agendamento)
  - [Google Agenda (Cliente)](#google-agenda-cliente)
  - [Assistente IA (Cliente)](#assistente-ia-cliente)
- [Notificações Automáticas](#notificações-automáticas)

---

## Tela Inicial

Ao entrar no site você verá a **Landing Page** com dois botões principais:

- **"Acessar Sistema"** — leva ao login
- **"Começar Agora"** — leva ao login

---

## Como fazer login

Na tela de login há duas abas:

### Aba Admin

Para administradores do sistema.

- **Entrar:** preencha e-mail e senha e clique em "Entrar"
- **Criar conta:** clique em "Criar uma conta", preencha nome, e-mail e senha

### Aba Cliente

Para clientes que já possuem cadastro feito pelo administrador.

- Preencha e-mail e senha
- Caso não tenha senha, entre em contato com o administrador para redefinir

---

## Manual do Administrador

Após fazer login como administrador, você verá o painel com as abas no topo.

---

### Dashboard

A primeira tela exibe um resumo do sistema:

| Card | O que mostra |
|---|---|
| **Clientes** | Total de clientes cadastrados |
| **Espaços** | Total de espaços ativos |
| **Hoje** | Agendamentos para hoje |
| **Próximos 7 dias** | Agendamentos ativos na semana |

Abaixo dos cards há:
- **Próximos agendamentos** — lista dos próximos compromissos com cliente, espaço, data e status
- **Bloqueios ativos** — bloqueios de horário em vigor no momento

---

### Agendamentos e Calendário

Clique na aba **Agendamentos** para ver o calendário interativo.

#### Criando um agendamento

1. No formulário acima do calendário, selecione o **Cliente**
2. Selecione o **Espaço**
3. Escolha a **Data**
4. Escolha a **Hora de Início** e **Hora de Fim**
5. Clique em **"Agendar"**

> O sistema valida automaticamente:
> - Conflito de horário com outros agendamentos
> - Capacidade máxima do espaço
> - Bloqueios ativos no período
> - Horários fora do expediente configurado

#### Navegando no calendário

- **Mês / Semana / Dia / Lista** — botões no canto superior direito do calendário
- **Hoje** — volta para a data atual
- **< >** — navega entre períodos

#### Cores dos dias (visão mensal)

- **Verde leve** — dia com horários disponíveis
- **Vermelho leve** — dia sem horários disponíveis ou completamente bloqueado
- **Sem cor** — dias passados ou fora do expediente

#### Clicando em um evento

Clique em qualquer evento para ver os detalhes:
- Informações do cliente e espaço
- Horário completo
- Status atual

Para **alterar o status**:
1. Clique no evento
2. No modal, selecione o novo status no menu
3. Clique em **"Salvar Status"**

#### Clicando em um dia

Na visão mensal, clique em um dia para ver todos os eventos daquela data em um painel lateral.

---

### Clientes

Clique na aba **Clientes** para gerenciar o cadastro de clientes.

#### Cadastrar novo cliente

1. Preencha **Nome**, **Telefone** e **Email**
2. Clique em **"Adicionar"**

> O telefone é usado para enviar notificações via WhatsApp (quando conectado).

#### Buscar cliente

Use a barra de busca acima da tabela para filtrar por nome, telefone ou e-mail.

#### Editar cliente

1. Clique em **"Editar"** na linha do cliente
2. Altere os dados desejados
3. Clique em **"Salvar"**

#### Excluir cliente

1. Clique no ícone de lixeira na linha do cliente
2. Confirme a exclusão

> Ao excluir um cliente, todos os seus agendamentos são removidos também.

---

### Espaços

Clique na aba **Espaços** para gerenciar salas, consultórios ou qualquer espaço agendável.

#### Criar espaço

1. Preencha o **Nome** (ex: Sala 01, Consultório A)
2. Defina a **Capacidade** — número máximo de agendamentos simultâneos no mesmo horário
3. Clique em **"Criar"**

#### Editar espaço

Clique em **"Editar"** na tabela, altere os dados e clique em **"Salvar"**.

#### Desativar / Ativar espaço

Use o botão de alternância para desativar um espaço temporariamente. Espaços inativos não aparecem para novos agendamentos.

#### Excluir espaço

Clique no ícone de lixeira e confirme.

---

### Bloqueios

Use bloqueios para impedir agendamentos em períodos específicos (manutenção, feriados, reuniões internas).

#### Criar bloqueio

1. Selecione o **Espaço**
2. Defina **Data/Hora Início** e **Data/Hora Fim**
3. (Opcional) Adicione um **Motivo**
4. Clique no botão 🚫

> Bloqueios aparecem no calendário com fundo listrado.

#### Remover bloqueio

Clique no ícone de lixeira ao lado do bloqueio na lista.

---

### Configurações

Clique na aba **Configurações** para personalizar o funcionamento da agenda.

| Campo | Descrição |
|---|---|
| **Hora de Início** | Horário de abertura (ex: 08:00) |
| **Hora de Fim** | Horário de fechamento (ex: 18:00) |
| **Duração do Atendimento** | Tempo padrão de cada slot (min) |
| **Intervalo entre Atendimentos** | Pausa entre agendamentos (min) |
| **Dias de Funcionamento** | Dias da semana disponíveis |

Clique em **"Salvar Configurações"** para aplicar.

> O calendário respeita essas configurações — não exibe horários fora do expediente.

---

### WhatsApp

Na aba **Configurações**, role até o card **WhatsApp**.

#### Conectar

1. Clique em **"Conectar WhatsApp"**
2. Aguarde o QR Code aparecer (alguns segundos)
3. Abra o WhatsApp no celular → **Dispositivos vinculados** → **Vincular um dispositivo**
4. Escaneie o QR Code
5. Aguarde — o status muda para **"Conectado"** (verde) na navbar

#### Status na navbar

Quando conectado, um ponto verde pulsante aparece na barra superior ao lado do Google. Clique nele para ver a opção de desconectar.

#### Testar o envio

Com o WhatsApp conectado:
1. Digite um número de telefone no campo de teste (ex: `5511999999999`)
2. Clique em **"Testar"**
3. Verifique o WhatsApp do número informado

#### Notificações automáticas

Com o WhatsApp conectado, o sistema envia automaticamente:
- **Confirmação** ao criar um agendamento
- **Cancelamento** ao cancelar
- **Lembretes** 1 dia antes, 1 hora antes e 10 minutos antes

> Para receber notificações, o cliente precisa ter telefone cadastrado no sistema.

---

### Google Agenda (Admin)

1. Clique em **"Conectar Google"** na navbar
2. Autorize o acesso na página do Google
3. O botão muda para **"Google Conectado"**

A partir daí, todo agendamento criado é sincronizado com o Google Calendar automaticamente.

---

### Assistente IA (Admin)

Clique no ícone de chat (canto inferior direito) para abrir o assistente de IA.

O assistente tem acesso completo ao sistema e pode:

- Criar agendamentos (ex: "Agende para João Silva amanhã às 14h na Sala 01")
- Cancelar agendamentos (ex: "Cancela o agendamento #42")
- Listar agendamentos do dia (ex: "O que tem hoje na agenda?")
- Consultar clientes (ex: "Qual o telefone da Maria?")
- Verificar horários livres (ex: "Quais horários disponíveis sexta-feira?")
- Atualizar configurações (ex: "Muda o horário de funcionamento para 8h às 18h")
- Gerenciar espaços e clientes

> O assistente valida todas as regras de negócio (capacidade, conflito, bloqueios) antes de criar agendamentos.

---

## Manual do Cliente

Após fazer login como cliente, você verá seu painel pessoal.

---

### Ver Agendamentos

A tela principal mostra:

- **Próximos Agendamentos** — compromissos futuros ativos
- **Histórico** — agendamentos concluídos e cancelados

Cada card mostra: espaço, data, horário e status.

---

### Criar Agendamento (Cliente)

#### Via formulário

1. Clique em **"Novo Agendamento"**
2. Selecione o **Espaço**
3. Escolha **Data**, **Hora de Início** e **Hora de Fim**
4. Clique em **"Confirmar"**

#### Via Assistente IA

Abra o chat de IA e diga, por exemplo:
- "Quero agendar na Sala 01 sexta-feira às 10h"
- "Me mostra os horários disponíveis esta semana"

---

### Cancelar Agendamento

1. Clique em um agendamento ativo
2. Clique em **"Cancelar Agendamento"**
3. Confirme a ação

> Após o cancelamento, uma notificação é enviada por e-mail e WhatsApp (se configurado pelo admin).

---

### Google Agenda (Cliente)

1. Clique em **"Conectar Google"** no seu painel
2. Autorize o acesso
3. Seus agendamentos serão sincronizados com o Google Calendar

---

### Assistente IA (Cliente)

Clique no ícone de chat para abrir o assistente. Como cliente, você pode:

- Criar agendamentos por conversa
- Cancelar seus próprios agendamentos
- Consultar seus agendamentos
- Verificar espaços e horários disponíveis
- Atualizar seus dados de perfil

**Exemplos de uso:**
- "Quero marcar horário na Sala 02 para amanhã às 9h"
- "Cancela meu agendamento de sexta-feira"
- "Tenho algum agendamento essa semana?"
- "Quais espaços estão disponíveis?"

---

## Notificações Automáticas

O sistema envia notificações por **e-mail** e **WhatsApp** (quando conectado pelo admin) nos seguintes eventos:

| Evento | Quando enviado |
|---|---|
| **Confirmação** | Imediatamente ao criar o agendamento |
| **Cancelamento** | Imediatamente ao cancelar |
| **Lembrete — 1 dia antes** | Às 9h do dia anterior |
| **Lembrete — 1 hora antes** | ~1 hora antes do horário marcado |
| **Lembrete — 10 min antes** | ~10 minutos antes do horário marcado |

> Lembretes são enviados apenas uma vez por agendamento. Se o cliente não tiver telefone cadastrado, o WhatsApp não é enviado mas o e-mail sim.

---

*AgendaFlow — https://agendaflow-iota.vercel.app*
