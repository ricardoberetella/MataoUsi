var SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
var _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function atualizarDashboard() {
    // Busca saldo do SICOOB
    const { data: bancos } = await _supabase.from('bancos').select('*').ilike('nome', '%SICOOB%').single();
    if(bancos) {
        document.getElementById('resumoSicoob').innerText = moeda(bancos.saldo);
        window.idSicoob = bancos.id; // Guarda o ID para o pagamento
    }

    // Soma Contas a Pagar (Abertas)
    const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
    const totalPagar = pagar?.reduce((acc, i) => acc + (Number(i.valor) || 0), 0) || 0;
    document.getElementById('resumoPagar').innerText = moeda(totalPagar);

    // Soma Previsão Receber (Abertos + Vencidos)
    const { data: receber } = await _supabase.from('contas_receber').select('valor').or('status.eq.ABERTO,status.eq.VENCIDO');
    const totalReceber = receber?.reduce((acc, i) => acc + (Number(i.valor) || 0), 0) || 0;
    document.getElementById('resumoReceber').innerText = moeda(totalReceber);
}

async function carregarLista() {
    const { data } = await _supabase.from('contas_pagar').select('*').order('vencimento', { ascending: true });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.descricao}</td>
                <td style="color: #ef4444;">${moeda(item.valor)}</td>
                <td style="font-weight: bold; color: ${item.status === 'PAGO' ? '#22c55e' : '#fbbf24'}">${item.status}</td>
                <td>
                    ${item.status === 'ABERTO' 
                        ? `<button onclick="confirmarPagamento('${item.id}', ${item.valor})" class="btn btn-pagar">Pagar</button>`
                        : `<button onclick="estornarPagamento('${item.id}', ${item.valor})" class="btn btn-estornar">Estornar</button>`
                    }
                </td>
            </tr>`;
    });
}

// FUNÇÃO QUE VOCÊ PEDIU: Executa o pagamento e abate do banco
async function confirmarPagamento(id, valor) {
    if(!confirm(`Confirmar pagamento de ${moeda(valor)} pelo SICOOB?`)) return;

    try {
        // 1. Atualiza o status do lançamento para PAGO
        await _supabase.from('contas_pagar').update({ 
            status: 'PAGO',
            banco_id: window.idSicoob 
        }).eq('id', id);

        // 2. Busca saldo atual do banco SICOOB
        const { data: banco } = await _supabase.from('bancos').select('saldo').eq('id', window.idSicoob).single();
        
        // 3. Subtrai o valor do saldo (Sempre abate do SICOOB conforme pedido)
        const novoSaldo = Number(banco.saldo) - Number(valor);
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', window.idSicoob);

        alert("Pagamento processado e saldo atualizado!");
        carregarTudo();
    } catch (error) {
        console.error("Erro ao pagar:", error);
    }
}

async function estornarPagamento(id, valor) {
    if(!confirm("Deseja estornar este pagamento?")) return;

    const { data: banco } = await _supabase.from('bancos').select('saldo').eq('id', window.idSicoob).single();
    const novoSaldo = Number(banco.saldo) + Number(valor);

    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', window.idSicoob);

    carregarTudo();
}

async function carregarTudo() {
    await atualizarDashboard();
    await carregarLista();
}

carregarTudo();
