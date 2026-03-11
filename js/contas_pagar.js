const _supabase = supabase.createClient("URL_DO_SEU_SUPABASE", "SUA_CHAVE_AQUI");

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// FUNÇÕES DE MODAL
window.abrirModal = async (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('tipoLancamento').value = tipo;
    document.getElementById('modalTitulo').innerText = tipo === 'DEBITO' ? 'Novo Débito' : tipo === 'CREDITO' ? 'Novo Crédito' : 'Nova Transferência';
    
    // Buscar bancos e filtrar (Caixa e Sicoob)
    const { data: bancos } = await _supabase.from('bancos').select('*');
    const combo = document.getElementById('campoBanco');
    combo.innerHTML = '';
    
    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if (nome.includes('SICOOB') || nome.includes('CAIXA')) {
            combo.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
        }
    });
};

window.fecharModal = () => {
    document.getElementById('modalFinanceiro').style.display = 'none';
};

// ATUALIZAR SALDOS NO TOPO
async function atualizarSaldos() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if (nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = moeda(b.saldo);
        if (nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = moeda(b.saldo);
    });

    // Buscar Previsões
    const { data: pag } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
    document.getElementById('resumoPagar').innerText = moeda(pag?.reduce((acc, i) => acc + Number(i.valor), 0));
}

// CARREGAR TABELA
async function carregarTabela() {
    const { data, error } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const corValor = item.tipo === 'CREDITO' ? '#22c55e' : '#ef4444';
        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="color:${corValor}; font-weight:bold;">${moeda(item.valor)}</td>
                <td style="font-weight:bold; color:${item.status === 'ABERTO' ? '#fbbf24' : '#22c55e'}">${item.status}</td>
                <td>
                    <button onclick="baixarTitulo('${item.id}')" style="background:#22c55e; border:none; color:white; padding:5px; border-radius:4px; cursor:pointer; font-size:10px;">PAGAR</button>
                    <button onclick="excluirRegistro('${item.id}')" style="background:#ef4444; border:none; color:white; padding:5px; border-radius:4px; cursor:pointer; font-size:10px;">X</button>
                </td>
            </tr>`;
    });
}

window.carregarTudo = () => {
    atualizarSaldos();
    carregarTabela();
};

carregarTudo();
