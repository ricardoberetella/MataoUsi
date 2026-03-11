const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ATUALIZA OS CARDS DO TOPO E SELECTS DOS MODAIS
async function atualizarDashboard() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    const mBanco = document.getElementById('mBanco');
    const tOrigem = document.getElementById('tOrigem');
    const tDestino = document.getElementById('tDestino');

    if (mBanco) mBanco.innerHTML = '';
    if (tOrigem) tOrigem.innerHTML = '';
    if (tDestino) tDestino.innerHTML = '';

    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if (nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = moeda(b.saldo);
        if (nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = moeda(b.saldo);
        if (nome.includes('APLICA')) document.getElementById('resumoAplicacao').innerText = moeda(b.saldo);

        let opt = `<option value="${b.id}">${b.nome}</option>`;
        if (tOrigem) { tOrigem.innerHTML += opt; tDestino.innerHTML += opt; }
        if (mBanco && !nome.includes('APLICA')) mBanco.innerHTML += opt;
    });

    const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
    document.getElementById('resumoPagar').innerText = moeda(pag?.reduce((acc, i) => acc + Number(i.valor), 0));

    const { data: rec } = await _supabase.from('contas_receber').select('valor').or('status.eq.ABERTO,status.eq.VENCIDO');
    document.getElementById('resumoReceber').innerText = moeda(rec?.reduce((acc, i) => acc + Number(i.valor), 0));
}

// CARREGA A TABELA COM A LÓGICA DE BOTÕES ALTERNÁVEIS
async function carregarTabela() {
    const status = document.getElementById('fStatus').value;
    const ini = document.getElementById('fDataInicio').value;
    const fim = document.getElementById('fDataFim').value;

    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    if (status) query = query.eq('status', status);
    if (ini) query = query.gte('vencimento', ini);
    if (fim) query = query.lte('vencimento', fim);

    const { data } = await query.order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const isAberto = item.status === 'ABERTO';
        const isPago = item.status === 'PAGO';
        const isRecebido = item.status === 'RECEBIDO';

        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="color:#22c55e;">${isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444;">${!isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="font-weight:bold; color:${isAberto ? '#fbbf24' : (isRecebido ? '#22c55e' : '#38bdf8')}">${item.status}</td>
                <td>
                    <button onclick="editar('${item.id}')" class="btn-acao" style="color:#38bdf8; border: 1px solid #38bdf8;">EDITAR</button>
                    
                    ${isAberto ? 
                        `<button onclick="efetivarPagamento('${item.id}')" class="btn-acao" style="color:#22c55e; border: 1px solid #22c55e;">PAGAR</button>` : 
                        (isPago ? `<button onclick="estornar('${item.id}')" class="btn-acao" style="color:#fbbf24; border: 1px solid #fbbf24;">ESTORNAR</button>` : '')
                    }

                    <button onclick="excluir('${item.id}')" class="btn-acao" style="color:#ef4444; border: 1px solid #ef4444;">EXCLUIR</button>
                </td>
            </tr>`;
    });
}

// LÓGICA DE SALDO AUTOMÁTICO NO BANCO
async function alterarSaldoBanco(bancoId, valor, operacao) {
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    let novoSaldo = operacao === 'SOMA' ? Number(b.saldo) + Number(valor) : Number(b.saldo) - Number(valor);
    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
}

// EFETIVAR PAGAMENTO (STATUS ABERTO -> PAGO)
async function efetivarPagamento(id) {
    if (!confirm("Confirmar o pagamento desta conta? O saldo será reduzido.")) return;
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    
    await alterarSaldoBanco(item.banco_id, item.valor, 'SUBTRAI');
    await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    carregarTudo();
}

// ESTORNAR PAGAMENTO (STATUS PAGO -> ABERTO)
async function estornar(id) {
    if (!confirm("Estornar este pagamento? O valor retornará ao banco.")) return;
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    
    await alterarSaldoBanco(item.banco_id, item.valor, 'SOMA');
    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    carregarTudo();
}

// EXCLUIR LANÇAMENTO (COM AJUSTE DE SALDO SE JÁ PAGO)
async function excluir(id) {
    if (!confirm("Excluir permanentemente? Se estiver pago/recebido, o saldo será ajustado.")) return;
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    
    if (item.status === 'PAGO') await alterarSaldoBanco(item.banco_id, item.valor, 'SOMA');
    if (item.status === 'RECEBIDO') await alterarSaldoBanco(item.banco_id, item.valor, 'SUBTRAI');
    
    await _supabase.from('contas_pagar').delete().eq('id', id);
    carregarTudo();
}

// EDIÇÃO E SALVAMENTO
async function editar(id) {
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    document.getElementById('editId').value = item.id;
    document.getElementById('mNF').value = item.descricao.split(':')[0].replace('NF ', '');
    document.getElementById('mDesc').value = item.descricao.split(':')[1]?.trim() || '';
    document.getElementById('mValor').value = item.valor;
    document.getElementById('mData').value = item.vencimento;
    document.getElementById('mBanco').value = item.banco_id;
    document.getElementById('tipoOperacao').value = item.status === 'RECEBIDO' ? 'CREDITO' : 'DEBITO';
    abrirModal(item.status === 'RECEBIDO' ? 'CREDITO' : 'DEBITO');
}

async function salvarOperacao() {
    const id = document.getElementById('editId').value;
    const tipo = document.getElementById('tipoOperacao').value;
    const bancoId = document.getElementById('mBanco').value;
    const valor = Number(document.getElementById('mValor').value);
    const nf = document.getElementById('mNF').value;
    const desc = document.getElementById('mDesc').value;
    const data = document.getElementById('mData').value;
    const statusFinal = tipo === 'DEBITO' ? 'PAGO' : 'RECEBIDO';

    if (id) {
        const { data: antigo } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
        if (antigo.status === 'PAGO') await alterarSaldoBanco(antigo.banco_id, antigo.valor, 'SOMA');
        if (antigo.status === 'RECEBIDO') await alterarSaldoBanco(antigo.banco_id, antigo.valor, 'SUBTRAI');

        await alterarSaldoBanco(bancoId, valor, statusFinal === 'PAGO' ? 'SUBTRAI' : 'SOMA');
        await _supabase.from('contas_pagar').update({
            descricao: `NF ${nf}: ${desc}`, valor, vencimento: data, status: statusFinal, banco_id: bancoId
        }).eq('id', id);
    } else {
        await _supabase.from('contas_pagar').insert([{
            descricao: `NF ${nf}: ${desc}`, valor, vencimento: data, status: statusFinal, banco_id: bancoId
        }]);
        await alterarSaldoBanco(bancoId, valor, tipo === 'DEBITO' ? 'SUBTRAI' : 'SOMA');
    }
    fecharModal(); carregarTudo();
}

// AUXILIARES DE MODAL
function abrirModal(tipo) {
    document.getElementById('tipoOperacao').value = tipo;
    document.getElementById('modalTitle').innerText = tipo === 'DEBITO' ? 'Débito' : 'Crédito';
    document.getElementById('modalLancamento').style.display = 'flex';
}
function fecharModal() { document.getElementById('modalLancamento').style.display = 'none'; document.getElementById('editId').value = ''; }
function abrirModalTransf() { document.getElementById('modalTransferencia').style.display = 'flex'; }
function fecharModalTransf() { document.getElementById('modalTransferencia').style.display = 'none'; }

async function executarTransferencia() {
    const oId = document.getElementById('tOrigem').value;
    const dId = document.getElementById('tDestino').value;
    const valor = Number(document.getElementById('tValor').value);
    if (oId === dId) return alert("Bancos iguais!");
    await alterarSaldoBanco(oId, valor, 'SUBTRAI');
    await alterarSaldoBanco(dId, valor, 'SOMA');
    fecharModalTransf(); carregarTudo();
}

async function carregarTudo() { await atualizarDashboard(); await carregarTabela(); }
carregarTudo();
