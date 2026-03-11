const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Bancos e Saldos
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            const select = document.getElementById('campoBanco');
            select.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            
            bancos.forEach(b => {
                let id = b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : b.nome === 'SICOOB' ? 'resumoSicoob' : 'resumoAplicacao';
                let el = document.getElementById(id);
                if (el) el.innerText = fmt(b.saldo);
            });
        }

        // 2. Somas dos Cards
        const { data: rec } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        document.getElementById('resumoReceber').innerText = fmt(rec?.reduce((acc, i) => acc + Number(i.valor), 0));

        const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        const totalPagar = pag?.reduce((acc, i) => i.valor < 0 ? acc + i.valor : acc, 0) || 0;
        document.getElementById('resumoPagar').innerText = fmt(Math.abs(totalPagar));

        // 3. Tabela de Extrato
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        document.getElementById('listaFinanceiro').innerHTML = lista.map(item => `
            <tr>
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
                <td style="font-weight:bold; color: ${item.status === 'PAGO' ? '#22c55e' : '#f59e0b'}">${item.status}</td>
                <td style="text-align: center;">
                    <button onclick="mudarStatus('${item.id}', '${item.status}')" style="background:#334155; color:white; border:1px solid #475569; padding:5px 10px; border-radius:4px; cursor:pointer;">${item.status === 'PAGO' ? '↩' : '✔ Pagar'}</button>
                    <button onclick="editarRegistro('${item.id}')" style="background:none; border:none; cursor:pointer; margin-left:10px;">✏️</button>
                    <button onclick="excluirRegistro('${item.id}')" style="background:none; border:none; cursor:pointer; margin-left:10px;">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

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

window.fecharModal = () => document.getElementById('modalFinanceiro').style.display = 'none';

window.salvarLancamento = async () => {
    const id = document.getElementById('editId').value;
    const titulo = document.getElementById('modalTitulo').innerText;
    let valor = parseFloat(document.getElementById('campoValor').value);
    
    if (titulo.includes('DEBITO')) valor = -Math.abs(valor);
    if (titulo.includes('CREDITO')) valor = Math.abs(valor);

    const dados = {
        vencimento: document.getElementById('campoData').value,
        banco_id: document.getElementById('campoBanco').value,
        descricao: document.getElementById('campoDescricao').value,
        valor: valor,
        status: 'PENDENTE'
    };

    const res = id ? await _supabase.from('contas_pagar').update(dados).eq('id', id) : await _supabase.from('contas_pagar').insert([dados]);
    if (res.error) alert("Erro: " + res.error.message);
    else { fecharModal(); carregarTudo(); }
};

window.mudarStatus = async (id, status) => {
    const novo = status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    await _supabase.from('contas_pagar').update({ status: novo }).eq('id', id);
    carregarTudo();
};

window.editarRegistro = async (id) => {
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

window.excluirRegistro = async (id) => {
    if (confirm("Deseja excluir?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
