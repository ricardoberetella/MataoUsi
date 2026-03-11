const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function atualizarDashboard() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    
    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if (nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = moeda(b.saldo);
        if (nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = moeda(b.saldo);
        if (nome.includes('APLICA')) document.getElementById('resumoAplicacao').innerText = moeda(b.saldo);
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
        const isRecebido = item.status === 'RECEBIDO';
        const corStatus = item.status === 'ABERTO' ? '#fbbf24' : (isRecebido ? '#22c55e' : '#38bdf8');

        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="color:#22c55e;">${isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444;">${!isRecebido ? moeda(item.valor) : '-'}</td>
                <td style="font-weight:bold; color:${corStatus}">${item.status}</td>
            </tr>`;
    });
}

window.carregarTudo = async () => {
    await atualizarDashboard();
    await carregarTabela();
};

// Inicialização
carregarTudo();
