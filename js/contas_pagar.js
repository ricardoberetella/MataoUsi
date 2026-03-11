// Configurações do Supabase
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_AQUI"; // Certifique-se de usar a chave correta
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Formatação de Moeda
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Buscar Saldos dos Bancos
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            const selectBanco = document.getElementById('campoBanco');
            if (selectBanco) {
                selectBanco.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            }
            
            // Atualiza os cards de saldo
            bancos.forEach(b => {
                if (b.nome === 'SICOOB') document.getElementById('resumoSicoob').innerText = moeda(b.saldo);
                if (b.nome === 'CAIXA FEDERAL') document.getElementById('resumoCaixa').innerText = moeda(b.saldo);
                if (b.nome === 'APLICAÇÃO') document.getElementById('resumoAplicacao').innerText = moeda(b.saldo);
            });
        }

        // 2. Previsão Receber e Contas a Pagar (Pendentes)
        const { data: rec } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        document.getElementById('resumoReceber').innerText = moeda(rec?.reduce((a, b) => a + Number(b.valor), 0));

        const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        document.getElementById('resumoPagar').innerText = moeda(pag?.reduce((a, b) => a + Math.abs(Number(b.valor)), 0));

        // 3. Carregar Lista do Extrato
        const { data: lista, error } = await _supabase
            .from('contas_pagar')
            .select('*, bancos(nome)')
            .order('vencimento', { ascending: false });

        if (error) throw error;

        const corpo = document.getElementById('listaFinanceiro');
        corpo.innerHTML = lista.map(item => {
            const isPago = item.status === 'PAGO';
            const corValor = item.valor < 0 ? '#ef4444' : '#22c55e';
            
            return `
                <tr>
                    <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${item.bancos?.nome || 'N/A'}</td>
                    <td>${item.descricao}</td>
                    <td style="color: ${corValor}; font-weight: bold;">${moeda(item.valor)}</td>
                    <td class="${isPago ? 'status-pago' : 'status-pendente'}">${item.status}</td>
                    <td>
                        <button class="btn-acao" onclick="mudarStatus('${item.id}', '${item.status}')">
                            ${isPago ? '↩ Estornar' : '✔ Pagar'}
                        </button>
                        <button class="btn-acao" onclick="prepararEdicao('${item.id}')">✏️</button>
                        <button class="btn-acao" onclick="excluir('${item.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error("Erro ao carregar dados:", e.message);
    }
}

// Abrir Modal para Novo ou Edição
window.abrirModal = (tipo, id = null) => {
    const modal = document.getElementById('modalFinanceiro');
    modal.style.display = 'block';
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

// Salvar Lançamento (Novo ou Editado)
window.salvarLancamento = async () => {
    const id = document.getElementById('editId').value;
    const data = document.getElementById('campoData').value;
    const bancoId = document.getElementById('campoBanco').value;
    const desc = document.getElementById('campoDescricao').value;
    let valor = parseFloat(document.getElementById('campoValor').value);

    // Se for Débito, garante que o valor seja negativo
    if (document.getElementById('modalTitulo').innerText.includes('DEBITO')) {
        valor = -Math.abs(valor);
    } else if (document.getElementById('modalTitulo').innerText.includes('CREDITO')) {
        valor = Math.abs(valor);
    }

    const payload = {
        vencimento: data,
        banco_id: bancoId,
        descricao: desc,
        valor: valor,
        status: 'PENDENTE'
    };

    let result;
    if (id) {
        result = await _supabase.from('contas_pagar').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('contas_pagar').insert([payload]);
    }

    if (result.error) {
        alert("Erro ao salvar: " + result.error.message);
    } else {
        fecharModal();
        carregarTudo();
    }
};

// Mudar Status (Pagar/Estornar)
window.mudarStatus = async (id, statusAtual) => {
    const novoStatus = statusAtual === 'PAGO' ? 'PENDENTE' : 'PAGO';
    
    const { error } = await _supabase
        .from('contas_pagar')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) alert("Erro ao atualizar status");
    else carregarTudo();
};

// Excluir Lançamento
window.excluir = async (id) => {
    if (confirm("Deseja realmente excluir este registro?")) {
        const { error } = await _supabase.from('contas_pagar').delete().eq('id', id);
        if (error) alert("Erro ao excluir");
        else carregarTudo();
    }
};

// Editar - Carrega os dados no modal
window.prepararEdicao = async (id) => {
    const { data } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    if (data) {
        abrirModal('EDIÇÃO', id);
        document.getElementById('modalTitulo').innerText = 'Editar Lançamento';
        document.getElementById('campoData').value = data.vencimento;
        document.getElementById('campoBanco').value = data.banco_id;
        document.getElementById('campoDescricao').value = data.descricao;
        document.getElementById('campoValor').value = Math.abs(data.valor);
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', carregarTudo);
