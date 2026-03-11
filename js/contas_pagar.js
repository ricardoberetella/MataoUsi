const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Use sua chave completa
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarTudo() {
    try {
        // 1. Atualiza Bancos
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            document.getElementById('campoBanco').innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            bancos.forEach(b => {
                if (b.nome === 'SICOOB') document.getElementById('resumoSicoob').innerText = moeda(b.saldo);
                if (b.nome === 'CAIXA FEDERAL') document.getElementById('resumoCaixa').innerText = moeda(b.saldo);
                if (b.nome === 'APLICAÇÃO') document.getElementById('resumoAplicacao').innerText = moeda(b.saldo);
            });
        }

        // 2. Resumos (Previsão)
        const { data: rec } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        document.getElementById('resumoReceber').innerText = moeda(rec?.reduce((a, b) => a + Number(b.valor), 0));

        const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        document.getElementById('resumoPagar').innerText = moeda(pag?.reduce((a, b) => a + Math.abs(Number(b.valor)), 0));

        // 3. Tabela de Extrato
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', {ascending: false});
        const corpo = document.getElementById('listaFinanceiro');
        corpo.innerHTML = lista.map(item => {
            const isPago = item.status === 'PAGO';
            return `
                <tr>
                    <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${item.bancos?.nome || 'N/A'}</td>
                    <td>${item.descricao}</td>
                    <td style="color:${item.valor < 0 ? '#ef4444' : '#22c55e'}">${moeda(item.valor)}</td>
                    <td class="${isPago ? 'status-pago' : 'status-pendente'}">${item.status}</td>
                    <td>
                        <button class="btn-acao" onclick="alterarStatus('${item.id}', '${item.status}')">
                            ${isPago ? '↩ Estornar' : '✔ Pagar'}
                        </button>
                        <button class="btn-acao" onclick="excluir('${item.id}')">🗑</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

window.abrirModal = (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
    document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
};

window.fecharModal = () => document.getElementById('modalFinanceiro').style.display = 'none';

window.salvarLancamento = async () => {
    const data = document.getElementById('campoData').value;
    const bancoId = document.getElementById('campoBanco').value;
    const desc = document.getElementById('campoDescricao').value;
    let valor = Math.abs(parseFloat(document.getElementById('campoValor').value));
    if (document.getElementById('modalTitulo').innerText.includes('DEBITO')) valor = -valor;

    const { error } = await _supabase.from('contas_pagar').insert([{
        vencimento: data, banco_id: bancoId, descricao: desc, valor: valor, status: 'PENDENTE'
    }]);

    if (!error) { fecharModal(); carregarTudo(); }
};

window.alterarStatus = async (id, statusAtual) => {
    const novoStatus = statusAtual === 'PAGO' ? 'PENDENTE' : 'PAGO';
    await _supabase.from('contas_pagar').update({ status: novoStatus }).eq('id', id);
    carregarTudo();
};

window.excluir = async (id) => {
    if (confirm("Excluir este lançamento?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
