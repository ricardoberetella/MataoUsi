// ATENÇÃO: Verifique se estas chaves estão corretas no seu projeto
const _supabase = supabase.createClient("SUA_URL_SUPABASE", "SUA_CHAVE_ANON_KEY");

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// 1. FUNÇÕES DOS BOTÕES (ABRIR MODAL)
window.abrirModal = (tipo) => {
    document.getElementById('modalFinanceiro').style.display = 'block';
    document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
    document.getElementById('grupoDestino').style.display = tipo === 'TRANSFERENCIA' ? 'flex' : 'none';
    
    // Limpar campos
    document.getElementById('campoDescricao').value = '';
    document.getElementById('campoValor').value = '';
};

window.fecharModal = () => {
    document.getElementById('modalFinanceiro').style.display = 'none';
};

// 2. FUNÇÃO PARA SALVAR NO SUPABASE
window.salvarLancamento = async () => {
    const banco = document.getElementById('campoBanco').value;
    const desc = document.getElementById('campoDescricao').value;
    const valor = document.getElementById('campoValor').value;
    const tipo = document.getElementById('modalTitulo').innerText.includes('DEBITO') ? 'DEBITO' : 'CREDITO';

    if(!desc || !valor) return alert("Preencha todos os campos!");

    const { error } = await _supabase.from('contas_pagar').insert([
        { banco, descricao: desc, valor: parseFloat(valor), tipo, status: 'PAGO', vencimento: new Date() }
    ]);

    if(error) alert("Erro ao salvar!");
    else {
        fecharModal();
        carregarTudo();
    }
};

// 3. CÁLCULO DE SALDOS (PREENCHER OS CARDS ZERADOS)
async function atualizarSaldos() {
    // Busca todos os lançamentos
    const { data: lancamentos } = await _supabase.from('contas_pagar').select('*');
    
    let sicoob = 0;
    let caixa = 0;
    let aPagar = 0;
    let aReceber = 0;

    lancamentos?.forEach(item => {
        const v = parseFloat(item.valor);
        // Soma Saldos por Banco
        if(item.status === 'PAGO') {
            if(item.banco === 'SICOOB') item.tipo === 'CREDITO' ? sicoob += v : sicoob -= v;
            if(item.banco === 'CAIXA FEDERAL') item.tipo === 'CREDITO' ? caixa += v : caixa -= v;
        }
        // Soma Previsões
        if(item.status === 'ABERTO') {
            item.tipo === 'DEBITO' ? aPagar += v : aReceber += v;
        }
    });

    // Atualiza a tela
    document.getElementById('resumoSicoob').innerText = moeda(sicoob);
    document.getElementById('resumoCaixa').innerText = moeda(caixa);
    document.getElementById('resumoPagar').innerText = moeda(aPagar);
    document.getElementById('resumoReceber').innerText = moeda(aReceber);
}

// 4. CARREGAR TABELA
async function carregarTabela() {
    const { data } = await _supabase.from('contas_pagar').select('*').order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const cor = item.tipo === 'CREDITO' ? '#22c55e' : '#ef4444';
        corpo.innerHTML += `
            <tr>
                <td>${new Date(item.vencimento).toLocaleDateString()}</td>
                <td>${item.banco}</td>
                <td>${item.descricao}</td>
                <td style="color:${cor}; font-weight:bold;">${moeda(item.valor)}</td>
                <td style="color:${item.status === 'ABERTO' ? '#fbbf24' : '#22c55e'}">${item.status}</td>
                <td><button onclick="excluir('${item.id}')" style="background:red; color:white; border:none; border-radius:4px; cursor:pointer;">X</button></td>
            </tr>`;
    });
}

window.carregarTudo = () => {
    atualizarSaldos();
    carregarTabela();
};

carregarTudo();
