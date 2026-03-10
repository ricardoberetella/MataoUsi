// Captura a instância global definida no HTML
var supabase = window.supabaseClient;

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => d ? d.split('-').reverse().join('/') : '-';

// Carrega os bancos nos selects do modal e filtros
async function carregarBancos() {
    const { data } = await supabase.from('bancos').select('id, nome').order('nome');
    if (data) {
        const select = document.getElementById('novoBanco');
        select.innerHTML = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
    }
}

// Lista as contas com base nos filtros
async function carregarContas() {
    const statusFiltro = document.getElementById('filtroStatus').value;
    const dInicio = document.getElementById('filtroDataInicio').value;
    const dFim = document.getElementById('filtroDataFim').value;

    let query = supabase.from('contas_pagar').select('*, bancos(nome)');

    if (statusFiltro) query = query.eq('status', statusFiltro);
    if (dInicio) query = query.gte('vencimento', dInicio);
    if (dFim) query = query.lte('vencimento', dFim);

    const { data, error } = await query.order('vencimento', { ascending: true });
    
    if (error) {
        console.error("Erro ao carregar contas:", error);
        return;
    }

    const corpo = document.getElementById('listaPagar');
    corpo.innerHTML = '';

    data.forEach(item => {
        const isPago = item.status === 'PAGO';
        const tr = document.createElement('tr');
        tr.innerHTML = `
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
        `;
        corpo.appendChild(tr);
    });
}

// Lógica de Pagamento: Deduz do Saldo
async function baixarConta(id, valor, bancoId) {
    if (!confirm("Confirmar pagamento deste título?")) return;

    // 1. Atualiza status para PAGO
    await supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    
    // 2. Busca e atualiza saldo do banco
    const { data: banco } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    const novoSaldo = (banco.saldo || 0) - valor;
    
    await supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    
    alert("Pagamento processado e saldo atualizado!");
    carregarContas();
}

// Lógica de Estorno: Devolve o valor ao saldo do banco
async function estornarConta(id, valor, bancoId) {
    if (!confirm("Deseja estornar este pagamento? O valor será devolvido ao saldo do banco.")) return;

    // 1. Retorna status para ABERTO
    await supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    
    // 2. Busca e devolve o saldo
    const { data: banco } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    const novoSaldo = (banco.saldo || 0) + valor;
    
    await supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    
    alert("Pagamento estornado com sucesso!");
    carregarContas();
}

// Funções de Modal
function abrirModalNovo() { document.getElementById('modalNovo').style.display = 'flex'; }
function fecharModais() { document.getElementById('modalNovo').style.display = 'none'; }

async function salvarNovo() {
    const desc = document.getElementById('novoDescricao').value;
    const val = document.getElementById('novoValor').value;
    const venc = document.getElementById('novoVencimento').value;
    const bnc = document.getElementById('novoBanco').value;

    if (!desc || !val || !venc) {
        alert("Preencha todos os campos!");
        return;
    }

    const item = {
        descricao: desc,
        valor: parseFloat(val),
        vencimento: venc,
        banco_id: bnc,
        status: 'ABERTO'
    };

    const { error } = await supabase.from('contas_pagar').insert([item]);
    
    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        fecharModais();
        carregarContas();
    }
}

// Inicializa a página
carregarBancos();
carregarContas();
