// Use variáveis simples para evitar o erro "Identifier has already been declared"
var SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
var _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function moeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

async function atualizarDashboard() {
    try {
        // Busca Bancos
        const { data: bancos } = await _supabase.from('bancos').select('nome, saldo');
        let sicoob = 0, caixa = 0, aplic = 0;
        bancos?.forEach(b => {
            if(b.nome.includes('SICOOB')) sicoob = b.saldo;
            if(b.nome.includes('CAIXA')) caixa = b.saldo;
            if(b.nome.includes('APLICA')) aplic = b.saldo;
        });

        // Busca Contas a Pagar (Aberto)
        const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO').not('descricao', 'ilike', '%NF ENTRADA%');
        const totalPagar = pagar?.reduce((acc, i) => acc + i.valor, 0) || 0;

        // Busca Contas a Receber (Não Pago)
        const { data: receber } = await _supabase.from('contas_receber').select('valor').neq('status', 'PAGO');
        const totalReceber = receber?.reduce((acc, i) => acc + (Number(i.valor) || 0), 0) || 0;

        const totalGeral = (sicoob + caixa + aplic + totalReceber) - totalPagar;

        document.getElementById('resumoSicoob').innerText = moeda(sicoob);
        document.getElementById('resumoCaixa').innerText = moeda(caixa);
        document.getElementById('resumoAplicacao').innerText = moeda(aplic);
        document.getElementById('resumoPagar').innerText = moeda(totalPagar);
        document.getElementById('resumoReceber').innerText = moeda(totalReceber);
        document.getElementById('resumoTotal').innerText = moeda(totalGeral);
    } catch (e) { console.error("Erro no dashboard:", e); }
}

async function carregarContas() {
    const { data } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento');
    const corpo = document.getElementById('listaPagar');
    if(!corpo) return;
    corpo.innerHTML = '';

    data?.forEach(item => {
        const isNF = item.descricao.toUpperCase().includes("NF ENTRADA");
        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="color:#22c55e">${isNF ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444">${!isNF ? moeda(item.valor) : '-'}</td>
                <td>${item.status}</td>
                <td>
                    <button onclick="excluir('${item.id}', '${item.status}', ${item.valor}, '${item.banco_id}')" class="btn btn-vermelho">✕</button>
                </td>
            </tr>`;
    });
}

window.excluir = async (id, status, val, bId) => {
    if(!confirm("Deseja excluir?")) return;
    if(status !== 'ABERTO') {
        const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
        let novoSaldo = (status === 'RECEBIDO') ? (b.saldo - val) : (b.saldo + val);
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bId);
    }
    await _supabase.from('contas_pagar').delete().eq('id', id);
    carregarTudo();
};

async function carregarTudo() {
    await carregarContas();
    await atualizarDashboard();
}

// Inicia o sistema
carregarTudo();
