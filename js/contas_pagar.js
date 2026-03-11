const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg"; // Substitua pela sua chave anon do Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Carregar Bancos e Saldos (SICOOB, CAIXA, APLICAÇÃO)
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            const select = document.getElementById('campoBanco');
            if (select) select.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            
            bancos.forEach(b => {
                let id = b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : b.nome === 'SICOOB' ? 'resumoSicoob' : 'resumoAplicacao';
                let el = document.getElementById(id);
                if (el) el.innerText = moeda(b.saldo);
            });
        }

        // 2. Previsão Receber (Soma da tabela contas_receber onde status é ABERTO)
        const { data: rec } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        if (rec) {
            const totalRec = rec.reduce((acc, item) => acc + Number(item.valor), 0);
            document.getElementById('resumoReceber').innerText = moeda(totalRec);
        }

        // 3. SOMA CONTAS A PAGAR (Apenas débitos negativos com status PENDENTE)
        const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        if (pag) {
            const totalPagar = pag.reduce((acc, item) => item.valor < 0 ? acc + item.valor : acc, 0);
            document.getElementById('resumoPagar').innerText = moeda(Math.abs(totalPagar));
        }

        // 4. Lista do Extrato Financeiro
        const { data: lista, error } = await _supabase
            .from('contas_pagar')
            .select('*, bancos(nome)')
            .order('vencimento', { ascending: false });

        if (error) throw error;

        const corpo = document.getElementById('listaFinanceiro');
        corpo.innerHTML = lista.map(item => {
            const isPago = item.status === 'PAGO';
            return `
                <tr>
                    <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${item.bancos?.nome || 'N/A'}</td>
                    <td>${item.descricao}</td>
                    <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${moeda(item.valor)}</td>
                    <td class="${isPago ? 'status-pago' : 'status-pendente'}">${item.status}</td>
                    <td>
                        <button class="btn-acao" onclick="toggleStatus('${item.id}', '${item.status}')">
                            ${isPago ? '↩ Estornar' : '✔ Pagar'}
                        </button>
                        <button class="btn-acao" onclick="prepararEdicao('${item.id}')">✏️ Editar</button>
                        <button class="btn-acao" onclick="excluir('${item.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) { console.error("Erro ao carregar dados:", e.message); }
}

// Funções para Controle do Modal
window.abrirModal = (tipo, id = null) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('editId').value = id || '';
    if (!id) {
        document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
        document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
        document.getElementById('campoDescricao').value = '';
        document.getElementById('campoValor').value = '';
    }
};

window.fecharModal = () => {
    document.getElementById('modalFinanceiro').style.display = 'none';
};

// Preparar dados para Edição
window.prepararEdicao = async (id) => {
    const { data, error } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    if (data) {
        abrirModal('EDIÇÃO', id);
        document.getElementById('modalTitulo').innerText = 'Editar Lançamento';
        document.getElementById('campoData').value = data.vencimento;
        document.getElementById('campoBanco').value = data.banco_id;
        document.getElementById('campoDescricao').value = data.descricao;
        document.getElementById('campoValor').value = Math.abs(data.valor);
    }
};

// Salvar Lançamento (Novo ou Editado)
window.salvarLancamento = async () => {
    const id = document.getElementById('editId').value;
    const tipo = document.getElementById('modalTitulo').innerText;
    let valor = parseFloat(document.getElementById('campoValor').value);
    
    // Se for um débito, garante o sinal negativo no banco de dados
    if (tipo.includes('DEBITO')) valor = -Math.abs(valor);

    const registro = {
        vencimento: document.getElementById('campoData').value,
        banco_id: document.getElementById('campoBanco').value,
        descricao: document.getElementById('campoDescricao').value,
        valor: valor,
        status: 'PENDENTE'
    };

    const operacao = id 
        ? _supabase.from('contas_pagar').update(registro).eq('id', id)
        : _supabase.from('contas_pagar').insert([registro]);

    const { error } = await operacao;
    if (error) alert("Erro ao salvar: " + error.message);
    else { fecharModal(); carregarTudo(); }
};

window.toggleStatus = async (id, status) => {
    const novoStatus = status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    await _supabase.from('contas_pagar').update({ status: novoStatus }).eq('id', id);
    carregarTudo();
};

window.excluir = async (id) => {
    if (confirm("Deseja realmente excluir este registro?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
