const http = require('http');

const BASE = 'http://localhost:3333/api';
let token = '';
let clientId = '';
let spaceId = '';
let appointmentId = '';
let bloqueioId = '';

function req(method, path, body = null, auth = false) {
    return new Promise((resolve, reject) => {
        const fullUrl = `${BASE}${path}`;
        const url = new URL(fullUrl);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: { 'Content-Type': 'application/json' }
        };
        if (auth) options.headers['Authorization'] = `Bearer ${token}`;

        const r = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, data }); }
            });
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

function test(name, fn) {
    console.log(`\n🧪 ${name}`);
    return fn().then(r => {
        if (r.pass) console.log(`   ✅ ${r.msg}`);
        else console.error(`   ❌ ${r.msg}`);
        return r.pass;
    });
}

function assert(condition, msg) {
    return { pass: !!condition, msg: condition ? `OK: ${msg}` : `FAIL: ${msg}` };
}

async function run() {
    console.log('========================================');
    console.log('  AGENDAFLOW - TESTE COMPLETO DA API');
    console.log('========================================\n');

    // 1. Auth
    await test('POST /auth/register - Criar conta', async () => {
        const r = await req('POST', '/auth/register', {
            nome: 'Teste', email: 'teste_api@email.com', senha: '123456'
        });
        return assert(r.status === 201, `Register: ${r.status}`);
    });

    await test('POST /auth/register - Email duplicado', async () => {
        const r = await req('POST', '/auth/register', {
            nome: 'Teste', email: 'teste_api@email.com', senha: '123456'
        });
        return assert(r.status === 400, `Duplicado: ${r.status}`);
    });

    await test('POST /auth/login - Login com credenciais válidas', async () => {
        const r = await req('POST', '/auth/login', {
            email: 'teste_api@email.com', senha: '123456'
        });
        if (r.status === 200 && r.data.token) {
            token = r.data.token;
            return assert(true, `Token recebido (${r.data.token.slice(0, 20)}...)`);
        }
        return assert(false, `Login falhou: ${r.status}`);
    });

    await test('POST /auth/login - Credenciais inválidas', async () => {
        const r = await req('POST', '/auth/login', {
            email: 'teste_api@email.com', senha: 'senha_errada'
        });
        return assert(r.status === 401, `Rejeitado: ${r.status}`);
    });

    // 2. Clientes
    await test('POST /clientes - Criar cliente', async () => {
        const r = await req('POST', '/clientes', {
            nome: 'João Silva', telefone: '11999999999', email: 'joao@email.com'
        }, true);
        if (r.status === 201) clientId = r.data.id;
        return assert(r.status === 201, `Cliente criado id=${r.data.id}`);
    });

    await test('POST /clientes - Criar cliente sem auth', async () => {
        const r = await req('POST', '/clientes', {
            nome: 'Sem Token', telefone: '11988888888', email: 'sem@email.com'
        });
        return assert(r.status === 401, `Bloqueado: ${r.status}`);
    });

    await test('GET /clientes - Listar clientes', async () => {
        const r = await req('GET', '/clientes', null, true);
        const ok = r.status === 200 && Array.isArray(r.data) && r.data.length > 0;
        return assert(ok, `Listou ${r.data?.length || 0} clientes`);
    });

    // 3. Espaços
    await test('POST /espacos - Criar espaço', async () => {
        const r = await req('POST', '/espacos', {
            nome: 'Sala Reunião A', capacidade: 10
        }, true);
        if (r.status === 201) spaceId = r.data.id;
        return assert(r.status === 201, `Espaço criado id=${r.data.id}`);
    });

    await test('POST /espacos - Criar espaço sem capacidade', async () => {
        const r = await req('POST', '/espacos', { nome: 'Sala B' }, true);
        return assert(r.status === 201, `Espaço sem capacidade: ${r.status}`);
    });

    await test('GET /espacos - Listar espaços', async () => {
        const r = await req('GET', '/espacos', null, true);
        return assert(r.status === 200 && Array.isArray(r.data), `Listou ${r.data?.length || 0} espaços`);
    });

    // 4. Agendamentos
    await test('POST /agendamentos - Criar agendamento', async () => {
        const inicio = new Date();
        inicio.setDate(inicio.getDate() + 1);
        inicio.setHours(10, 0, 0, 0);
        const fim = new Date(inicio);
        fim.setHours(11, 0, 0, 0);

        const r = await req('POST', '/agendamentos', {
            clientId, spaceId,
            dataInicio: inicio.toISOString(),
            dataFim: fim.toISOString()
        }, true);
        if (r.status === 201) appointmentId = r.data.id;
        return assert(r.status === 201, `Agendamento criado id=${r.data.id}`);
    });

    await test('POST /agendamentos - Conflito de horário (mesmo espaço/horário)', async () => {
        const inicio = new Date();
        inicio.setDate(inicio.getDate() + 1);
        inicio.setHours(10, 0, 0, 0);
        const fim = new Date(inicio);
        fim.setHours(11, 0, 0, 0);

        const r = await req('POST', '/agendamentos', {
            clientId, spaceId,
            dataInicio: inicio.toISOString(),
            dataFim: fim.toISOString()
        }, true);
        return assert(r.status === 400, `Conflito detectado: ${r.status}`);
    });

    await test('GET /agendamentos - Listar agendamentos', async () => {
        const r = await req('GET', '/agendamentos', null, true);
        return assert(r.status === 200 && Array.isArray(r.data), `Listou ${r.data?.length || 0} agendamentos`);
    });

    await test('PATCH /agendamentos/:id/status - Atualizar status', async () => {
        const r = await req('PATCH', `/agendamentos/${appointmentId}/status`, { status: 'Confirmado' }, true);
        return assert(r.status === 200 && r.data.status === 'Confirmado', `Status atualizado para ${r.data.status}`);
    });

    // 5. Bloqueios
    await test('POST /bloqueios - Criar bloqueio', async () => {
        const inicio = new Date();
        inicio.setDate(inicio.getDate() + 2);
        inicio.setHours(14, 0, 0, 0);
        const fim = new Date(inicio);
        fim.setHours(16, 0, 0, 0);

        const r = await req('POST', '/bloqueios', {
            spaceId, motivo: 'Manutenção',
            dataInicio: inicio.toISOString(),
            dataFim: fim.toISOString()
        }, true);
        if (r.status === 201) bloqueioId = r.data.id;
        return assert(r.status === 201, `Bloqueio criado id=${r.data.id}`);
    });

    await test('GET /bloqueios - Listar bloqueios', async () => {
        const r = await req('GET', '/bloqueios', null, true);
        return assert(r.status === 200 && Array.isArray(r.data), `Listou ${r.data?.length || 0} bloqueios`);
    });

    // 6. Config
    await test('GET /config - Buscar configurações', async () => {
        const r = await req('GET', '/config', null, true);
        return assert(r.status === 200 && r.data.horaInicio, `Config: ${r.data.horaInicio}-${r.data.horaFim}`);
    });

    await test('PUT /config - Atualizar configurações', async () => {
        const r = await req('PUT', '/config', {
            id: 1, horaInicio: '07:00', horaFim: '19:00',
            intervaloEntreAtend: 30, diasFuncionamento: '1,2,3,4,5,6'
        }, true);
        return assert(r.status === 200 && r.data.horaInicio === '07:00', `Config atualizada: ${r.data.horaInicio}`);
    });

    // 7. Google Status
    await test('GET /google/status - Status Google', async () => {
        const r = await req('GET', '/google/status', null, true);
        return assert(r.status === 200, `Google status: ${r.status}`);
    });

    // 8. Deleções (limpeza)
    await test('DELETE /bloqueios/:id - Deletar bloqueio', async () => {
        const r = await req('DELETE', `/bloqueios/${bloqueioId}`, null, true);
        return assert(r.status === 200, `Bloqueio deletado: ${r.status}`);
    });

    await test('DELETE /agendamentos/:id - Deletar agendamento', async () => {
        const r = await req('DELETE', `/agendamentos/${appointmentId}`, null, true);
        return assert(r.status === 200, `Agendamento deletado: ${r.status}`);
    });

    await test('DELETE /espacos/:id - Deletar espaço', async () => {
        const r = await req('DELETE', `/espacos/${spaceId}`, null, true);
        return assert(r.status === 200, `Espaço deletado: ${r.status}`);
    });

    await test('DELETE /clientes/:id - Deletar cliente', async () => {
        const r = await req('DELETE', `/clientes/${clientId}`, null, true);
        return assert(r.status === 200, `Cliente deletado: ${r.status}`);
    });

    console.log('\n========================================');
    console.log('  TESTES FINALIZADOS');
    console.log('========================================\n');
}

run().catch(console.error);
