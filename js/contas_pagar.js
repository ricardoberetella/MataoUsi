const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // Carregar Bancos e preencher Select
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            document.getElementById('campoBanco').innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            
            bancos.forEach(b => {
                if (b.nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = fmt(b.saldo);
                if (b.nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = fmt(b.saldo);
                if (b.nome.includes('APLICAÇÃO')) document.getElementById('resumoAplicacao').innerText = fmt(b.saldo);
            });
        }

        // Totais de Receber e Pagar
        const { data: rec } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        document.getElementById('resumoReceber').innerText = fmt(rec?.reduce((acc, i) => acc + Number(i.valor), 0));

        const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        const totalPagar = pag?.reduce((acc, i) => i.valor < 0 ? acc + i.valor : acc, 0) || 0;
        document.getElementById('resumoPagar').innerText = fmt(Math.abs(totalPagar));

        // Tabela de Lançamentos
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        document.getElementById('listaFinanceiro').innerHTML = lista?.map(item => `
            <tr>
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
                <td style="font-weight:bold; color: ${item.status === 'PAGO' ? '#22c55e' : '#f59e0b'}">${item.status}</td>
                <td style="text-align: center;">
                    <button onclick="mudarStatus('${item.id}', '${item.status}')" style="background:#334155; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                        ${item.status === 'PAGO' ? 'Reabrir' : 'Pagar'}
                    </button>
                    <button onclick="excluirRegistro('${item.id}')" style="background:none; border:none; cursor:pointer; margin-left:8px;">🗑️</button>
                </td>
            </tr>
        `).join('') || '';
    } catch (e) { console.error(e); }
}

window.abrirModal = (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
    document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
    document.getElementById('campoDescricao').value = '';
    document.getElementById('campoValor').value = '';
    document.getElementById('editId').value = '';
};

window.fecharModal = () => document.getElementById('modalFinanceiro').style.display = 'none';

window.salvarLancamento = async () => {
    const titulo = document.getElementById('modalTitulo').innerText;
    let valor = parseFloat(document.getElementById('campoValor').value);
    
    // Define sinal automaticamente sem usar coluna 'tipo'
    valor = titulo.includes('DEBITO') ? -Math.abs(valor) : Math.abs(valor);

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

window.mudarStatus = async (id, statusAtual) => {
    const novoStatus = statusAtual === 'PAGO' ? 'PENDENTE' : 'PAGO';
    await _supabase.from('contas_pagar').update({ status: novoStatus }).eq('id', id);
    carregarTudo();
};

window.excluirRegistro = async (id) => {
    if (confirm("Excluir este lançamento?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
