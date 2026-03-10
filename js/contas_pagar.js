// Funções de Utilitário
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => d ? d.split('-').reverse().join('/') : '-';

// Preenchimento de Bancos
async function carregarBancos() {
    const { data } = await supabase.from('bancos').select('id, nome').order('nome');
    if (data) {
        const options = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        // Garante que os elementos existem antes de setar o innerHTML
        const ids = ['novoBanco', 'transfOrigem', 'transfDestino', 'nfBanco'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = options;
        });
    }
}

// Listagem Principal
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
        const statusVerde = (item.status === 'RECEBIDO' || item.status === 'PAGO');

        corpo.innerHTML += `
            <tr>
                <td>${dataBR(item.vencimento)}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td class="${isNF ? 'valor-entrada' : ''}">${isNF ? moeda(item.valor) : '-'}</td>
                <td class="${!isNF ? 'valor-saida' : ''}">${!isNF ? moeda(item.valor) : '-'}</td>
                <td class="${statusVerde ? 'status-recebido' : 'status-aberto'}">${item.status}</td>
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

// Funções de Modal (Abertura/Fechamento)
function abrirModalNovo() { document.getElementById('modalNovo').style.display = 'flex'; }
function abrirModalTransferencia() { document.getElementById('modalTransferencia').style.display = 'flex'; }
function abrirModalNF() { document.getElementById('modalNF').style.display = 'flex'; }
function fecharModais() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

// Ações Financeiras
async function baixarConta(id, valor, bancoId) {
    if (!confirm("Confirmar pagamento?")) return;
    await supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    await supabase.from('bancos').update({ saldo: (b.saldo || 0) - valor }).eq('id', bancoId);
    carregarContas();
}

async function estornarConta(id, valor, bancoId, statusAtual) {
    if (!confirm("Deseja realmente estornar?")) return;
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    let ajuste = (statusAtual === 'RECEBIDO') ? (b.saldo - valor) : (b.saldo + valor);
    await supabase.from('bancos').update({ saldo: ajuste }).eq('id', bancoId);
    await supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    carregarContas();
}

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

// Salvar Lançamentos
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

async function salvarNF() {
    const valor = parseFloat(document.getElementById('nfValor').value);
    const bancoId = document.getElementById('nfBanco').value;
    const item = {
        descricao: "NF ENTRADA: " + document.getElementById('nfDescricao').value,
        valor: valor,
        vencimento: document.getElementById('nfVencimento').value,
        banco_id: bancoId,
        status: 'RECEBIDO'
    };
    await supabase.from('contas_pagar').insert([item]);
    const { data: b } = await supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    await supabase.from('bancos').update({ saldo: (b.saldo || 0) + valor }).eq('id', bancoId);
    alert("NF lançada com sucesso!");
    fecharModais(); carregarContas();
}

async function processarTransferencia() {
    const orig = document.getElementById('transfOrigem').value;
    const dest = document.getElementById('transfDestino').value;
    const val = parseFloat(document.getElementById('transfValor').value);
    if (orig === dest) return alert("Selecione bancos diferentes!");
    const { data: bOrig } = await supabase.from('bancos').select('saldo').eq('id', orig).single();
    const { data: bDest } = await supabase.from('bancos').select('saldo').eq('id', dest).single();
    await supabase.from('bancos').update({ saldo: bOrig.saldo - val }).eq('id', orig);
    await supabase.from('bancos').update({ saldo: bDest.saldo + val }).eq('id', dest);
    await supabase.from('transferencias_bancarias').insert([{ origem_id: orig, destino_id: dest, valor: val, data_transferencia: new Date().toISOString() }]);
    alert("Transferência realizada!");
    fecharModais(); carregarContas();
}

// Inicialização
carregarBancos();
carregarContas();
