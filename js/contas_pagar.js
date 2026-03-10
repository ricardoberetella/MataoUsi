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
                    <button onclick="excluirConta('${item.id}', ${isPago}, ${item.valor}, '${item.banco_id}')" class="btn btn-vermelho" style="padding: 5px 10px; margin-left: 5px;">✕</button>
                </td>
            </tr>
        `;
    });
}

// Controle de Modais
function abrirModalNovo() { document.getElementById('modalNovo').style.display = 'flex'; }
function abrirModalTransferencia() { document.getElementById('modalTransferencia').style.display = 'flex'; }
function abrirModalNF() { document.getElementById('modalNF').style.display = 'flex'; }
function fecharModais() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

// Pagamento e Estorno
async function baixarConta(id, valor, bancoId) {
    if (!confirm("Confirmar pagamento?")) return;
    await supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    await supabase.from('bancos').update({ saldo: (b.saldo || 0) - valor }).eq('id', bancoId);
    carregarContas();
}

async function estornarConta(id, valor, bancoId) {
    if (!confirm("Estornar e devolver saldo?")) return;
    await supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    await supabase.from('bancos').update({ saldo: (b.saldo || 0) + valor }).eq('id', bancoId);
    carregarContas();
}

// Lógica de Exclusão
async function excluirConta(id, estavaPago, valor, bancoId) {
    if (!confirm("Excluir lançamento permanentemente?")) return;
    if (estavaPago) {
        const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
        await supabase.from('bancos').update({ saldo: (b.saldo || 0) + valor }).eq('id', bancoId);
    }
    await supabase.from('contas_pagar').delete().eq('id', id);
    carregarContas();
}

// Transferência Bancária
async function processarTransferencia() {
    const orig = document.getElementById('transfOrigem').value;
    const dest = document.getElementById('transfDestino').value;
    const val = parseFloat(document.getElementById('transfValor').value);

    if (orig === dest) return alert("Bancos devem ser diferentes!");
    
    const { data: bOrig } = await supabase.from('bancos').select('saldo').eq('id', orig).single();
    const { data: bDest } = await supabase.from('bancos').select('saldo').eq('id', dest).single();

    await supabase.from('bancos').update({ saldo: bOrig.saldo - val }).eq('id', orig);
    await supabase.from('bancos').update({ saldo: bDest.saldo + val }).eq('id', dest);

    await supabase.from('transferencias_bancarias').insert([{
        origem_id: orig, destino_id: dest, valor: val, data_transferencia: new Date().toISOString() 
    }]);

    alert("Transferência concluída!");
    fecharModais();
}

// Salvar Novo Lançamento
async function salvarNovo() {
    const item = {
        descricao: document.getElementById('novoDescricao').value,
        valor: parseFloat(document.getElementById('novoValor').value),
        vencimento: document.getElementById('novoVencimento').value,
        banco_id: document.getElementById('novoBanco').value,
        status: 'ABERTO'
    };
    await supabase.from('contas_pagar').insert([item]);
    fecharModais(); carregarContas();
}

// Salvar NF Entrada - SOMA AO SALDO DO BANCO conforme solicitado
async function salvarNF() {
    const valor = parseFloat(document.getElementById('nfValor').value);
    const bancoId = document.getElementById('nfBanco').value;
    
    // 1. Criar o registro financeiro
    const item = {
        descricao: "NF ENTRADA: " + document.getElementById('nfDescricao').value,
        valor: valor,
        vencimento: document.getElementById('nfVencimento').value,
        banco_id: bancoId,
        status: 'PAGO' // Definido como PAGO pois o saldo já será alterado agora
    };
    await supabase.from('contas_pagar').insert([item]);

    // 2. Somar ao saldo do banco indicado
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    await supabase.from('bancos').update({ saldo: (b.saldo || 0) + valor }).eq('id', bancoId);

    alert("NF lançada e saldo atualizado!");
    fecharModais(); carregarContas();
}

carregarBancos();
carregarContas();
