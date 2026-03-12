const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// FUNÇÃO CRITICAL: Atualiza o saldo apenas uma vez por chamada
async function atualizarSaldoBanco(bancoId, valorDif) {
    const { data, error } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    if (data) {
        const novoSaldo = parseFloat(data.saldo) + parseFloat(valorDif);
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    }
}

async function carregarTudo() {
    try {
        // 1. Atualiza Cards de Bancos
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            document.getElementById('campoBanco').innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            bancos.forEach(b => {
                let id = b.nome === 'SICOOB' ? 'resumoSicoob' : b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : 'resumoAplicacao';
                if(document.getElementById(id)) document.getElementById(id).innerText = fmt(b.saldo);
            });
        }

        // 2. Atualiza Resumos (Receber e Pagar)
        const { data: rcb } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        document.getElementById('resumoReceber').innerText = fmt(rcb?.reduce((acc, c) => acc + Number(c.valor), 0));

        const { data: pnd } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        document.getElementById('resumoPagar').innerText = fmt(pnd?.reduce((acc, c) => acc + Math.abs(c.valor), 0));

        // 3. Renderiza Tabela com as Ações Solicitadas
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        document.getElementById('listaFinanceiro').innerHTML = lista?.map(item => `
            <tr>
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
                <td style="color: ${item.status === 'PENDENTE' ? '#f59e0b' : '#38bdf8'}; font-weight:bold">${item.status}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${item.status === 'PENDENTE' 
                        ? `<button onclick="baixarPagamento('${item.id}')" class="btn-tabela btn-pagar">Pagar</button>` 
                        : `<button onclick="estornarPagamento('${item.id}')" class="btn-tabela btn-estornar">Estornar</button>`}
                    <button onclick="editarRegistro('${item.id}')" class="btn-tabela btn-editar">✎</button>
                    <button onclick="excluirRegistro('${item.id}')" class="btn-tabela btn-excluir">🗑</button>
                </td>
            </tr>
        `).join('') || '';
    } catch (e) { console.error(e); }
}

// AÇÃO: PAGAR (Move para PAGO e debita saldo)
window.baixarPagamento = async (id) => {
    // Busca o item primeiro para garantir que ainda está pendente (evita clique duplo)
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    if (item && item.status === 'PENDENTE') {
        const { error } = await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
        if (!error) {
            await atualizarSaldoBanco(item.banco_id, item.valor);
            carregarTudo();
        }
    }
};

// AÇÃO: ESTORNAR (Move para PENDENTE e devolve saldo)
window.estornarPagamento = async (id) => {
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    if (item && item.status === 'PAGO') {
        const { error } = await _supabase.from('contas_pagar').update({ status: 'PENDENTE' }).eq('id', id);
        if (!error) {
            // Estorno: subtrai o valor original (se era -36, vira +36)
            await atualizarSaldoBanco(item.banco_id, (item.valor * -1));
            carregarTudo();
        }
    }
};

window.salvarLancamento = async () => {
    const id = document.getElementById('editId').value;
    const desc = document.getElementById('campoDescricao').value;
    const valorAbs = Math.abs(parseFloat(document.getElementById('campoValor').value));
    const bancoId = document.getElementById('campoBanco').value;
    const dataVenc = document.getElementById('campoData').value;
    
    // Se o modal for "DEBITO", o valor gravado é negativo
    const valorFinal = document.getElementById('modalTitulo').innerText.includes('DEBITO') ? -valorAbs : valorAbs;

    if(!id) {
        // SEMPRE entra como PENDENTE para não mexer no saldo agora
        await _supabase.from('contas_pagar').insert([{ 
            vencimento: dataVenc, banco_id: bancoId, descricao: desc, valor: valorFinal, status: 'PENDENTE' 
        }]);
    } else {
        await _supabase.from('contas_pagar').update({ 
            vencimento: dataVenc, banco_id: bancoId, descricao: desc, valor: valorFinal 
        }).eq('id', id);
    }
    fecharModais(); carregarTudo();
};

window.excluirRegistro = async (id) => {
    if(confirm("Deseja excluir este registro?")) {
        const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
        if(item) {
            // Se excluir um item PAGO, precisa devolver o dinheiro pro banco primeiro
            if(item.status === 'PAGO') await atualizarSaldoBanco(item.banco_id, (item.valor * -1));
            await _supabase.from('contas_pagar').delete().eq('id', id);
            carregarTudo();
        }
    }
};

window.editarRegistro = async (id) => {
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    if (item) {
        abrirModal('EDITAR');
        document.getElementById('editId').value = item.id;
        document.getElementById('campoData').value = item.vencimento;
        document.getElementById('campoBanco').value = item.banco_id;
        document.getElementById('campoDescricao').value = item.descricao;
        document.getElementById('campoValor').value = Math.abs(item.valor);
    }
};

window.abrirModal = (t) => { 
    document.getElementById('modalFinanceiro').style.display='block'; 
    document.getElementById('modalTitulo').innerText = t;
    if(t !== 'EDITAR') {
        document.getElementById('editId').value = '';
        document.getElementById('campoValor').value = '';
        document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
    }
};
window.fecharModais = () => document.getElementById('modalFinanceiro').style.display='none';

document.addEventListener('DOMContentLoaded', carregarTudo);
