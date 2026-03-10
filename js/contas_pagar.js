var supabase = window.supabaseClient;

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => d ? d.split('-').reverse().join('/') : '-';

async function carregarBancos() {
    const { data } = await supabase.from('bancos').select('id, nome').order('nome');
    if (data) {
        const options = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        document.getElementById('novoBanco').innerHTML = options;
        document.getElementById('transfOrigem').innerHTML = options;
        document.getElementById('transfDestino').innerHTML = options;
        document.getElementById('nfBanco').innerHTML = options;
    }
}

async function carregarContas() {
    const statusFiltro = document.getElementById('filtroStatus').value;
    const dInicio = document.getElementById('filtroDataInicio').value;
    const dFim = document.getElementById('filtroDataFim').value;

    let query = supabase.from('contas_pagar').select('*, bancos(nome)');
    if (statusFiltro) query = query.eq('status', statusFiltro);
    if (dInicio) query = query.gte('vencimento', dInicio);
    if (dFim) query = query.lte('vencimento', dFim);

    const { data, error } = await query.order('vencimento', { ascending: true });
    if (error) return console.error(error);

    const corpo = document.getElementById('listaPagar');
    corpo.innerHTML = '';

    data.forEach(item => {
        const isNF = item.descricao.startsWith("NF ENTRADA:");
        const isRecebido = item.status === 'RECEBIDO';
        const isPago = item.status === 'PAGO';

        corpo.innerHTML += `
            <tr>
                <td>${dataBR(item.vencimento)}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td class="${isNF ? 'valor-entrada' : ''}">${isNF ? moeda(item.valor) : '-'}</td>
                <td class="${!isNF ? 'valor-saida' : ''}">${!isNF ? moeda(item.valor) : '-'}</td>
                <td class="${(isRecebido || isPago) ? 'status-recebido' : 'status-aberto'}">${item.status}</td>
                <td>
                    ${item.status === 'ABERTO' 
                        ? `<button onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn btn-verde">Pagar</button>`
                        : `<button onclick="estornarConta('${item.id}', ${item.valor}, '${item.banco_id}', '${item.status}')" class="btn btn-cinza">Estornar</button>`
                    }
                    <button onclick="excluirConta('${item.id}', '${item.status}', ${item.valor}, '${item.banco_id}')" class="btn btn-vermelho" style="padding: 5px 10px; margin-left: 5px;">✕</button>
                </td>
            </tr>
        `;
    });
}

// Lógica de NF Entrada com SOMA e Status RECEBIDO
async function salvarNF() {
    const valor = parseFloat(document.getElementById('nfValor').value);
    const bancoId = document.getElementById('nfBanco').value;
    
    const item = {
        descricao: "NF ENTRADA: " + document.getElementById('nfDescricao').value,
        valor: valor,
        vencimento: document.getElementById('nfVencimento').value,
        banco_id: bancoId,
        status: 'RECEBIDO' // Alterado para RECEBIDO
    };
    await supabase.from('contas_pagar').insert([item]);

    // Soma ao saldo do banco
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    await supabase.from('bancos').update({ saldo: (b.saldo || 0) + valor }).eq('id', bancoId);

    alert("NF lançada como Recebimento!");
    fecharModais(); carregarContas();
}

// Estorno inteligente (subtrai se for NF, soma se for conta normal)
async function estornarConta(id, valor, bancoId, statusAtual) {
    if (!confirm("Deseja realmente estornar?")) return;
    
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    let novoSaldo = b.saldo || 0;

    if (statusAtual === 'RECEBIDO') {
        novoSaldo -= valor; // Se era entrada, tira do banco
    } else {
        novoSaldo += valor; // Se era saída, devolve ao banco
    }

    await supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    await supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    carregarContas();
}

// Excluir com Inteligência de Saldo
async function excluirConta(id, status, valor, bancoId) {
    if (!confirm("Excluir permanentemente?")) return;
    
    if (status !== 'ABERTO') {
        const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
        let ajuste = (status === 'RECEBIDO') ? (b.saldo - valor) : (b.saldo + valor);
        await supabase.from('bancos').update({ saldo: ajuste }).eq('id', bancoId);
    }
    
    await supabase.from('contas_pagar').delete().eq('id', id);
    carregarContas();
}

// Outras funções (salvarNovo, baixarConta, processarTransferencia) seguem o padrão anterior.
carregarBancos();
carregarContas();
