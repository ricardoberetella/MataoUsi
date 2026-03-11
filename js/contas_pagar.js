// Configurações do seu projeto Supabase
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Sincroniza os cards com os valores reais do Banco de Dados
async function atualizarCards() {
    try {
        // 1. Busca saldos diretamente da tabela 'bancos'
        const { data: bancos, error: errBancos } = await _supabase.from('bancos').select('nome, saldo');
        if (errBancos) throw errBancos;

        let saldoSicoob = 0, saldoCaixa = 0, saldoAplicacao = 0;
        bancos?.forEach(b => {
            if (b.nome === 'SICOOB') saldoSicoob = b.saldo;
            if (b.nome === 'CAIXA FEDERAL') saldoCaixa = b.saldo;
            if (b.nome === 'APLICAÇÃO') saldoAplicacao = b.saldo;
        });

        // 2. Busca total em aberto da tabela 'contas_receber'
        const { data: receber, error: errReceber } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        if (errReceber) throw errReceber;
        const totalReceber = receber?.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0) || 0;

        // 3. Busca total em aberto da tabela 'contas_pagar'
        const { data: pagar, error: errPagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
        if (errPagar) throw errPagar;
        const totalPagar = pagar?.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0) || 0;

        // Atualiza a tela
        document.getElementById('resumoSicoob').innerText = moeda(saldoSicoob);
        document.getElementById('resumoCaixa').innerText = moeda(saldoCaixa);
        document.getElementById('resumoAplicacao').innerText = moeda(saldoAplicacao);
        document.getElementById('resumoReceber').innerText = moeda(totalReceber);
        document.getElementById('resumoPagar').innerText = moeda(totalPagar);

    } catch (err) {
        console.error("Erro ao sincronizar dados:", err.message);
    }
}

// Abre o modal para novo lançamento
window.abrirModal = (tipo) => {
    const modal = document.getElementById('modalFinanceiro');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
        document.getElementById('campoDescricao').value = '';
        document.getElementById('campoValor').value = '';
    }
};

window.fecharModal = () => {
    document.getElementById('modalFinanceiro').style.display = 'none';
};

// Salva um novo lançamento e atualiza tudo
window.salvarLancamento = async () => {
    const banco = document.getElementById('campoBanco').value;
    const desc = document.getElementById('campoDescricao').value;
    const valorInput = document.getElementById('campoValor').value;
    const tipoLabel = document.getElementById('modalTitulo').innerText;
    const tipo = tipoLabel.includes('CREDITO') ? 'CREDITO' : 'DEBITO';

    if (!desc || !valorInput) return alert("Preencha Descrição e Valor!");

    const { error } = await _supabase.from('contas_pagar').insert([
        { 
            banco, 
            descricao: desc, 
            valor: parseFloat(valorInput), 
            tipo, 
            status: 'PAGO', 
            vencimento: new Date().toISOString().split('T')[0] 
        }
    ]);

    if (error) alert("Erro ao salvar: " + error.message);
    else {
        fecharModal();
        carregarTudo();
    }
};

// Renderiza a tabela de extrato
async function carregarTabela() {
    const { data, error } = await _supabase.from('contas_pagar').select('*').order('vencimento', { ascending: false });
    if (error) return console.error("Erro ao carregar tabela:", error.message);
    
    const corpo = document.getElementById('listaFinanceiro');
    if (!corpo) return;
    
    corpo.innerHTML = data?.map(item => `
        <tr>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td>${item.banco}</td>
            <td>${item.descricao}</td>
            <td style="color:${item.tipo === 'CREDITO' ? '#22c55e' : '#ef4444'}; font-weight:bold;">${moeda(item.valor)}</td>
            <td style="font-weight:bold; color:${item.status === 'ABERTO' ? '#fbbf24' : '#22c55e'}">${item.status}</td>
            <td><button onclick="excluirRegistro('${item.id}')" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">X</button></td>
        </tr>`).join('') || '';
}

window.carregarTudo = () => {
    atualizarCards();
    carregarTabela();
};

document.addEventListener('DOMContentLoaded', carregarTudo);
