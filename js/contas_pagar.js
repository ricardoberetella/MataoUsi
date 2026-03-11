const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Carrega Bancos
        const { data: bancos } = await _supabase.from('bancos').select('*');
        const selectBanco = document.getElementById('campoBanco');
        if (selectBanco) selectBanco.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');

        let sicoob = 0, caixa = 0, aplicacao = 0;
        bancos?.forEach(b => {
            if (b.nome === 'SICOOB') sicoob = b.saldo;
            if (b.nome === 'CAIXA FEDERAL') caixa = b.saldo;
            if (b.nome === 'APLICAÇÃO') aplicacao = b.saldo;
        });

        // 2. Previsão Receber (status ABERTO) -> R$ 322.266,46
        const { data: receber } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        const totalReceber = receber?.reduce((acc, i) => acc + parseFloat(i.valor || 0), 0) || 0;

        // 3. Contas a Pagar (status ABERTO)
        const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
        const totalPagar = pagar?.reduce((acc, i) => acc + parseFloat(i.valor || 0), 0) || 0;

        document.getElementById('resumoSicoob').innerText = moeda(sicoob);
        document.getElementById('resumoCaixa').innerText = moeda(caixa);
        document.getElementById('resumoAplicacao').innerText = moeda(aplicacao);
        document.getElementById('resumoReceber').innerText = moeda(totalReceber);
        document.getElementById('resumoPagar').innerText = moeda(totalPagar);

        // 4. Lista de Lançamentos
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', {ascending: false});
        const corpo = document.getElementById('listaFinanceiro');
        if (corpo) {
            corpo.innerHTML = lista?.map(item => `
                <tr>
                    <td>${item.vencimento ? new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td>
                    <td>${item.bancos?.nome || 'N/A'}</td>
                    <td>${item.descricao}</td>
                    <td style="color:${item.valor < 0 ? '#ef4444' : '#22c55e'}; font-weight:bold;">${moeda(item.valor)}</td>
                    <td>${item.status || 'PAGO'}</td>
                    <td><button onclick="excluir('${item.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button></td>
                </tr>
            `).join('') || '';
        }
    } catch (err) {
        console.error("Erro:", err.message);
    }
}

window.abrirModal = (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
    document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
};

window.fecharModal = () => document.getElementById('modalFinanceiro').style.display = 'none';

window.salvarLancamento = async () => {
    const data = document.getElementById('campoData').value;
    const bancoId = document.getElementById('campoBanco').value;
    const desc = document.getElementById('campoDescricao').value;
    let valor = parseFloat(document.getElementById('campoValor').value);
    const tipo = document.getElementById('modalTitulo').innerText;

    if (!data || !desc || isNaN(valor)) return alert("Preencha todos os campos!");

    // Se for Débito, transforma o valor em negativo para o banco de dados
    if (tipo.includes('DEBITO')) valor = -Math.abs(valor);

    // REMOVIDA A COLUNA 'TIPO' PARA EVITAR O ERRO DO PRINT
    const { error } = await _supabase.from('contas_pagar').insert([{
        vencimento: data,
        banco_id: bancoId,
        descricao: desc,
        valor: valor,
        status: 'PAGO'
    }]);

    if (error) alert("Erro Supabase: " + error.message);
    else {
        fecharModal();
        carregarTudo();
    }
};

window.excluir = async (id) => {
    if (confirm("Excluir lançamento?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
