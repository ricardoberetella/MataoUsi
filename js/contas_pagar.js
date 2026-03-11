// ... (mantenha suas constantes de URL e KEY do Supabase no topo)

async function carregarTabela() {
    const status = document.getElementById('fStatus').value;
    const ini = document.getElementById('fDataInicio').value;
    const fim = document.getElementById('fDataFim').value;

    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    if (status) query = query.eq('status', status);
    if (ini) query = query.gte('vencimento', ini);
    if (fim) query = query.lte('vencimento', fim);

    const { data } = await query.order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const isPago = item.status === 'PAGO';
        const corStatus = item.status === 'ABERTO' ? '#fbbf24' : '#22c55e';

        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="color:#22c55e;">${item.tipo === 'CREDITO' ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444;">${item.tipo === 'DEBITO' ? moeda(item.valor) : '-'}</td>
                <td style="font-weight:bold; color:${corStatus}">${item.status}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="editarRegistro('${item.id}')" style="background:#0ea5e9; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">Editar</button>
                        ${!isPago ? 
                            `<button onclick="confirmarPagamento('${item.id}')" style="background:#22c55e; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">Pagar</button>` : 
                            `<button onclick="estornarPagamento('${item.id}')" style="background:#f59e0b; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">Estornar</button>`
                        }
                        <button onclick="excluirRegistro('${item.id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">X</button>
                    </div>
                </td>
            </tr>`;
    });
}

// Certifique-se de que a função abrirModal existe para os botões do topo
function abrirModal(tipo) {
    console.log("Abrindo modal para:", tipo);
    // Aqui deve vir a sua lógica de abrir o formulário de lançamento
}

window.carregarTudo = async () => {
    await carregarTabela();
};
carregarTudo();
