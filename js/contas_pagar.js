async function agendarSaida() {
    // Busca os bancos cadastrados para mostrar no prompt
    const { data: bancos } = await supabase.from("bancos").select("*");
    
    const desc = prompt("NF / Origem:");
    const valor = prompt("Valor:");
    const data = prompt("Vencimento (AAAA-MM-DD):");
    const listaBancos = bancos.map((b, i) => `${i + 1} - ${b.nome}`).join('\n');
    const escolha = prompt("Selecione o Banco:\n" + listaBancos);
    
    const bancoSelecionado = bancos[parseInt(escolha) - 1];

    if (desc && valor && data && bancoSelecionado) {
        await supabase.from("contas_pagar").insert([{
            descricao: desc,
            valor: parseFloat(valor),
            vencimento: data,
            banco_id: bancoSelecionado.id, // Vincula ao ID do banco escolhido
            status: "ABERTO"
        }]);
        carregarDados();
    }
}
