const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { normalizePhone, DEFAULT_DDI } = require('./utils/phone');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function setTime(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Populando banco de dados com dados de exemplo...\n');

  // Ordem correta: deletar dependentes antes
  await prisma.lembrete.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.bloqueio.deleteMany({});
  await prisma.space.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.configAgenda.deleteMany({});

  // 1. Admin
  const senhaHash = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.create({
    data: {
      nome: 'Administrador',
      email: 'admin@agendaflow.com',
      senha: senhaHash,
      role: 'admin'
    }
  });
  console.log(`✅ Admin: ${admin.nome} (admin@agendaflow.com / 123456)`);

  // 2. Clientes — phones stored as E.164 national (= <DDI><DDD><numero>)
  const clientesData = [
    { nome: 'Ana Beatriz Oliveira',   telefone: '5511999990001', email: 'ana.oliveira@email.com' },
    { nome: 'Carlos Eduardo Santos',  telefone: '5511999990002', email: 'carlos.santos@email.com' },
    { nome: 'Marina Fernandes Lima',  telefone: '5511999990003', email: 'marina.lima@email.com' },
    { nome: 'Rafael Almeida Costa',   telefone: '5521988880001', email: 'rafael.costa@email.com' },
    { nome: 'Juliana Pereira Martins', telefone: '5531977770001', email: 'juliana.martins@email.com' },
    { nome: 'Fernando Barbosa Neto',  telefone: '5541966660001', email: 'fernando.neto@email.com' },
  ];

  const clientes = [];
  for (const c of clientesData) {
    const cliente = await prisma.client.create({ data: c });
    clientes.push(cliente);
  }
  console.log(`✅ ${clientes.length} clientes criados`);

  // 3. Espaços
  const espacosData = [
    { nome: 'Sala de Reunião A', capacidade: 8 },
    { nome: 'Sala de Reunião B', capacidade: 4 },
    { nome: 'Auditório Principal', capacidade: 30 },
    { nome: 'Coworking Aberto', capacidade: 12 },
    { nome: 'Consultório Privado', capacidade: 2 },
  ];

  await prisma.space.deleteMany({});
  const espacos = [];
  for (const e of espacosData) {
    const espaco = await prisma.space.create({ data: e });
    espacos.push(espaco);
  }
  console.log(`✅ ${espacos.length} espaços criados`);

  // 4. Agendamentos
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const agendamentosData = [
    // Hoje
    { clientId: clientes[0].id, spaceId: espacos[0].id, dataInicio: setTime(hoje, 9, 0), dataFim: setTime(hoje, 10, 0), status: 'Confirmado' },
    { clientId: clientes[1].id, spaceId: espacos[1].id, dataInicio: setTime(hoje, 10, 0), dataFim: setTime(hoje, 11, 30), status: 'Pendente' },
    { clientId: clientes[2].id, spaceId: espacos[2].id, dataInicio: setTime(hoje, 14, 0), dataFim: setTime(hoje, 16, 0), status: 'Confirmado' },
    { clientId: clientes[3].id, spaceId: espacos[0].id, dataInicio: setTime(hoje, 15, 0), dataFim: setTime(hoje, 16, 0), status: 'Agendado' },
    // Amanhã
    { clientId: clientes[2].id, spaceId: espacos[3].id, dataInicio: setTime(addDays(hoje, 1), 8, 0), dataFim: setTime(addDays(hoje, 1), 12, 0), status: 'Confirmado' },
    { clientId: clientes[4].id, spaceId: espacos[4].id, dataInicio: setTime(addDays(hoje, 1), 9, 0), dataFim: setTime(addDays(hoje, 1), 10, 0), status: 'Agendado' },
    { clientId: clientes[0].id, spaceId: espacos[1].id, dataInicio: setTime(addDays(hoje, 1), 11, 0), dataFim: setTime(addDays(hoje, 1), 12, 0), status: 'Pendente' },
    // Próximos dias
    { clientId: clientes[3].id, spaceId: espacos[0].id, dataInicio: setTime(addDays(hoje, 3), 10, 0), dataFim: setTime(addDays(hoje, 3), 11, 0), status: 'Agendado' },
    { clientId: clientes[5].id, spaceId: espacos[2].id, dataInicio: setTime(addDays(hoje, 3), 13, 0), dataFim: setTime(addDays(hoje, 3), 15, 0), status: 'Confirmado' },
    { clientId: clientes[1].id, spaceId: espacos[4].id, dataInicio: setTime(addDays(hoje, 5), 9, 0), dataFim: setTime(addDays(hoje, 5), 10, 0), status: 'Agendado' },
    { clientId: clientes[4].id, spaceId: espacos[3].id, dataInicio: setTime(addDays(hoje, 7), 14, 0), dataFim: setTime(addDays(hoje, 7), 17, 0), status: 'Confirmado' },
    // Passados (histórico)
    { clientId: clientes[0].id, spaceId: espacos[0].id, dataInicio: setTime(addDays(hoje, -2), 9, 0), dataFim: setTime(addDays(hoje, -2), 10, 0), status: 'Concluído' },
    { clientId: clientes[1].id, spaceId: espacos[1].id, dataInicio: setTime(addDays(hoje, -3), 14, 0), dataFim: setTime(addDays(hoje, -3), 15, 0), status: 'Concluído' },
    { clientId: clientes[2].id, spaceId: espacos[2].id, dataInicio: setTime(addDays(hoje, -5), 10, 0), dataFim: setTime(addDays(hoje, -5), 12, 0), status: 'Cancelado' },
    { clientId: clientes[5].id, spaceId: espacos[0].id, dataInicio: setTime(addDays(hoje, -7), 11, 0), dataFim: setTime(addDays(hoje, -7), 12, 0), status: 'Cancelado' },
  ];

  for (const a of agendamentosData) {
    await prisma.appointment.create({
      data: {
        clientId: a.clientId,
        spaceId: a.spaceId,
        dataInicio: a.dataInicio,
        dataFim: a.dataFim,
        status: a.status,
        userId: admin.id
      }
    });
  }
  console.log(`✅ ${agendamentosData.length} agendamentos criados (hoje, futuros e histórico)`);

  // 5. Bloqueios
  const bloqueiosData = [
    { spaceId: espacos[0].id, dataInicio: setTime(addDays(hoje, 2), 8, 0), dataFim: setTime(addDays(hoje, 2), 12, 0), motivo: 'Manutenção programada' },
    { spaceId: espacos[2].id, dataInicio: setTime(addDays(hoje, 1), 13, 0), dataFim: setTime(addDays(hoje, 1), 18, 0), motivo: 'Evento interno' },
    { spaceId: espacos[4].id, dataInicio: setTime(addDays(hoje, 4), 0, 0), dataFim: setTime(addDays(hoje, 6), 23, 59), motivo: 'Reforma do consultório' },
  ];

  for (const b of bloqueiosData) {
    await prisma.bloqueio.create({ data: b });
  }
  console.log(`✅ ${bloqueiosData.length} bloqueios criados`);

  // 6. ConfigAgenda
  await prisma.configAgenda.upsert({
    where: { id: 1 },
    update: {
      horaInicio: '08:00',
      horaFim: '18:00',
      intervaloEntreAtend: 30,
      diasFuncionamento: '1,2,3,4,5,6'
    },
    create: {
      id: 1,
      horaInicio: '08:00',
      horaFim: '18:00',
      intervaloEntreAtend: 30,
      diasFuncionamento: '1,2,3,4,5,6'
    }
  });
  console.log('✅ Configurações da agenda salvas (Seg-Sáb, 08h-18h, 30min intervalo)');

  console.log('\n🎉 Banco populado com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   Admin: admin@agendaflow.com / 123456');
  console.log('   (Clientes não têm senha — use a consulta pública por email)');
}

main()
  .catch(e => {
    console.error('❌ Erro ao popular banco:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
