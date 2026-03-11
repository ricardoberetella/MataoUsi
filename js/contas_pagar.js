// ... (mantenha suas constantes SUPABASE_URL e SUPABASE_KEY)

// Função auxiliar para atualizar o saldo do banco no banco de dados
async function atualizarSaldoBanco(bancoId, valorDiferenca) {
    // 1. Busca o saldo atual
    const { data: banco } = await _supabase
        .from('bancos')
        .select('saldo')
        .eq('id', bancoId)
        .single();

    if (banco) {
        const novoSaldo = Number(banco.saldo) + Number(valorDiferenca);
        
        // 2. Salva o novo saldo
        await _supabase
            .from('bancos')
            .update({ saldo: novoSaldo })
            .eq('id', bancoId);
    }
}

window.salvarLancamento = async () => {
    const titulo = document.getElementById('modalTitulo').innerText;
    let valor = Math.abs(parseFloat(document.getElementById('campoValor').value));
    const bancoId = document.getElementById('campoBanco').value;
    
    // Se for débito, o valor entra como negativo no extrato
    if (titulo.includes('DEBITO')) valor = -valor;

    const { data, error } = await _supabase.from('contas_pagar').insert([{
        vencimento: document.getElementById('campoData').value,
        banco_id: bancoId,
        descricao: document.getElementById('campoDescricao').value,
        valor: valor,
        status: 'PAGO' // Lógica de banco: lançou, já afetou o saldo
    }]).select();

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        // Lógica Bancária: Atualiza o saldo do banco imediatamente
        await atualizarSaldoBanco(bancoId, valor);
        fecharModais();
        carregarTudo();
    }
};

window.excluirRegistro = async (id) => {
    if (confirm("Deseja realmente estornar/excluir este lançamento? O valor será devolvido ao saldo do banco.")) {
        
        // 1. Busca o valor e o banco antes de excluir para saber quanto estornar
        const { data: lancamento } = await _supabase
            .from('contas_pagar')
            .select('valor, banco_id')
            .eq('id', id)
            .single();

        if (lancamento) {
            // 2. Exclui o registro
            const { error } = await _supabase.from('contas_pagar').delete().eq('id', id);

            if (!error) {
                // 3. Estorno: Inverte o valor (se era -10, soma 10; se era +10, subtrai 10)
                const valorEstorno = lancamento.valor * -1;
                await atualizarSaldoBanco(lancamento.banco_id, valorEstorno);
                carregarTudo();
            }
        }
    }
};

window.executarTransferencia = async () => {
    const data = document.getElementById('transfData').value;
    const origemId = document.getElementById('transfOrigem').value;
    const destinoId = document.getElementById('transfDestino').value;
    const valor = Math.abs(parseFloat(document.getElementById('transfValor').value));

    if (origemId === destinoId) return alert("Bancos iguais!");

    // Registra a saída e a entrada no extrato
    const lancamentos = [
        { vencimento: data, banco_id: origemId, descricao: 'Transferência (Saída)', valor: -valor, status: 'PAGO' },
        { vencimento: data, banco_id: destinoId, descricao: 'Transferência (Entrada)', valor: valor, status: 'PAGO' }
    ];

    const { error } = await _supabase.from('contas_pagar').insert(lancamentos);

    if (error) alert(error.message);
    else {
        // Lógica Bancária: Tira de um e coloca no outro
        await atualizarSaldoBanco(origemId, -valor);
        await atualizarSaldoBanco(destinoId, valor);
        fecharModais();
        carregarTudo();
    }
};
