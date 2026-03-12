const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

async function atualizarSaldoBanco(bancoId, valorDif) {
    const { data } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    if (data) await _supabase.from('bancos').update({ saldo: Number(data.saldo) + Number(valorDif) }).eq('id', bancoId);
}

async function carregarTudo() {
    try {
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            document.getElementById('campoBanco').innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            bancos.forEach(b => {
                let id = b.nome === 'SICOOB' ? 'resumoSicoob' : b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : 'resumoAplicacao';
                if(document.getElementById(id)) document.getElementById(id).innerText = fmt(b.saldo);
            });
        }

        // Soma do A PAGAR (Extrato PENDENTE)
        const { data: pnd } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        document.getElementById('resumoPagar').innerText = fmt(pnd?.reduce((acc, c) => acc + Math.abs(c.valor), 0));

        // Busca do RECEBER (ABERTO da tabela de faturas)
        const { data: rcb } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        document.getElementById('resumoReceber').innerText = fmt(rcb?.reduce((acc, c) => acc + Number(c.valor), 0));

        // Renderiza Tabela com as Ações
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        document.getElementById('listaFinanceiro').innerHTML = lista?.map(item => `
            <tr>
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
                <td style="color: ${item.status === 'PENDENTE' ? '#f59e0b' : '#38bdf8'}; font-weight:bold">${item.status}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${item.status === 'PENDENTE' ? `<button onclick="baixarPagamento('${item.id}')" class="btn-tabela btn-pagar">✓ Pagar</button>` : ''}
                    <button onclick="editarRegistro('${item.id}')" class="btn-tabela btn-editar">✎</button>
                    <button onclick="excluirRegistro('${item.id}')" class="btn-tabela btn-excluir">🗑</button>
                </td>
            </tr>
        `).join('') || '';
    } catch (e) { console.error(e); }
}

window.baixarPagamento = async (id) => {
    const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
    if (item && confirm(`Confirmar pagamento de ${item.descricao}?`)) {
        const { error } = await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
        if (!error) {
            await atualizarSaldoBanco(item.banco_id, item.valor);
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

// Funções de abrir/fechar/salvar mantidas e otimizadas...
window.abrirModal = (t) => { 
    document.getElementById('modalFinanceiro').style.display='block'; 
    document.getElementById('modalTitulo').innerText = t;
    if(t !== 'EDITAR') {
        document.getElementById('editId').value = '';
        document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
    }
};
window.fecharModais = () => document.getElementById('modalFinanceiro').style.display='none';

window.salvarLancamento = async () => {
    const id = document.getElementById('editId').value;
    const desc = document.getElementById('campoDescricao').value;
    const valorRaw = parseFloat(document.getElementById('campoValor').value);
    const bancoId = document.getElementById('campoBanco').value;
    const valor = document.getElementById('modalTitulo').innerText.includes('DEBITO') ? -valorRaw : valorRaw;

    if(id) {
        // Lógica simples de edição (sem reprocessar saldo para não bugar)
        await _supabase.from('contas_pagar').update({ vencimento: document.getElementById('campoData').value, banco_id: bancoId, descricao: desc, valor: valor }).eq('id', id);
    } else {
        const { error } = await _supabase.from('contas_pagar').insert([{ vencimento: document.getElementById('campoData').value, banco_id: bancoId, descricao: desc, valor: valor, status: 'PAGO' }]);
        if(!error) await atualizarSaldoBanco(bancoId, valor);
    }
    fecharModais(); carregarTudo();
};

window.excluirRegistro = async (id) => {
    if(confirm("Excluir lançamento e estornar saldo?")) {
        const { data } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
        if(data) {
            await _supabase.from('contas_pagar').delete().eq('id', id);
            if(data.status === 'PAGO') await atualizarSaldoBanco(data.banco_id, -data.valor);
            carregarTudo();
        }
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
