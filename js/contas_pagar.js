// Funções de Interface
function abrirModal(tipo) {
    document.getElementById('tipoOperacao').value = tipo;
    document.getElementById('modalTitle').innerText = tipo === 'DEBITO' ? 'Novo Débito (Saída)' : 'Novo Crédito (Entrada)';
    
    // Carregar bancos no select (apenas SICOOB e CAIXA)
    carregarBancosModal();
    document.getElementById('modalLancamento').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalLancamento').style.display = 'none';
}

async function carregarBancosModal() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    const select = document.getElementById('mBanco');
    select.innerHTML = '';
    
    bancos.forEach(b => {
        // Filtra para não incluir o banco "APLICAÇÃO"
        if (!b.nome.toUpperCase().includes('APLICA')) {
            select.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
        }
    });
}

// Lógica de Salvar (Débito e Crédito)
async function salvarOperacao() {
    const tipo = document.getElementById('tipoOperacao').value;
    const bancoId = document.getElementById('mBanco').value;
    const valor = parseFloat(document.getElementById('mValor').value);
    const nf = document.getElementById('mNF').value;
    const desc = document.getElementById('mDesc').value;
    const data = document.getElementById('mData').value;

    if (!valor || !data) return alert("Preencha valor e data!");

    // 1. Inserir no extrato (contas_pagar)
    const status = tipo === 'DEBITO' ? 'PAGO' : 'RECEBIDO';
    await _supabase.from('contas_pagar').insert([{
        descricao: `NF ${nf}: ${desc}`,
        valor: valor,
        vencimento: data,
        status: status,
        banco_id: bancoId
    }]);

    // 2. Atualizar Saldo do Banco
    const { data: banco } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    let novoSaldo = tipo === 'DEBITO' ? (parseFloat(banco.saldo) - valor) : (parseFloat(banco.saldo) + valor);

    await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);

    fecharModal();
    location.reload(); // Atualiza para mostrar novos saldos e lista
}

// Atualizar Dashboard (incluindo Aplicação)
async function atualizarDashboard() {
    const { data: bancos } = await _supabase.from('bancos').select('*');
    bancos.forEach(b => {
        const nome = b.nome.toUpperCase();
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.saldo);
        
        if (nome.includes('SICOOB')) document.getElementById('resumoSicoob').innerText = valorFormatado;
        if (nome.includes('CAIXA')) document.getElementById('resumoCaixa').innerText = valorFormatado;
        if (nome.includes('APLICA')) document.getElementById('resumoAplicacao').innerText = valorFormatado;
    });
}

// Chamar ao carregar a página
atualizarDashboard();
