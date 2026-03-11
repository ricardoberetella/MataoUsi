const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// LÓGICA BANCÁRIA: Atualiza o saldo na tabela 'bancos'
async function atualizarSaldoBanco(bancoId, valorDiferenca) {
    const { data: banco } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    if (banco) {
        const novoSaldo = Number(banco.saldo) + Number(valorDiferenca);
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    }
}

async function carregarTudo() {
    try {
        // 1. Carregar Bancos e preencher Selects
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            const options = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            document.getElementById('campoBanco').innerHTML = options;
            document.getElementById('transfOrigem').innerHTML = options;
            document.getElementById('transfDestino').innerHTML = options;

            // Atualizar cards de saldo do topo
            bancos.forEach(b => {
                let elId = "";
                if (b.nome === 'SICOOB') elId = 'resumoSicoob';
                else if (b.nome === 'CAIXA FEDERAL') elId = 'resumoCaixa';
                else if (b.nome === 'APLICAÇÃO') elId = 'resumoAplicacao';
                
                const el = document.getElementById(elId);
                if (el) el.innerText = fmt(b.saldo);
            });
        }

        // 2. Carregar Previsões (Pendentes)
        const { data: lancamentos } = await _supabase.from('contas_pagar').select('valor, status');
        let pagar = 0, receber = 0;
        lancamentos?.forEach(l => {
            if (l.status === 'PENDENTE') {
                if (l.valor < 0) pagar += Math.abs(l.valor);
                else receber += l.valor;
            }
        });
        document.getElementById('resumoPagar').innerText = fmt(pagar);
        document.getElementById('resumoReceber').innerText = fmt(receber);

        // 3. Carregar Tabela de Extrato
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false }).limit(30);
        document.getElementById('listaFinanceiro').innerHTML = lista?.map(item => `
            <tr>
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
                <td style="text-align: center;">
                    <button onclick="excluirRegistro('${item.id}')" style="background:none; border:none; cursor:pointer; font-size:16px;">🗑️</button>
                </td>
            </tr>
        `).join('') || '';

    } catch (e) { console.error("Erro geral:", e); }
}

window.abrirModal = (tipo) => {
    if (tipo === 'TRANSFERENCIA') {
        document.getElementById('modalTransferencia').style.display = 'block';
        document.getElementById('transfData').value = new Date().toISOString().split('T')[0];
    } else {
        document.getElementById('modalFinanceiro').style.display = 'block';
        document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
        document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
        document.getElementById('campoDescricao').value = '';
        document.getElementById('campoValor').value = '';
    }
};

window.fecharModais = () => {
    document.getElementById('modalFinanceiro').style.display = 'none';
    document.getElementById('modalTransferencia').style.display = 'none';
};

window.salvarLancamento = async () => {
    const titulo = document.getElementById('modalTitulo').innerText;
    let valor = Math.abs(parseFloat(document.getElementById('campoValor').value));
    const bancoId = document.getElementById('campoBanco').value;
    
    if (titulo.includes('DEBITO')) valor = -valor;

    const { error } = await _supabase.from('contas_pagar').insert([{
        vencimento: document.getElementById('campoData').value,
        banco_id: bancoId,
        descricao: document.getElementById('campoDescricao').value,
        valor: valor,
        status: 'PAGO'
    }]);

    if (!error) {
        await atualizarSaldoBanco(bancoId, valor);
        fecharModais();
        carregarTudo();
    } else alert(error.message);
};

window.executarTransferencia = async () => {
    const data = document.getElementById('transfData').value;
    const origemId = document.getElementById('transfOrigem').value;
    const destinoId = document.getElementById('transfDestino').value;
    const valor = Math.abs(parseFloat(document.getElementById('transfValor').value));

    if (origemId === destinoId || !valor) return alert("Verifique os dados!");

    const { error } = await _supabase.from('contas_pagar').insert([
        { vencimento: data, banco_id: origemId, descricao: 'Transferência (Saída)', valor: -valor, status: 'PAGO' },
        { vencimento: data, banco_id: destinoId, descricao: 'Transferência (Entrada)', valor: valor, status: 'PAGO' }
    ]);

    if (!error) {
        await atualizarSaldoBanco(origemId, -valor);
        await atualizarSaldoBanco(destinoId, valor);
        fecharModais();
        carregarTudo();
    }
};

window.excluirRegistro = async (id) => {
    if (confirm("Estornar lançamento? O valor voltará ao saldo do banco.")) {
        const { data: registro } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
        if (registro) {
            const { error } = await _supabase.from('contas_pagar').delete().eq('id', id);
            if (!error) {
                await atualizarSaldoBanco(registro.banco_id, registro.valor * -1);
                carregarTudo();
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
