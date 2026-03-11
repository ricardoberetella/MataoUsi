// Configurações do Supabase
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // Busca bancos e atualiza os cards de saldo
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            const select = document.getElementById('campoBanco');
            if (select) select.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            
            bancos.forEach(b => {
                const idCard = b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : b.nome === 'SICOOB' ? 'resumoSicoob' : 'resumoAplicacao';
                const el = document.getElementById(idCard);
                if (el) el.innerText = moeda(b.saldo);
            });
        }

        // Carrega a lista do extrato
        const { data: lista, error } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        if (error) throw error;

        const corpo = document.getElementById('listaFinanceiro');
        if (!corpo) return;

        corpo.innerHTML = lista.map(item => {
            const isPago = item.status === 'PAGO';
            return `
                <tr>
                    <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${item.bancos?.nome || 'Bco Removido'}</td>
                    <td>${item.descricao}</td>
                    <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${moeda(item.valor)}</td>
                    <td class="${isPago ? 'status-pago' : 'status-pendente'}">${item.status}</td>
                    <td>
                        <button class="btn-acao" onclick="toggleStatus('${item.id}', '${item.status}')">
                            ${isPago ? '↩ Estornar' : '✔ Pagar'}
                        </button>
                        <button class="btn-acao" onclick="excluir('${item.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) { console.error("Erro:", e.message); }
}

window.abrirModal = (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
    document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
};

window.salvarLancamento = async () => {
    const tipo = document.getElementById('modalTitulo').innerText;
    let valor = parseFloat(document.getElementById('campoValor').value);
    
    // Define se é entrada ou saída
    valor = tipo.includes('DEBITO') ? -Math.abs(valor) : Math.abs(valor);

    const { error } = await _supabase.from('contas_pagar').insert([{
        vencimento: document.getElementById('campoData').value,
        banco_id: document.getElementById('campoBanco').value,
        descricao: document.getElementById('campoDescricao').value,
        valor: valor,
        status: 'PENDENTE'
    }]);

    if (error) alert("Erro: " + error.message);
    else { fecharModal(); carregarTudo(); }
};

window.toggleStatus = async (id, status) => {
    const novoStatus = status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    await _supabase.from('contas_pagar').update({ status: novoStatus }).eq('id', id);
    carregarTudo();
};

window.fecharModal = () => document.getElementById('modalFinanceiro').style.display = 'none';

document.addEventListener('DOMContentLoaded', carregarTudo);
