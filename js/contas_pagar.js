// Inicialização do Supabase (Corrigido para evitar conflitos de variáveis)
var SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
var _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    await carregarLista();
    await atualizarDashboard();
}

async function atualizarDashboard() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    let sicoob = 0, caixa = 0, aplic = 0;
    
    bancos?.forEach(b => {
        if(b.nome.includes('SICOOB')) { sicoob = b.saldo; window.idSicoob = b.id; }
        if(b.nome.includes('CAIXA')) caixa = b.saldo;
        if(b.nome.includes('APLICA')) aplic = b.saldo;
    });

    const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
    const totalPagar = pagar?.reduce((acc, i) => acc + i.valor, 0) || 0;

    document.getElementById('resumoSicoob').innerText = moeda(sicoob);
    document.getElementById('resumoCaixa').innerText = moeda(caixa);
    document.getElementById('resumoAplicacao').innerText = moeda(aplic);
    document.getElementById('resumoPagar').innerText = moeda(totalPagar);
}

async function carregarLista() {
    const status = document.getElementById('fStatus').value;
    const ini = document.getElementById('fDataInicio').value;
    const fim = document.getElementById('fDataFim').value;

    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    if (status) query = query.eq('status', status);
    if (ini) query = query.gte('vencimento', ini);
    if (fim) query = query.lte('vencimento', fim);

    const { data } = await query.order('vencimento', { ascending: true });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const isRecebido = item.status === "RECEBIDO";
        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || 'SICOOB'}</td>
                <td>${item.descricao}</td>
                <td style="color: #22c55e; font-weight: bold;">${isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="color: #ef4444;">${!isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="color: ${isRecebido ? '#22c55e' : '#fbbf24'}; font-weight: bold;">${item.status}</td>
                <td>
                    ${item.status === 'ABERTO' 
                        ? `<button onclick="confirmarPagamento('${item.id}', ${item.valor}, '${item.descricao}')" class="btn btn-pagar">Pagar</button>`
                        : `<button onclick="estornarLancamento('${item.id}', ${item.valor}, '${item.status}')" class="btn btn-estornar">Estornar</button>`
                    }
                    <button onclick="excluirLancamento('${item.id}')" class="btn btn-excluir">✕</button>
                </td>
            </tr>`;
    });
}

// Lógica Automática para NF de Entrada -> Vira RECEBIDO no SICOOB
async function confirmarPagamento(id, valor, descricao) {
    if(!confirm("Confirmar pagamento/entrada deste boleto?")) return;

    // Se for NF Entrada, vira RECEBIDO automaticamente no SICOOB
    let novoStatus = descricao.toUpperCase().includes("NF ENTRADA") ? "RECEBIDO" : "PAGO";
    let bancoId = window.idSicoob; // Sempre SICOOB para entradas automáticas

    // 1. Atualiza o status do lançamento
    await _supabase.from('contas_pagar').update({ 
        status: novoStatus, 
        banco_id: bancoId,
        descricao: descricao.toUpperCase().includes("NF ENTRADA") ? "BOLETO: " + descricao.replace("NF ENTRADA:", "").trim() : descricao
    }).eq('id', id);

    // 2. Atualiza o saldo do Banco SICOOB
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    let novoSaldo = (novoStatus === "RECEBIDO") ? (b.saldo + valor) : (b.saldo - valor);
    
    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);

    carregarTudo();
}

async function estornarLancamento(id, valor, statusAnterior) {
    if(!confirm("Deseja estornar e reverter o valor no banco?")) return;

    // 1. Volta para ABERTO
    const { data: item } = await _supabase.from('contas_pagar').select('banco_id').eq('id', id).single();
    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);

    // 2. Reverte o valor no banco (Subtrai se era entrada, soma se era saída)
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', item.banco_id).single();
    let novoSaldo = (statusAnterior === "RECEBIDO") ? (b.saldo - valor) : (b.saldo + valor);

    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', item.banco_id);

    carregarTudo();
}

async function excluirLancamento(id) {
    if(!confirm("Excluir registro permanentemente?")) return;
    await _supabase.from('contas_pagar').delete().eq('id', id);
    carregarTudo();
}

// Início
carregarTudo();
