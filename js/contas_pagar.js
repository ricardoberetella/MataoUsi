// Configurações do Supabase - Verifique se estas chaves são as atuais do seu projeto
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Formatação de moeda
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Carregar Bancos
        const { data: bancos, error: errBancos } = await _supabase.from('bancos').select('*');
        if (errBancos) throw errBancos;

        if (bancos) {
            const select = document.getElementById('campoBanco');
            if (select) {
                select.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            }
            
            // Atualiza saldos nos cards usando os IDs corretos do seu HTML
            bancos.forEach(b => {
                let idElemento = "";
                if (b.nome.includes('SICOOB')) idElemento = 'resumoSicoob';
                else if (b.nome.includes('CAIXA')) idElemento = 'resumoCaixa';
                else if (b.nome.includes('APLICAÇÃO')) idElemento = 'resumoAplicacao';
                
                const el = document.getElementById(idElemento);
                if (el) el.innerText = fmt(b.saldo);
            });
        }

        // 2. Previsão Receber
        const { data: rec } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        const totalReceber = rec?.reduce((acc, i) => acc + Number(i.valor), 0) || 0;
        const elReceber = document.getElementById('resumoReceber');
        if (elReceber) elReceber.innerText = fmt(totalReceber);

        // 3. Contas a Pagar (Pendentes)
        const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        const totalPagar = pag?.reduce((acc, i) => i.valor < 0 ? acc + i.valor : acc, 0) || 0;
        const elPagar = document.getElementById('resumoPagar');
        if (elPagar) elPagar.innerText = fmt(Math.abs(totalPagar));

        // 4. Lista de Lançamentos
        const { data: lista, error: errLista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        if (errLista) throw errLista;

        const tbody = document.getElementById('listaFinanceiro');
        if (tbody && lista) {
            tbody.innerHTML = lista.map(item => `
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
            `).join('');
        }
    } catch (e) {
        console.error("Erro geral no carregamento:", e.message);
    }
}

// Funções de interface
window.abrirModal = (tipo) => {
    const modal = document.getElementById('modalFinanceiro');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
        document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
        document.getElementById('campoDescricao').value = '';
        document.getElementById('campoValor').value = '';
        document.getElementById('editId').value = '';
    }
};

window.fecharModal = () => {
    const modal = document.getElementById('modalFinanceiro');
    if (modal) modal.style.display = 'none';
};

window.salvarLancamento = async () => {
    const titulo = document.getElementById('modalTitulo').innerText;
    let valor = parseFloat(document.getElementById('campoValor').value);
    
    if (titulo.includes('DEBITO')) valor = -Math.abs(valor);
    else valor = Math.abs(valor);

    const dados = {
        vencimento: document.getElementById('campoData').value,
        banco_id: document.getElementById('campoBanco').value,
        descricao: document.getElementById('campoDescricao').value,
        valor: valor,
        status: 'PENDENTE'
    };

    const { error } = await _supabase.from('contas_pagar').insert([dados]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        fecharModal();
        carregarTudo();
    }
};

window.mudarStatus = async (id, statusAtual) => {
    const novoStatus = statusAtual === 'PAGO' ? 'PENDENTE' : 'PAGO';
    await _supabase.from('contas_pagar').update({ status: novoStatus }).eq('id', id);
    carregarTudo();
};

window.excluirRegistro = async (id) => {
    if (confirm("Deseja excluir este registro?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
