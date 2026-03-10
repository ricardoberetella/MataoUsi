// ... (configurações iniciais do Supabase permanecem as mesmas)

async function atualizarDashboard() {
    // 1. Busca saldos de todos os bancos e aplicação
    const { data: bancos } = await _supabase.from('bancos').select('nome, saldo');
    let sicoob = 0, caixa = 0, aplicacao = 0;
    
    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if(nome.includes('SICOOB')) sicoob = b.saldo || 0;
        if(nome.includes('CAIXA')) caixa = b.saldo || 0;
        if(nome.includes('APLICAÇÃO') || nome.includes('APLICACAO')) aplicacao = b.saldo || 0;
    });

    // 2. Busca total de Contas a Pagar em ABERTO (Saídas)
    const { data: pagar } = await _supabase.from('contas_pagar')
        .select('valor')
        .eq('status', 'ABERTO')
        .not('descricao', 'ilike', '%NF ENTRADA%');
    const totalPagar = pagar?.reduce((acc, i) => acc + i.valor, 0) || 0;

    // 3. Busca total de Contas a Receber em ABERTO
    // Note: Ajuste o nome da coluna de status se for diferente de 'ABERTO' no seu banco
    const { data: receber } = await _supabase.from('contas_receber')
        .select('valor')
        .neq('status', 'PAGO'); 
    const totalReceber = receber?.reduce((acc, i) => acc + (Number(i.valor) || 0), 0) || 0;

    // 4. Cálculo Final
    const projetado = (sicoob + caixa + aplicacao + totalReceber) - totalPagar;

    // Atualiza a Tela
    document.getElementById('resumoSicoob').innerText = moeda(sicoob);
    document.getElementById('resumoCaixa').innerText = moeda(caixa);
    document.getElementById('resumoAplicacao').innerText = moeda(aplicacao);
    document.getElementById('resumoPagar').innerText = moeda(totalPagar);
    document.getElementById('resumoReceber').innerText = moeda(totalReceber);
    document.getElementById('resumoTotal').innerText = moeda(projetado);
}

// ... (mantenha as funções de carregarContas, baixar, estornar e excluir da versão anterior)
// Lembre-se que baixar, estornar e excluir devem chamar carregarTudo() ao final.

async function carregarTudo() {
    await carregarContas();
    await atualizarDashboard();
}

carregarTudo();
carregarBancos();
