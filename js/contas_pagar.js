var supabase = window.supabaseClient;

// Formatação
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => d ? d.split('-').reverse().join('/') : '-';

async function carregarBancos() {
    const { data } = await supabase.from('bancos').select('id, nome').order('nome');
    if (data) {
        const select = document.getElementById('novoBanco');
        select.innerHTML = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
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
        const isPago = item.status === 'PAGO';
        corpo.innerHTML += `
            <tr>
                <td>${dataBR(item.vencimento)}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td>-</td>
                <td class="valor-saida">${moeda(item.valor)}</td>
                <td class="${isPago ? 'status-pago' : 'status-aberto'}">${item.status}</td>
                <td>
                    ${!isPago 
                        ? `<button onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn btn-verde">Pagar</button>`
                        : `<button onclick="estornarConta('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn btn-cinza">Estornar</button>`
                    }
                </td>
            </tr>
        `;
    });
}

async function baixarConta(id, valor, bancoId) {
    // 1. Atualiza status da conta
    await supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    
    // 2. Deduz do saldo do banco
    const { data: banco } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    const novoSaldo = (banco.saldo || 0) - valor;
    await supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    
    carregarContas();
}

async function estornarConta(id, valor, bancoId) {
    if (!confirm("Deseja estornar este pagamento? O saldo voltará ao banco.")) return;

    // 1. Volta para ABERTO
    await supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    
    // 2. Devolve o valor ao saldo do banco
    const { data: banco } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    const novoSaldo = (banco.saldo || 0) + valor;
    await supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    
    carregarContas();
}

// Funções de Modal
function abrirModalNovo() { document.getElementById('modalNovo').style.display = 'flex'; }
function fecharModais() { document.getElementById('modalNovo').style.display = 'none'; }

async function salvarNovo() {
    const dados = {
        descricao: document.getElementById('novoDescricao').value,
        valor: parseFloat(document.getElementById('novoValor').value),
        vencimento: document.getElementById('novoVencimento').value,
        banco_id: document.getElementById('novoBanco').value,
        status: 'ABERTO'
    };
    await supabase.from('contas_pagar').insert([dados]);
    fecharModais();
    carregarContas();
}

// Inicialização
carregarBancos();
carregarContas();
