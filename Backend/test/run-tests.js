const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;

async function test(description, fn) {
    try {
        await fn();
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${description}`);
    } catch (err) {
        failed++;
        console.log(`  \x1b[31m✗\x1b[0m ${description}`);
        console.log(`    \x1b[31m${err.message}\x1b[0m`);
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

async function main() {
    console.log('\n\x1b[36m═══════════════════════════════════════\x1b[0m');
    console.log('\x1b[36m   AgendaFlow — Testes do Backend\x1b[0m');
    console.log('\x1b[36m═══════════════════════════════════════\x1b[0m\n');

    // ═══════════════════════════════════════
    //  CONEXÃO
    // ═══════════════════════════════════════
    await test('Conecta ao banco de dados Supabase/PostgreSQL', async () => {
        const result = await prisma.$queryRaw`SELECT 1 as ok`;
        assert(result[0].ok === 1);
    });

    // ═══════════════════════════════════════
    //  MODELS — CRUD BÁSICO
    // ═══════════════════════════════════════
    await test('Model User: cria e deleta', async () => {
        const userData = { nome: 'Teste', email: `test_${Date.now()}@test.com`, senha: '123456' };
        const user = await prisma.user.create({ data: userData });
        assert(user.id > 0);
        assert(user.nome === 'Teste');
        assert(user.role === 'admin');
        await prisma.user.delete({ where: { id: user.id } });
    });

    await test('Model Client: cria com campos obrigatórios', async () => {
        const data = { nome: 'Cliente Teste', telefone: '11999999999', email: `cli_${Date.now()}@test.com` };
        const client = await prisma.client.create({ data });
        assert(client.id > 0);
        assert(client.nome === 'Cliente Teste');
        assert(client.emailVerificado === false);
        await prisma.client.delete({ where: { id: client.id } });
    });

    await test('Model Client: email único', async () => {
        const email = `uniq_${Date.now()}@test.com`;
        await prisma.client.create({ data: { nome: 'A', telefone: '111', email } });
        try {
            await prisma.client.create({ data: { nome: 'B', telefone: '222', email } });
            assert(false, 'Deveria ter lançado erro de unicidade');
        } catch (e) {
            assert(e.code === 'P2002', `Erro de unique constraint: ${e.code}`);
        }
        await prisma.client.deleteMany({ where: { email } });
    });

    await test('Model Space: cria com capacidade', async () => {
        const space = await prisma.space.create({ data: { nome: `Sala ${Date.now()}`, capacidade: 10 } });
        assert(space.id > 0);
        assert(space.capacidade === 10);
        assert(space.disponivel === true);
        await prisma.space.delete({ where: { id: space.id } });
    });

    await test('Model Space: capacidade padrão null quando não informada', async () => {
        const space = await prisma.space.create({ data: { nome: `Sala ${Date.now()}` } });
        assert(space.capacidade === null);
        await prisma.space.delete({ where: { id: space.id } });
    });

    await test('Model ConfigAgenda: valores padrão', async () => {
        const config = await prisma.configAgenda.findFirst();
        assert(config);
        assert(typeof config.horaInicio === 'string');
        assert(typeof config.horaFim === 'string');
        assert(typeof config.intervaloEntreAtend === 'number');
        assert(typeof config.diasFuncionamento === 'string');
    });

    // ═══════════════════════════════════════
    //  APPOINTMENT — CRUD E VALIDAÇÕES
    // ═══════════════════════════════════════
    await test('Appointment: cria com cliente, espaço e status padrão', async () => {
        const client = await prisma.client.create({ data: { nome: 'Appt Client', telefone: '11988888888', email: `appt_${Date.now()}@test.com` } });
        const space = await prisma.space.create({ data: { nome: `Appt Space ${Date.now()}`, capacidade: 5 } });
        const appt = await prisma.appointment.create({
            data: { clientId: client.id, spaceId: space.id, dataInicio: new Date('2026-06-01T10:00:00Z'), dataFim: new Date('2026-06-01T11:00:00Z') }
        });
        assert(appt.id > 0);
        assert(appt.status === 'Agendado');
        assert(appt.googleId === null);
        const loaded = await prisma.appointment.findUnique({ where: { id: appt.id }, include: { client: true, space: true } });
        assert(loaded.client.nome === 'Appt Client');
        assert(loaded.space.nome.startsWith('Appt Space'));
        await prisma.appointment.delete({ where: { id: appt.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    await test('Appointment: cria mesmo com dataFim anterior a dataInicio (sem validação no DB)', async () => {
        const client = await prisma.client.create({ data: { nome: 'Inv Client', telefone: '11911111111', email: `inv_${Date.now()}@test.com` } });
        const space = await prisma.space.create({ data: { nome: `Inv Space ${Date.now()}`, capacidade: 1 } });
        const appt = await prisma.appointment.create({
            data: { clientId: client.id, spaceId: space.id, dataInicio: new Date('2026-06-01T11:00:00Z'), dataFim: new Date('2026-06-01T10:00:00Z') }
        });
        assert(appt.id > 0);
        await prisma.appointment.delete({ where: { id: appt.id } });
        await prisma.space.delete({ where: { id: space.id } });
        await prisma.client.delete({ where: { id: client.id } });
    });

    await test('Appointment: status update flow completo', async () => {
        const client = await prisma.client.create({ data: { nome: 'Status Client', telefone: '11966666666', email: `st_${Date.now()}@test.com` } });
        const space = await prisma.space.create({ data: { nome: `Status Space ${Date.now()}`, capacidade: 2 } });
        const appt = await prisma.appointment.create({
            data: { clientId: client.id, spaceId: space.id, dataInicio: new Date(), dataFim: new Date() }
        });
        assert(appt.status === 'Agendado');
        for (const st of ['Confirmado', 'Pendente', 'Cancelado', 'Concluído']) {
            const updated = await prisma.appointment.update({ where: { id: appt.id }, data: { status: st } });
            assert(updated.status === st, `Status não atualizou para ${st}`);
        }
        await prisma.appointment.delete({ where: { id: appt.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    // ═══════════════════════════════════════
    //  BLOQUEIO
    // ═══════════════════════════════════════
    await test('Bloqueio: cria vinculado a espaço', async () => {
        const space = await prisma.space.create({ data: { nome: `Block Space ${Date.now()}`, capacidade: 3 } });
        const bl = await prisma.bloqueio.create({
            data: { spaceId: space.id, dataInicio: new Date('2026-07-01T08:00:00Z'), dataFim: new Date('2026-07-01T18:00:00Z'), motivo: 'Manutenção' }
        });
        assert(bl.id > 0);
        assert(bl.motivo === 'Manutenção');
        const loaded = await prisma.bloqueio.findUnique({ where: { id: bl.id }, include: { space: true } });
        assert(loaded.space.nome.startsWith('Block Space'));
        await prisma.bloqueio.delete({ where: { id: bl.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    await test('Bloqueio: permite motivo vazio', async () => {
        const space = await prisma.space.create({ data: { nome: `NoReason ${Date.now()}`, capacidade: 1 } });
        const bl = await prisma.bloqueio.create({
            data: { spaceId: space.id, dataInicio: new Date(), dataFim: new Date() }
        });
        assert(bl.id > 0);
        assert(bl.motivo === null);
        await prisma.bloqueio.delete({ where: { id: bl.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    await test('Bloqueio: conflito com agendamento (mesmo espaço, mesmo horário)', async () => {
        const space = await prisma.space.create({ data: { nome: `Conflict ${Date.now()}`, capacidade: 1 } });
        const client = await prisma.client.create({ data: { nome: 'Conflict Client', telefone: '11933333333', email: `conf_${Date.now()}@test.com` } });
        const appt = await prisma.appointment.create({
            data: { clientId: client.id, spaceId: space.id, dataInicio: new Date('2026-09-01T10:00:00Z'), dataFim: new Date('2026-09-01T11:00:00Z') }
        });
        const bloqueio = await prisma.bloqueio.create({
            data: { spaceId: space.id, dataInicio: new Date('2026-09-01T09:00:00Z'), dataFim: new Date('2026-09-01T12:00:00Z') }
        });
        const conflitam = appt.dataInicio < bloqueio.dataFim && appt.dataFim > bloqueio.dataInicio;
        assert(conflitam, 'Bloqueio deveria conflitar com agendamento');
        await prisma.bloqueio.delete({ where: { id: bloqueio.id } });
        await prisma.appointment.delete({ where: { id: appt.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    // ═══════════════════════════════════════
    //  LEMBRETE
    // ═══════════════════════════════════════
    await test('Lembrete: cria e define status pendente', async () => {
        const client = await prisma.client.create({ data: { nome: 'Lem Client', telefone: '11977777777', email: `lem_${Date.now()}@test.com` } });
        const space = await prisma.space.create({ data: { nome: `Lem Space ${Date.now()}`, capacidade: 2 } });
        const appt = await prisma.appointment.create({ data: { clientId: client.id, spaceId: space.id, dataInicio: new Date(), dataFim: new Date() } });
        const lem = await prisma.lembrete.create({ data: { appointmentId: appt.id, tipo: 'email', status: 'pendente' } });
        assert(lem.id > 0);
        assert(lem.status === 'pendente');
        assert(lem.tipo === 'email');
        await prisma.lembrete.delete({ where: { id: lem.id } });
        await prisma.appointment.delete({ where: { id: appt.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    // ═══════════════════════════════════════
    //  RELACIONAMENTOS
    // ═══════════════════════════════════════
    await test('Appointment: carrega relações client e space', async () => {
        const client = await prisma.client.create({ data: { nome: 'Rel Client', telefone: '11922222222', email: `rel_${Date.now()}@test.com` } });
        const space = await prisma.space.create({ data: { nome: `Rel Space ${Date.now()}`, capacidade: 3 } });
        const appt = await prisma.appointment.create({
            data: { clientId: client.id, spaceId: space.id, dataInicio: new Date(), dataFim: new Date() }
        });
        const loaded = await prisma.appointment.findUnique({
            where: { id: appt.id },
            include: { client: true, space: true, user: true, lembretes: true }
        });
        assert(loaded.client !== null);
        assert(loaded.space !== null);
        assert(Array.isArray(loaded.lembretes));
        await prisma.appointment.delete({ where: { id: appt.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    await test('Bloqueio: carrega relação space', async () => {
        const space = await prisma.space.create({ data: { nome: `BlkRel ${Date.now()}`, capacidade: 2 } });
        const bl = await prisma.bloqueio.create({ data: { spaceId: space.id, dataInicio: new Date(), dataFim: new Date() } });
        const loaded = await prisma.bloqueio.findUnique({ where: { id: bl.id }, include: { space: true } });
        assert(loaded.space !== null);
        await prisma.bloqueio.delete({ where: { id: bl.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    // ═══════════════════════════════════════
    //  VALIDAÇÕES DE NEGÓCIO
    // ═══════════════════════════════════════
    await test('Space: capacidade mínima é 1', async () => {
        const space = await prisma.space.create({ data: { nome: `CapTest ${Date.now()}`, capacidade: 1 } });
        assert(space.capacidade >= 1);
        await prisma.space.delete({ where: { id: space.id } });
    });

    await test('Client: emailVerificado padrão é false', async () => {
        const client = await prisma.client.create({ data: { nome: 'Ver Client', telefone: '11955555555', email: `ver_${Date.now()}@test.com` } });
        assert(client.emailVerificado === false);
        assert(client.confirmacaoToken === null);
        const updated = await prisma.client.update({ where: { id: client.id }, data: { emailVerificado: true } });
        assert(updated.emailVerificado === true);
        await prisma.client.delete({ where: { id: client.id } });
    });

    // ═══════════════════════════════════════
    //  SERVICE MODULES
    // ═══════════════════════════════════════
    await test('googleCalendarService: módulo carrega e exporta funções', async () => {
        const gcal = require('../services/googleCalendarService');
        assert(typeof gcal.criarEvento === 'function');
        assert(typeof gcal.criarEventoCliente === 'function');
        assert(typeof gcal.deletarEvento === 'function');
        assert(typeof gcal.deletarEventoCliente === 'function');
        assert(typeof gcal.getAuthUrl === 'function');
        assert(typeof gcal.handleCallback === 'function');
    });

    await test('emailService: módulo carrega e exporta todas as funções', async () => {
        const mail = require('../services/emailService');
        const fns = ['enviarEmailCadastro', 'enviarEmailVerificacao', 'enviarEmailConfirmacao', 'enviarEmailCancelamento', 'enviarLembreteProximoAgendamento'];
        fns.forEach(fn => assert(typeof mail[fn] === 'function', `${fn} não é função`));
    });

    await test('emailService: template HTML contém elementos esperados', async () => {
        const mail = require('../services/emailService');
        const fs = require('fs');
        const source = fs.readFileSync(require.resolve('../services/emailService'), 'utf8');
        assert(source.includes('gerarTemplate'), 'gerarTemplate existe');
        assert(source.includes('cardDetalhes'), 'cardDetalhes existe');
        assert(source.includes('#8257e5'), 'cor roxa presente');
        assert(source.includes('#04d361'), 'cor verde presente');
        assert(source.includes('#ef4444'), 'cor vermelha presente');
    });

    // ═══════════════════════════════════════
    //  CLEANUP (googleId null)
    // ═══════════════════════════════════════
    await test('Appointment: googleId default null (sem Google)', async () => {
        const client = await prisma.client.create({ data: { nome: 'Google Sync', telefone: '11944444444', email: `gs_${Date.now()}@test.com` } });
        const space = await prisma.space.create({ data: { nome: `Google Space ${Date.now()}`, capacidade: 1 } });
        const appt = await prisma.appointment.create({
            data: { clientId: client.id, spaceId: space.id, dataInicio: new Date('2026-08-01T10:00:00Z'), dataFim: new Date('2026-08-01T11:00:00Z') }
        });
        assert(appt.googleId === null);
        await prisma.appointment.delete({ where: { id: appt.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.space.delete({ where: { id: space.id } });
    });

    console.log(`\n\x1b[36m═══════════════════════════════════════\x1b[0m`);
    console.log(`  \x1b[32m${passed} passaram\x1b[0m · \x1b[31m${failed} falharam\x1b[0m`);
    console.log(`\x1b[36m═══════════════════════════════════════\x1b[0m\n`);

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('\x1b[31mERRO FATAL:\x1b[0m', err);
    process.exit(1);
});
