var SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
var _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function atualizarDashboard() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    const bSelect = document.getElementById('mBanco');
    bSelect.innerHTML = '';

    bancos?.forEach(b => {
        const nome = b.nome.toUpperCase();
        if(nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = moeda(b.saldo);
        if(nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = moeda(b.saldo);
        if(nome.includes('APLICA')) document.getElementById('resumoAplicacao').innerText = moeda(b.saldo);
        
        // Adiciona ao select apenas se não for Aplicação
        if(!nome.includes('APLICA')) {
            bSelect.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
        }
    });

    const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'ABERTO');
    document.getElementById('resumoPagar').innerText = moeda(pagar?.reduce((acc, i) => acc + Number(i.valor), 0));

    const { data: receber } = await _supabase.from('contas_receber').select('valor').or('status.eq.ABERTO,status.eq.VENCIDO');
    document.getElementById('resumoReceber').innerText = moeda(receber?.reduce((acc, i) => acc + Number(i.valor), 0));
}

async function carregarLista() {
    const status = document.getElementById('fStatus').value;
    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    if(status) query = query.eq('status', status);
    
    const { data } = await query.order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    data?.forEach(item => {
        const isEntrada = item.status === 'RECEBIDO';
        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || 'SICOOB'}</td>
                <td>${item.descricao}</td>
                <td style="color: #22c55e;">${isEntrada ? moeda(item.valor) : '-'}</td>
                <td style="color: #ef4444;">${!isEntrada ? moeda(item.valor) : '-'}</td>
                <td style="font-weight: bold;">${item.status}</td>
                <td><button onclick="excluir('${item.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button></td>
            </tr>`;
    });
}

function abrirModal(tipo) {
    document.getElementById('tipoLancamento').value = tipo;
    document.getElementById('modalTitle').innerText = tipo === 'DEBITO' ? 'Novo Débito (Saída)' : 'Novo Crédito (Entrada)';
    document.getElementById('modalLancamento').style.display = 'flex';
}

function fecharModal() { document.getElementById('modalLancamento').style.display = 'none'; }

async function salvarLancamento() {
    const tipo = document.getElementById('tipoLancamento').value;
    const bancoId = document.getElementById('mBanco').value;
    const valor = Number(document.getElementById('mValor').value);
    const statusFinal = tipo === 'DEBITO' ? 'PAGO' : 'RECEBIDO';

    // 1. Criar registro no extrato (contas_pagar atua como extrato consolidado)
    await _supabase.from('contas_pagar').insert([{
        descricao: `NF ${document.getElementById('mNF').value}: ${document.getElementById('mDesc').value}`,
        valor: valor,
        vencimento: document.getElementById('mData').value,
        status: statusFinal,
        banco_id: bancoId
    }]);

    // 2. Atualizar Saldo do Banco Escolhido
    const { data: b } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    const novoSaldo = tipo === 'DEBITO' ? (Number(b.saldo) - valor) : (Number(b.saldo) + valor);
    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);

    fecharModal();
    carregarTudo();
}

async function carregarTudo() {
    await atualizarDashboard();
    await carregarLista();
}

carregarTudo();
