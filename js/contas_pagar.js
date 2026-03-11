const _supabase = supabase.createClient("SUA_URL_AQUI", "SUA_CHAVE_AQUI");

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// FUNÇÕES DO MODAL
window.abrirModal = (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
    // Limpar campos
    document.getElementById('campoDescricao').value = '';
    document.getElementById('campoValor').value = '';
};

window.fecharModal = () => {
    document.getElementById('modalFinanceiro').style.display = 'none';
};

// CÁLCULO E ATUALIZAÇÃO DOS SALDOS (CARDS DO TOPO)
async function atualizarCards() {
    const { data: lancamentos } = await _supabase.from('contas_pagar').select('*');
    
    let sicoob = 0;
    let caixa = 0;
    let pagar = 0;
    let receber = 0;

    lancamentos?.forEach(item => {
        const val = parseFloat(item.valor || 0);
        
        if (item.status === 'PAGO') {
            if (item.banco === 'SICOOB') item.tipo === 'CREDITO' ? sicoob += val : sicoob -= val;
            if (item.banco === 'CAIXA FEDERAL') item.tipo === 'CREDITO' ? caixa += val : caixa -= val;
        } else if (item.status === 'ABERTO') {
            item.tipo === 'DEBITO' ? pagar += val : receber += val;
        }
    });

    document.getElementById('resumoSicoob').innerText = moeda(sicoob);
    document.getElementById('resumoCaixa').innerText = moeda(caixa);
    document.getElementById('resumoPagar').innerText = moeda(pagar);
    document.getElementById('resumoReceber').innerText = moeda(receber);
}

// CARREGAR TABELA
async function carregarTabela() {
    const { data } = await _supabase.from('contas_pagar').select('*').order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const cor = item.tipo === 'CREDITO' ? '#22c55e' : '#ef4444';
        corpo.innerHTML += `
            <tr>
                <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
                <td>${item.banco}</td>
                <td>${item.descricao}</td>
                <td style="color:${cor}; font-weight:bold;">${moeda(item.valor)}</td>
                <td style="font-weight:bold; color:${item.status === 'ABERTO' ? '#fbbf24' : '#22c55e'}">${item.status}</td>
                <td>
                    <button onclick="excluirRegistro('${item.id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">X</button>
                </td>
            </tr>`;
    });
}

window.carregarTudo = () => {
    atualizarCards();
    carregarTabela();
};

carregarTudo();
