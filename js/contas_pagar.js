// 1. Inicialização Única
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Utilitários
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => d ? d.split('-').reverse().join('/') : '-';

// Funções de Interface
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
                <td>${dataBR(item.vencimento)}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td class="${isNF ? 'valor-entrada' : ''}">${isNF ? moeda(item.valor) : '-'}</td>
                <td class="${!isNF ? 'valor-saida' : ''}">${!isNF ? moeda(item.valor) : '-'}</td>
                <td class="${stVerde ? 'status-recebido' : 'status-aberto'}">${item.status}</td>
                <td>
                    ${item.status === 'ABERTO' 
                        ? `<button onclick="baixar('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn btn-verde">Pagar</button>`
                        : `<button onclick="estornar('${item.id}', ${item.valor}, '${item.banco_id}', '${item.status}')" class="btn btn-cinza">Estornar</button>`
                    }
                    <button onclick="excluir('${item.id}', '${item.status}', ${item.valor}, '${item.banco_id}')" class="btn btn-vermelho">✕</button>
                </td>
            </tr>`;
    });
}

// Ações
window.baixar = async (id, val, bId) => {
    await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
    await _supabase.from('bancos').update({ saldo: (b.saldo || 0) - val }).eq('id', bId);
    carregarContas();
};

window.estornar = async (id, val, bId, status) => {
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
    let novo = (status === 'RECEBIDO') ? (b.saldo - val) : (b.saldo + val);
    await _supabase.from('bancos').update({ saldo: novo }).eq('id', bId);
    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    carregarContas();
};

window.excluir = async (id, status, val, bId) => {
    if (status !== 'ABERTO') {
        const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
        let novo = (status === 'RECEBIDO') ? (b.saldo - val) : (b.saldo + val);
        await _supabase.from('bancos').update({ saldo: novo }).eq('id', bId);
    }
    await _supabase.from('contas_pagar').delete().eq('id', id);
    carregarContas();
};

// Eventos de Botão
document.getElementById('btnFiltrar').onclick = carregarContas;
document.getElementById('btnAbrirNovo').onclick = () => abrirM('modalNovo');
document.getElementById('btnAbrirTransf').onclick = () => abrirM('modalTransferencia');
document.getElementById('btnAbrirNF').onclick = () => abrirM('modalNF');

document.getElementById('btnSalvarNF').onclick = async () => {
    const val = parseFloat(document.getElementById('nfValor').value);
    const bId = document.getElementById('nfBanco').value;
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
    await _supabase.from('contas_pagar').insert([{
        descricao: document.getElementById('novoDescricao').value,
        valor: parseFloat(document.getElementById('novoValor').value),
        vencimento: document.getElementById('novoVencimento').value,
        banco_id: document.getElementById('novoBanco').value,
        status: 'ABERTO'
    }]);
    fecharModais(); carregarContas();
};

// Início
carregarBancos();
carregarContas();
