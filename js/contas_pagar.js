const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// Função para atualizar saldo físico do banco
async function atualizarSaldoBanco(bancoId, valorDiferenca) {
    const { data: banco } = await _supabase.from('bancos').select('saldo').eq('id', bancoId).single();
    if (banco) {
        const novoSaldo = Number(banco.saldo) + Number(valorDiferenca);
        await _supabase.from('bancos').update({ saldo: novoSaldo }).eq('id', bancoId);
    }
}

async function carregarTudo() {
    try {
        // 1. Bancos e Selects
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            const opts = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            document.getElementById('campoBanco').innerHTML = opts;
            document.getElementById('transfOrigem').innerHTML = opts;
            document.getElementById('transfDestino').innerHTML = opts;

            bancos.forEach(b => {
                let id = b.nome === 'SICOOB' ? 'resumoSicoob' : 
                         b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : 
                         b.nome === 'APLICAÇÃO' ? 'resumoAplicacao' : null;
                if (id) document.getElementById(id).innerText = fmt(b.saldo);
            });
        }

        // 2. A Pagar (Pendentes no Extrato)
        const { data: pnd } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        let totalPagar = pnd?.reduce((acc, cur) => acc + (cur.valor < 0 ? Math.abs(cur.valor) : 0), 0) || 0;
        document.getElementById('resumoPagar').innerText = fmt(totalPagar);

        // 3. Receber (Busca na tabela de Contas a Receber o status ABERTO)
        const { data: rcb } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        let totalReceber = rcb?.reduce((acc, cur) => acc + Number(cur.valor), 0) || 0;
        document.getElementById('resumoReceber').innerText = fmt(totalReceber);

        // 4. Tabela
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false }).limit(50);
        document.getElementById('listaFinanceiro').innerHTML = lista?.map(item => `
            <tr>
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
                <td style="color: ${item.status === 'PENDENTE' ? '#f59e0b' : '#38bdf8'}; font-weight: bold;">${item.status}</td>
                <td style="text-align: center;">
                    <button onclick="excluirRegistro('${item.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </td>
            </tr>
        `).join('') || '';

    } catch (e) { console.error("Erro ao carregar:", e); }
}

window.abrirModal = (tipo) => {
    if (tipo === 'TRANSFERENCIA') {
        document.getElementById('modalTransferencia').style.display = 'block';
        document.getElementById('transfData').value = new Date().toISOString().split('T')[0];
    } else {
        document.getElementById('modalFinanceiro').style.display = 'block';
        document.getElementById('modalTitulo').innerText = 'Lançar ' + tipo;
        document.getElementById('campoData').value = new Date().toISOString().split('T')[0];
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
    }
};

window.executarTransferencia = async () => {
    const data = document.getElementById('transfData').value;
    const ori = document.getElementById('transfOrigem').value;
    const des = document.getElementById('transfDestino').value;
    const val = Math.abs(parseFloat(document.getElementById('transfValor').value));

    if (ori === des || !val) return alert("Dados inválidos");

    const { error } = await _supabase.from('contas_pagar').insert([
        { vencimento: data, banco_id: ori, descricao: 'Transferência (Saída)', valor: -val, status: 'PAGO' },
        { vencimento: data, banco_id: des, descricao: 'Transferência (Entrada)', valor: val, status: 'PAGO' }
    ]);

    if (!error) {
        await atualizarSaldoBanco(ori, -val);
        await atualizarSaldoBanco(des, val);
        fecharModais();
        carregarTudo();
    }
};

window.excluirRegistro = async (id) => {
    if (confirm("Estornar lançamento?")) {
        const { data: reg } = await _supabase.from('contas_pagar').select('*').eq('id', id).single();
        if (reg) {
            const { error } = await _supabase.from('contas_pagar').delete().eq('id', id);
            if (!error) {
                await atualizarSaldoBanco(reg.banco_id, reg.valor * -1);
                carregarTudo();
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', carregarTudo);
