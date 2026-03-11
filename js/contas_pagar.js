const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Busca os bancos para preencher saldos e o Select do Modal
        const { data: bancos } = await _supabase.from('bancos').select('*');
        const selectBanco = document.getElementById('campoBanco');
        
        if (selectBanco) selectBanco.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');

        let sicoob = 0, caixa = 0, aplicacao = 0;
        bancos?.forEach(b => {
            if (b.nome === 'SICOOB') sicoob = b.saldo;
            if (b.nome === 'CAIXA FEDERAL') caixa = b.saldo;
            if (b.nome === 'APLICAÇÃO') aplicacao = b.saldo;
        });

        // 2. Soma Previsão a Receber (Somente ABERTO)
        const { data: receber } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        const totalReceber = receber?.reduce((acc, i) => acc + parseFloat(i.valor || 0), 0) || 0;

        // 3. Soma Contas a Pagar (Somente ABERTO)
        const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
        const totalPagar = pagar?.reduce((acc, i) => acc + parseFloat(i.valor || 0), 0) || 0;

        // Atualiza UI
        document.getElementById('resumoSicoob').innerText = moeda(sicoob);
        document.getElementById('resumoCaixa').innerText = moeda(caixa);
        document.getElementById('resumoAplicacao').innerText = moeda(aplicacao);
        document.getElementById('resumoReceber').innerText = moeda(totalReceber);
        document.getElementById('resumoPagar').innerText = moeda(totalPagar);

        // 4. Carrega Tabela com Join para mostrar nome do banco
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', {ascending: false});
        const corpo = document.getElementById('listaFinanceiro');
        if (corpo) {
            corpo.innerHTML = lista?.map(item => `
                <tr>
                    <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
                    <td>${item.bancos?.nome || 'N/A'}</td>
                    <td>${item.descricao}</td>
                    <td style="color:${item.tipo === 'CREDITO' ? '#22c55e' : '#ef4444'}">${moeda(item.valor)}</td>
                    <td>${item.status}</td>
                </tr>
            `).join('') || '';
        }

    } catch (err) {
        console.error("Erro Geral:", err.message);
    }
}

window.abrirModal = (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
};

window.fecharModal = () => {
    document.getElementById('modalFinanceiro').style.display = 'none';
};

window.salvarLancamento = async () => {
    const bancoId = document.getElementById('campoBanco').value; // Pega o UUID
    const desc = document.getElementById('campoDescricao').value;
    const valor = document.getElementById('campoValor').value;
    const tipo = document.getElementById('modalTitulo').innerText.includes('CREDITO') ? 'CREDITO' : 'DEBITO';

    if (!desc || !valor) return alert("Preencha todos os campos!");

    // Correção do erro do Print 14: usamos 'banco_id' em vez de 'banco'
    const { error } = await _supabase.from('contas_pagar').insert([{
        banco_id: bancoId,
        descricao: desc,
        valor: parseFloat(valor),
        tipo: tipo,
        status: 'PAGO',
        vencimento: new Date().toISOString().split('T')[0]
    }]);

    if (error) alert("Erro: " + error.message);
    else {
        fecharModal();
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
