const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
                <td title="${item.descricao}">${item.descricao}</td>
                <td style="color:#22c55e;">${isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444;">${!isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="font-weight:bold; color:${isAberto ? '#fbbf24' : (isRecebido ? '#22c55e' : '#38bdf8')}">${item.status}</td>
                <td style="white-space: nowrap;">
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

// Funções de saldo e ações (Pagar, Estornar, Excluir) permanecem idênticas à lógica enviada anteriormente
async function alterarSaldoBanco(bancoId, valor, operacao) {
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    let novoSaldo = operacao === 'SOMA' ? Number(b.saldo) + Number(valor) : Number(b.saldo) - Number(valor);
    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
}

async function efetivarPagamento(id) {
    if (!confirm("Confirmar pagamento?")) return;
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    await alterarSaldoBanco(item.banco_id, item.valor, 'SUBTRAI');
    await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    carregarTudo();
}

async function estornar(id) {
    if (!confirm("Estornar lançamento?")) return;
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    await alterarSaldoBanco(item.banco_id, item.valor, 'SOMA');
    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    carregarTudo();
}

async function excluir(id) {
    if (!confirm("Excluir registro?")) return;
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    if (item.status === 'PAGO') await alterarSaldoBanco(item.banco_id, item.valor, 'SOMA');
    await _supabase.from('contas_pagar').delete().eq('id', id);
    carregarTudo();
}

async function atualizarDashboard() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if (nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = moeda(b.saldo);
        if (nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = moeda(b.saldo);
    });
}

async function carregarTudo() { await atualizarDashboard(); await carregarTabela(); }
carregarTudo();
