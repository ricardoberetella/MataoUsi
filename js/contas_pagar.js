// CONFIGURAÇÃO - COLOQUE SEUS DADOS AQUI
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// FUNÇÕES GLOBAIS PARA OS BOTÕES FUNCIONAREM
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

// CÁLCULO DOS SALDOS E PREENCHIMENTO DOS CARDS
async function atualizarCards() {
    try {
        const { data: lancamentos, error } = await _supabase.from('contas_pagar').select('*');
        if (error) throw error;

        let sicoob = 0, caixa = 0, pagar = 0, receber = 0;

        lancamentos?.forEach(item => {
            const val = parseFloat(item.valor || 0);
            if (item.status === 'PAGO') {
                if (item.banco === 'SICOOB') item.tipo === 'CREDITO' ? sicoob += val : sicoob -= val;
                if (item.banco === 'CAIXA FEDERAL') item.tipo === 'CREDITO' ? caixa += val : caixa -= val;
            } else if (item.status === 'ABERTO') {
                item.tipo === 'DEBITO' ? pagar += val : receber += val;
            }
        });

        document.getElementById('resumoSicoob').innerText = moeda(sicoob);
        document.getElementById('resumoCaixa').innerText = moeda(caixa);
        document.getElementById('resumoPagar').innerText = moeda(pagar);
        document.getElementById('resumoReceber').innerText = moeda(receber);
    } catch (err) {
        console.error("Erro na conexão:", err.message);
    }
}

// SALVAR NOVO LANÇAMENTO
window.salvarLancamento = async () => {
    const banco = document.getElementById('campoBanco').value;
    const desc = document.getElementById('campoDescricao').value;
    const valor = document.getElementById('campoValor').value;
    const tipoLabel = document.getElementById('modalTitulo').innerText;
    const tipo = tipoLabel.includes('CREDITO') ? 'CREDITO' : 'DEBITO';

    if (!desc || !valor) return alert("Preencha todos os campos!");

    const { error } = await _supabase.from('contas_pagar').insert([
        { 
            banco, 
            descricao: desc, 
            valor: parseFloat(valor), 
            tipo, 
            status: 'PAGO', 
            vencimento: new Date().toISOString().split('T')[0] 
        }
    ]);

    if (error) alert("Erro ao salvar!");
    else {
        fecharModal();
        carregarTudo();
    }
};

async function carregarTabela() {
    const { data } = await _supabase.from('contas_pagar').select('*').order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    if (!corpo) return;
    
    corpo.innerHTML = data?.map(item => `
        <tr>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td>${item.banco}</td>
            <td>${item.descricao}</td>
            <td style="color:${item.tipo === 'CREDITO' ? '#22c55e' : '#ef4444'}; font-weight:bold;">${moeda(item.valor)}</td>
            <td style="color:${item.status === 'ABERTO' ? '#fbbf24' : '#22c55e'}">${item.status}</td>
            <td><button onclick="excluirRegistro('${item.id}')" style="background:#ef4444; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">X</button></td>
        </tr>`).join('') || '';
}

window.carregarTudo = () => {
    atualizarCards();
    carregarTabela();
};

// INICIAR AO CARREGAR PÁGINA
document.addEventListener('DOMContentLoaded', carregarTudo);
