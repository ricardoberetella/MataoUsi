const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => d ? d.split('-').reverse().join('/') : '-';

// NOVA FUNÇÃO: Atualiza os cards superiores (Print 1)
async function atualizarDashboard() {
    // Busca saldos dos bancos
    const { data: bancos } = await _supabase.from('bancos').select('nome, saldo');
    let saldoSicoob = 0, saldoCaixa = 0;
    
    bancos?.forEach(b => {
        if(b.nome.includes('SICOOB')) saldoSicoob = b.saldo;
        if(b.nome.includes('CAIXA')) saldoCaixa = b.saldo;
    });

    // Busca total de contas em ABERTO (Saídas apenas)
    const { data: contas } = await _supabase.from('contas_pagar')
        .select('valor')
        .eq('status', 'ABERTO')
        .not('descricao', 'ilike', '%NF ENTRADA%');
    
    const totalPagar = contas?.reduce((acc, item) => acc + item.valor, 0) || 0;
    const projetado = (saldoSicoob + saldoCaixa) - totalPagar;

    document.getElementById('resumoSicoob').innerText = moeda(saldoSicoob);
    document.getElementById('resumoCaixa').innerText = moeda(saldoCaixa);
    document.getElementById('resumoPagar').innerText = moeda(totalPagar);
    document.getElementById('resumoTotal').innerText = moeda(projetado);
}

// Carregar lista e dashboard
async function carregarTudo() {
    await carregarContas();
    await atualizarDashboard();
}

async function carregarContas() {
    const status = document.getElementById('filtroStatus').value;
    const ini = document.getElementById('filtroDataInicio').value;
    const fim = document.getElementById('filtroDataFim').value;

    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    if (status) query = query.eq('status', status);
    if (ini) query = query.gte('vencimento', ini);
    if (fim) query = query.lte('vencimento', fim);

    const { data } = await query.order('vencimento', { ascending: true });
    const corpo = document.getElementById('listaPagar');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const isNF = item.descricao.toUpperCase().includes("NF ENTRADA");
        corpo.innerHTML += `
            <tr>
                <td>${dataBR(item.vencimento)}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="text-align: right; color:#22c55e">${isNF ? moeda(item.valor) : '-'}</td>
                <td style="text-align: right; color:#ef4444">${!isNF ? moeda(item.valor) : '-'}</td>
                <td style="text-align: center;" class="${item.status === 'ABERTO' ? 'status-aberto' : 'status-pago'}">${item.status}</td>
                <td>
                    <div class="acoes-flex">
                        ${item.status === 'ABERTO' 
                            ? `<button onclick="baixar('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn btn-verde">Pagar</button>`
                            : `<button onclick="estornar('${item.id}', ${item.valor}, '${item.banco_id}', '${item.status}')" class="btn btn-cinza">Estornar</button>`
                        }
                        <button onclick="excluir('${item.id}', '${item.status}', ${item.valor}, '${item.banco_id}')" class="btn btn-vermelho">✕</button>
                    </div>
                </td>
            </tr>`;
    });
}

// As funções baixar, estornar e excluir agora chamam carregarTudo() ao final
window.baixar = async (id, val, bId) => {
    if(!confirm("Confirmar pagamento?")) return;
    await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bId).single();
    await _supabase.from('bancos').update({ saldo: (b.saldo || 0) - val }).eq('id', bId);
    carregarTudo();
};

// ... (Mantenha as outras funções de estorno/exclusão da última versão, apenas troque carregarContas() por carregarTudo() no final delas)

document.getElementById('btnFiltrar').onclick = carregarTudo;
carregarTudo();
carregarBancos();
