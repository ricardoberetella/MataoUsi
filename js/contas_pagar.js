// Configurações Globais (Usando 'var' para evitar erro de redeclaração no console)
var SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
var _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarBancos() {
    const { data } = await _supabase.from('bancos').select('id, nome');
    const select = document.getElementById('fBanco');
    if(!select) return;
    data?.forEach(b => {
        let opt = document.createElement('option');
        opt.value = b.id;
        opt.innerText = b.nome;
        select.appendChild(opt);
    });
}

async function atualizarDashboard() {
    // 1. Saldos Bancários Reais
    const { data: bancos } = await _supabase.from('bancos').select('nome, saldo');
    let sicoob = 0, caixa = 0, aplic = 0;
    bancos?.forEach(b => {
        const n = b.nome.toUpperCase();
        if(n.includes('SICOOB')) sicoob = b.saldo;
        if(n.includes('CAIXA')) caixa = b.saldo;
        if(n.includes('APLICA')) aplic = b.saldo;
    });

    // 2. Contas a Pagar (Aberto)
    const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO').not('descricao', 'ilike', '%NF ENTRADA%');
    const totalPagar = pagar?.reduce((acc, i) => acc + i.valor, 0) || 0;

    // 3. Contas a Receber (Vencidos ou Pendentes)
    const { data: receber } = await _supabase.from('contas_receber').select('valor').neq('status', 'PAGO');
    const totalReceber = receber?.reduce((acc, i) => acc + (Number(i.valor) || 0), 0) || 0;

    const projetado = (sicoob + caixa + aplic + totalReceber) - totalPagar;

    document.getElementById('resumoSicoob').innerText = moeda(sicoob);
    document.getElementById('resumoCaixa').innerText = moeda(caixa);
    document.getElementById('resumoAplicacao').innerText = moeda(aplic);
    document.getElementById('resumoPagar').innerText = moeda(totalPagar);
    document.getElementById('resumoReceber').innerText = moeda(totalReceber);
    document.getElementById('resumoTotal').innerText = moeda(projetado);
    document.getElementById('resumoTotal').style.color = projetado >= 0 ? '#38bdf8' : '#ef4444';
}

async function carregarContas() {
    const status = document.getElementById('fStatus').value;
    const bancoId = document.getElementById('fBanco').value;
    const ini = document.getElementById('fDataInicio').value;
    const fim = document.getElementById('fDataFim').value;

    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');

    if (status) query = query.eq('status', status);
    if (bancoId) query = query.eq('banco_id', bancoId);
    if (ini) query = query.gte('vencimento', ini);
    if (fim) query = query.lte('vencimento', fim);

    const { data } = await query.order('vencimento', { ascending: true });
    const corpo = document.getElementById('listaPagar');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const isEntrada = item.descricao.toUpperCase().includes("NF ENTRADA") || item.status === "RECEBIDO";
        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="text-align: right; color:#22c55e">${isEntrada ? moeda(item.valor) : '-'}</td>
                <td style="text-align: right; color:#ef4444">${!isEntrada ? moeda(item.valor) : '-'}</td>
                <td style="text-align: center; font-weight: bold; color: ${item.status === 'ABERTO' ? '#fbbf24' : '#22c55e'}">${item.status}</td>
                <td style="text-align: center;">
                    <button onclick="excluirLancamento('${item.id}')" class="btn btn-vermelho" style="padding: 5px 10px;">✕</button>
                </td>
            </tr>`;
    });
}

window.excluirLancamento = async (id) => {
    if(!confirm("Deseja realmente excluir este registro?")) return;
    const { error } = await _supabase.from('contas_pagar').delete().eq('id', id);
    if(!error) carregarTudo();
};

async function carregarTudo() {
    await carregarContas();
    await atualizarDashboard();
}

// Inicialização
carregarBancos();
carregarTudo();
