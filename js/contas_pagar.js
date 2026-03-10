const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => d ? d.split('-').reverse().join('/') : '-';

window.fecharModais = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
const abrirM = (id) => document.getElementById(id).style.display = 'flex';

async function carregarBancos() {
    const { data } = await _supabase.from('bancos').select('id, nome').order('nome');
    if (data) {
        const options = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        ['novoBanco', 'transfOrigem', 'transfDestino', 'nfBanco'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = options;
        });
    }
}

async function carregarContas() {
    const status = document.getElementById('filtroStatus').value;
    const ini = document.getElementById('filtroDataInicio').value;
    const fim = document.getElementById('filtroDataFim').value;

    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    if (status) query = query.eq('status', status);
    if (ini) query = query.gte('vencimento', ini);
    if (fim) query = query.lte('vencimento', fim);

    const { data, error } = await query.order('vencimento', { ascending: true });
    if (error) return;

    const corpo = document.getElementById('listaPagar');
    corpo.innerHTML = '';

    data.forEach(item => {
        const isNF = item.descricao.toUpperCase().includes("NF ENTRADA");
        const stVerde = (item.status === 'RECEBIDO' || item.status === 'PAGO');

        corpo.innerHTML += `
            <tr>
                <td class="col-data">${dataBR(item.vencimento)}</td>
                <td class="col-banco">${item.bancos?.nome || '-'}</td>
                <td class="col-desc">${item.descricao}</td>
                <td class="col-valor ${isNF ? 'valor-entrada' : ''}">${isNF ? moeda(item.valor) : '-'}</td>
                <td class="col-valor ${!isNF ? 'valor-saida' : ''}">${!isNF ? moeda(item.valor) : '-'}</td>
                <td class="col-status ${stVerde ? 'status-recebido' : 'status-aberto'}">${item.status}</td>
                <td class="col-acoes">
                    <div class="acoes-flex">
                        ${item.status === 'ABERTO' 
                            ? `<button onclick="baixar('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn btn-verde">Pagar</button>`
                            : `<button onclick="estornar('${item.id}', ${item.valor}, '${item.banco_id}', '${item.status}')" class="btn btn-cinza">Estornar</button>`
                        }
                        <button onclick="excluir('${item.id}', '${item.status}', ${item.valor}, '${item.banco_id}')" class="btn btn-vermelho btn-excluir-mini">✕</button>
                    </div>
                </td>
            </tr>`;
    });
}

// LOGICA DE REVERSÃO CORRIGIDA
window.estornar = async (id, val, bId, status) => {
    if(!confirm("Deseja estornar e reverter o saldo no banco?")) return;
    
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
    let saldoAtual = b.saldo || 0;
    let novoSaldo;

    // Se era um crédito (RECEBIDO), o estorno DEBITA (subtrai)
    if (status === 'RECEBIDO') {
        novoSaldo = saldoAtual - val;
    } 
    // Se era um débito (PAGO), o estorno CREDITA (soma)
    else {
        novoSaldo = saldoAtual + val;
    }

    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bId);
    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    carregarContas();
};

window.excluir = async (id, status, val, bId) => {
    if(!confirm("Excluir permanentemente e ajustar saldo?")) return;
    
    // Só mexe no banco se a conta já tivesse sido liquidada (PAGO ou RECEBIDO)
    if (status !== 'ABERTO') {
        const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
        let saldoAtual = b.saldo || 0;
        let novoSaldo;

        // Se excluiu um crédito, precisa tirar o valor do banco
        if (status === 'RECEBIDO') {
            novoSaldo = saldoAtual - val;
        } 
        // Se excluiu um débito, precisa devolver o valor ao banco
        else {
            novoSaldo = saldoAtual + val;
        }
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bId);
    }
    
    await _supabase.from('contas_pagar').delete().eq('id', id);
    carregarContas();
};

window.baixar = async (id, val, bId) => {
    if(!confirm("Confirmar pagamento?")) return;
    await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
    await _supabase.from('bancos').update({ saldo: (b.saldo || 0) - val }).eq('id', bId);
    carregarContas();
};

document.getElementById('btnFiltrar').onclick = carregarContas;
document.getElementById('btnAbrirNovo').onclick = () => abrirM('modalNovo');
document.getElementById('btnAbrirTransf').onclick = () => abrirM('modalTransferencia');
document.getElementById('btnAbrirNF').onclick = () => abrirM('modalNF');

document.getElementById('btnSalvarNF').onclick = async () => {
    const val = parseFloat(document.getElementById('nfValor').value);
    const bId = document.getElementById('nfBanco').value;
    if(!val || !bId) return alert("Preencha todos os campos");
    
    await _supabase.from('contas_pagar').insert([{
        descricao: "NF ENTRADA: " + document.getElementById('nfDescricao').value,
        valor: val, vencimento: document.getElementById('nfVencimento').value,
        banco_id: bId, status: 'RECEBIDO'
    }]);
    
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
    await _supabase.from('bancos').update({ saldo: (b.saldo || 0) + val }).eq('id', bId);
    fecharModais(); carregarContas();
};

document.getElementById('btnSalvarNovo').onclick = async () => {
    const val = parseFloat(document.getElementById('novoValor').value);
    if(!val) return alert("Informe o valor");
    await _supabase.from('contas_pagar').insert([{
        descricao: document.getElementById('novoDescricao').value,
        valor: val, vencimento: document.getElementById('novoVencimento').value,
        banco_id: document.getElementById('novoBanco').value,
        status: 'ABERTO'
    }]);
    fecharModais(); carregarContas();
};

document.getElementById('btnSalvarTransf').onclick = async () => {
    const orig = document.getElementById('transfOrigem').value;
    const dest = document.getElementById('transfDestino').value;
    const val = parseFloat(document.getElementById('transfValor').value);
    if(orig === dest) return alert("Bancos devem ser diferentes");
    const { data: bO } = await _supabase.from('bancos').select('saldo').eq('id', orig).single();
    const { data: bD } = await _supabase.from('bancos').select('saldo').eq('id', dest).single();
    await _supabase.from('bancos').update({ saldo: (bO.saldo || 0) - val }).eq('id', orig);
    await _supabase.from('bancos').update({ saldo: (bD.saldo || 0) + val }).eq('id', dest);
    fecharModais(); carregarContas();
};

carregarBancos();
carregarContas();
