const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
        const val = moeda(b.saldo);
        if (nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = val;
        if (nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = val;
        if (nome.includes('APLICA')) document.getElementById('resumoAplicacao').innerText = val;

        // Regras para os selects de modal
        let option = `<option value="${b.id}">${b.nome}</option>`;
        if (tOrigem) { tOrigem.innerHTML += option; tDestino.innerHTML += option; }
        // No Débito/Crédito, exclui Aplicação
        if (mBanco && !nome.includes('APLICA')) { mBanco.innerHTML += option; }
    });

    const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
    document.getElementById('resumoPagar').innerText = moeda(pag?.reduce((acc, i) => acc + Number(i.valor), 0));

    const { data: rec } = await _supabase.from('contas_receber').select('valor').or('status.eq.ABERTO,status.eq.VENCIDO');
    document.getElementById('resumoReceber').innerText = moeda(rec?.reduce((acc, i) => acc + Number(i.valor), 0));
}

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
        const isEntrada = item.status === 'RECEBIDO';
        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="color:#22c55e; font-weight:bold;">${isEntrada ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444;">${!isEntrada ? moeda(item.valor) : '-'}</td>
                <td style="font-weight:bold; color:${isEntrada ? '#22c55e' : '#38bdf8'}">${item.status}</td>
                <td><button onclick="excluir('${item.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">✕</button></td>
            </tr>`;
    });
}

// Modais
function abrirModal(tipo) {
    document.getElementById('tipoOperacao').value = tipo;
    document.getElementById('modalTitle').innerText = tipo === 'DEBITO' ? 'Novo Débito (Saída)' : 'Novo Crédito (Entrada)';
    document.getElementById('modalLancamento').style.display = 'flex';
}
function fecharModal() { document.getElementById('modalLancamento').style.display = 'none'; }

function abrirModalTransf() { document.getElementById('modalTransferencia').style.display = 'flex'; }
function fecharModalTransf() { document.getElementById('modalTransferencia').style.display = 'none'; }

// Operações de Banco
async function salvarOperacao() {
    const tipo = document.getElementById('tipoOperacao').value;
    const bancoId = document.getElementById('mBanco').value;
    const valor = Number(document.getElementById('mValor').value);
    const nf = document.getElementById('mNF').value;
    const desc = document.getElementById('mDesc').value;
    const data = document.getElementById('mData').value;

    if (!valor || !data) return alert("Preencha Valor e Data");

    const statusFinal = tipo === 'DEBITO' ? 'PAGO' : 'RECEBIDO';
    await _supabase.from('contas_pagar').insert([{
        descricao: `NF ${nf}: ${desc}`, valor, vencimento: data, status: statusFinal, banco_id: bancoId
    }]);

    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    const novoSaldo = tipo === 'DEBITO' ? (Number(b.saldo) - valor) : (Number(b.saldo) + valor);
    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);

    fecharModal();
    carregarTudo();
}

async function executarTransferencia() {
    const oId = document.getElementById('tOrigem').value;
    const dId = document.getElementById('tDestino').value;
    const valor = Number(document.getElementById('tValor').value);

    if (oId === dId) return alert("Escolha bancos diferentes");
    if (valor <= 0) return alert("Informe o valor");

    // Sai da Origem
    const { data: bO } = await _supabase.from('bancos').select('saldo').eq('id', oId).single();
    await _supabase.from('bancos').update({ saldo: Number(bO.saldo) - valor }).eq('id', oId);

    // Entra no Destino
    const { data: bD } = await _supabase.from('bancos').select('saldo').eq('id', dId).single();
    await _supabase.from('bancos').update({ saldo: Number(bD.saldo) + valor }).eq('id', dId);

    fecharModalTransf();
    carregarTudo();
}

async function excluir(id) {
    if (confirm("Excluir este lançamento?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
}

async function carregarTudo() {
    await atualizarDashboard();
    await carregarTabela();
}

// Iniciar
carregarTudo();
