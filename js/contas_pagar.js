const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "SUA_ANON_KEY"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Saldos dos Bancos
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            const select = document.getElementById('campoBanco');
            if (select) select.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            
            bancos.forEach(b => {
                let id = b.nome.includes('CAIXA') ? 'resumoCaixa' : b.nome.includes('SICOOB') ? 'resumoSicoob' : 'resumoAplicacao';
                let el = document.getElementById(id);
                if (el) el.innerText = moeda(b.saldo);
            });
        }

        // 2. Previsão Receber
        const { data: rec } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        if (rec) {
            const totalRec = rec.reduce((acc, i) => acc + Number(i.valor), 0);
            document.getElementById('resumoReceber').innerText = moeda(totalRec);
        }

        // 3. SOMA CONTAS A PAGAR (CORRIGIDO)
        const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        if (pag) {
            // Soma apenas valores negativos (débitos) pendentes
            const totalPagar = pag.reduce((acc, i) => i.valor < 0 ? acc + i.valor : acc, 0);
            document.getElementById('resumoPagar').innerText = moeda(Math.abs(totalPagar));
        }

        // 4. Lista do Extrato
        const { data: lista, error } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        if (error) throw error;

        document.getElementById('listaFinanceiro').innerHTML = lista.map(item => `
            <tr style="border-bottom: 1px solid #1e293b;">
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || 'N/A'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${moeda(item.valor)}</td>
                <td class="${item.status === 'PAGO' ? 'status-pago' : 'status-pendente'}">${item.status}</td>
                <td>
                    <button onclick="toggleStatus('${item.id}', '${item.status}')" class="btn-acao">${item.status === 'PAGO' ? '↩' : '✔'}</button>
                    <button onclick="prepararEdicao('${item.id}')" class="btn-acao">✏️</button>
                    <button onclick="excluir('${item.id}')" class="btn-acao">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error("Falha no carregamento:", e.message); }
}

// Funções de Modal e Edição
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

window.salvarLancamento = async () => {
    const id = document.getElementById('editId').value;
    const titulo = document.getElementById('modalTitulo').innerText;
    let valor = parseFloat(document.getElementById('campoValor').value);
    
    if (titulo.includes('DEBITO')) valor = -Math.abs(valor);

    const dados = {
        vencimento: document.getElementById('campoData').value,
        banco_id: document.getElementById('campoBanco').value,
        descricao: document.getElementById('campoDescricao').value,
        valor: valor
    };

    const query = id ? _supabase.from('contas_pagar').update(dados).eq('id', id) : _supabase.from('contas_pagar').insert([dados]);
    const { error } = await query;
    
    if (error) alert("Erro: " + error.message);
    else { fecharModal(); carregarTudo(); }
};

window.fecharModal = () => document.getElementById('modalFinanceiro').style.display = 'none';

window.toggleStatus = async (id, status) => {
    const novo = status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    await _supabase.from('contas_pagar').update({ status: novo }).eq('id', id);
    carregarTudo();
};

window.excluir = async (id) => {
    if (confirm("Excluir registro?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
