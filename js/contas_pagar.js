const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let globalLock = false;

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

async function atualizarSaldoBanco(bancoId, valorDif) {
    const { data } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    if (data) {
        const novoSaldo = Number((parseFloat(data.saldo) + parseFloat(valorDif)).toFixed(2));
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    }
}

window.baixarPagamento = async (id) => {
    if (globalLock) return;
    globalLock = true;

    // Desativa todos os botões da tela para evitar cliques ansiosos
    document.querySelectorAll('.btn-tabela').forEach(b => b.style.opacity = '0.3');

    try {
        // Passo 1: Verifica o status no banco (Single Source of Truth)
        const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();

        if (item && item.status === 'PENDENTE') {
            // Passo 2: Tenta atualizar o status primeiro
            const { error: updateError } = await _supabase
                .from('contas_pagar')
                .update({ status: 'PAGO' })
                .eq('id', id)
                .eq('status', 'PENDENTE'); // Só atualiza SE ainda for pendente

            // Passo 3: Só mexe no saldo se o Passo 2 afetou exatamente 1 linha
            if (!updateError) {
                await atualizarSaldoBanco(item.banco_id, item.valor);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        globalLock = false;
        carregarTudo();
    }
};

window.estornarPagamento = async (id) => {
    if (globalLock) return;
    globalLock = true;

    try {
        const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
        if (item && item.status === 'PAGO') {
            const { error: updateError } = await _supabase
                .from('contas_pagar')
                .update({ status: 'PENDENTE' })
                .eq('id', id)
                .eq('status', 'PAGO');

            if (!updateError) {
                await atualizarSaldoBanco(item.banco_id, (item.valor * -1));
            }
        }
    } catch (e) { console.error(e); }
    finally { globalLock = false; carregarTudo(); }
};

// FUNÇÃO PARA VOCÊ CORRIGIR O SALDO RAPIDAMENTE
window.ajusteRapidoSicoob = async () => {
    const { data: sicoob } = await _supabase.from('bancos').select('*').eq('nome', 'SICOOB').single();
    if (sicoob) {
        const valorCorrecao = 108.00; // O que o sistema tirou a mais (3x R$ 36,00)
        const novoSaldo = Number((parseFloat(sicoob.saldo) + valorCorrecao).toFixed(2));
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', sicoob.id);
        alert("Saldo do SICOOB corrigido em + R$ 108,00!");
        carregarTudo();
    }
};

async function carregarTudo() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    if (bancos) {
        bancos.forEach(b => {
            let id = b.nome === 'SICOOB' ? 'resumoSicoob' : b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : 'resumoAplicacao';
            if(document.getElementById(id)) document.getElementById(id).innerText = fmt(b.saldo);
        });
        document.getElementById('campoBanco').innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
    }

    const { data: rcb } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
    document.getElementById('resumoReceber').innerText = fmt(rcb?.reduce((acc, c) => acc + Number(c.valor), 0));

    const { data: pnd } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
    document.getElementById('resumoPagar').innerText = fmt(pnd?.reduce((acc, c) => acc + Math.abs(c.valor), 0));

    const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
    document.getElementById('listaFinanceiro').innerHTML = lista?.map(item => `
        <tr>
            <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td>${item.bancos?.nome || '--'}</td>
            <td>${item.descricao}</td>
            <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
            <td style="font-weight:bold; color: ${item.status === 'PENDENTE' ? '#f59e0b' : '#38bdf8'}">${item.status}</td>
            <td style="text-align: center;">
                ${item.status === 'PENDENTE' 
                    ? `<button onclick="baixarPagamento('${item.id}')" class="btn-tabela btn-pagar">Pagar</button>` 
                    : `<button onclick="estornarPagamento('${item.id}')" class="btn-tabela btn-estornar">Estornar</button>`}
                <button onclick="editarRegistro('${item.id}')" class="btn-tabela btn-editar">✎</button>
                <button onclick="excluirRegistro('${item.id}')" class="btn-tabela btn-excluir">🗑</button>
            </td>
        </tr>
    `).join('') || '';
}

window.salvarLancamento = async () => {
    const id = document.getElementById('editId').value;
    const desc = document.getElementById('campoDescricao').value;
    const valorAbs = Math.abs(parseFloat(document.getElementById('campoValor').value || 0));
    const bancoId = document.getElementById('campoBanco').value;
    const dataVenc = document.getElementById('campoData').value;
    const valorFinal = document.getElementById('modalTitulo').innerText.includes('DEBITO') ? -valorAbs : valorAbs;

    if(!id) {
        await _supabase.from('contas_pagar').insert([{ vencimento: dataVenc, banco_id: bancoId, descricao: desc, valor: valorFinal, status: 'PENDENTE' }]);
    } else {
        await _supabase.from('contas_pagar').update({ vencimento: dataVenc, banco_id: bancoId, descricao: desc, valor: valorFinal }).eq('id', id);
    }
    fecharModais(); carregarTudo();
};

window.excluirRegistro = async (id) => {
    if(confirm("Deseja excluir este registro?")) {
        const { data: item } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
        if(item && item.status === 'PAGO') await atualizarSaldoBanco(item.banco_id, (item.valor * -1));
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
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
