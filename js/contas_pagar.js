var SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
var _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function atualizarDashboard() {
    // 1. Saldos Reais (Bancos)
    const { data: bancos } = await _supabase.from('bancos').select('*');
    let sicoob = 0, caixa = 0, aplic = 0;
    
    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if(nome.includes('SICOOB')) { sicoob = b.saldo; window.idSicoob = b.id; }
        if(nome.includes('CAIXA')) caixa = b.saldo;
        if(nome.includes('APLICA')) aplic = b.saldo;
    });

    // 2. Contas a Pagar (Abertas)
    const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
    const totalPagar = pagar?.reduce((acc, i) => acc + (Number(i.valor) || 0), 0) || 0;

    // 3. Previsão Receber (Abertos + Vencidos da tabela contas_receber)
    const { data: receber } = await _supabase.from('contas_receber').select('valor').or('status.eq.ABERTO,status.eq.VENCIDO');
    const totalReceber = receber?.reduce((acc, i) => acc + (Number(i.valor) || 0), 0) || 0;

    document.getElementById('resumoSicoob').innerText = moeda(sicoob);
    document.getElementById('resumoCaixa').innerText = moeda(caixa);
    document.getElementById('resumoAplicacao').innerText = moeda(aplic);
    document.getElementById('resumoPagar').innerText = moeda(totalPagar);
    document.getElementById('resumoReceber').innerText = moeda(totalReceber);
}

async function carregarLista() {
    const status = document.getElementById('fStatus').value;
    const ini = document.getElementById('fDataInicio').value;
    const fim = document.getElementById('fDataFim').value;

    let query = _supabase.from('contas_pagar').select('*');
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
                <td>${item.descricao}</td>
                <td style="color: #22c55e; font-weight: bold;">${isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="color: #ef4444;">${!isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="color: ${isRecebido ? '#22c55e' : (item.status === 'PAGO' ? '#38bdf8' : '#fbbf24')}; font-weight: bold;">${item.status}</td>
                <td>
                    ${item.status === 'ABERTO' 
                        ? `<button onclick="confirmarAcao('${item.id}', ${item.valor}, '${item.descricao}')" class="btn btn-pagar">Pagar</button>`
                        : `<button onclick="estornarLancamento('${item.id}', ${item.valor}, '${item.status}')" class="btn btn-estornar">Estornar</button>`
                    }
                    <button onclick="excluirLancamento('${item.id}')" class="btn btn-excluir">✕</button>
                </td>
            </tr>`;
    });
}

async function confirmarAcao(id, valor, desc) {
    if(!confirm(`Confirmar ação para: ${desc}?`)) return;

    // Se for NF ENTRADA vira RECEBIDO, senão vira PAGO. Ambos usam SICOOB nesta lógica.
    const isNF = desc.toUpperCase().includes("NF ENTRADA");
    const novoStatus = isNF ? "RECEBIDO" : "PAGO";
    
    // 1. Atualiza Status
    await _supabase.from('contas_pagar').update({ 
        status: novoStatus, 
        banco_id: window.idSicoob 
    }).eq('id', id);

    // 2. Atualiza Saldo no Banco (Soma se for entrada, subtrai se for saída)
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', window.idSicoob).single();
    let novoSaldo = isNF ? (Number(b.saldo) + Number(valor)) : (Number(b.saldo) - Number(valor));
    
    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', window.idSicoob);

    carregarTudo();
}

async function estornarLancamento(id, valor, statusAnterior) {
    if(!confirm("Estornar valor e voltar para aberto?")) return;

    // 1. Volta para ABERTO
    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);

    // 2. Reverte saldo no banco
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', window.idSicoob).single();
    let novoSaldo = (statusAnterior === "RECEBIDO") ? (Number(b.saldo) - Number(valor)) : (Number(b.saldo) + Number(valor));

    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', window.idSicoob);

    carregarTudo();
}

async function excluirLancamento(id) {
    if(confirm("Excluir permanentemente?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
}

async function carregarTudo() {
    await carregarLista();
    await atualizarDashboard();
}

carregarTudo();
