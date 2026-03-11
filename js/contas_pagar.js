const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

async function carregarTudo() {
    try {
        // 1. Buscar Saldos Reais dos Bancos
        const { data: bancos } = await _supabase.from('bancos').select('*');
        if (bancos) {
            bancos.forEach(b => {
                let elId = b.nome === 'SICOOB' ? 'resumoSicoob' : 
                           b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : 
                           b.nome === 'APLICAÇÃO' ? 'resumoAplicacao' : null;
                if (elId) document.getElementById(elId).innerText = fmt(b.saldo);
            });
            // Preencher selects dos modais
            const options = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            document.getElementById('campoBanco').innerHTML = options;
            document.getElementById('transfOrigem').innerHTML = options;
            document.getElementById('transfDestino').innerHTML = options;
        }

        // 2. Buscar Previsão de Gastos (Pendentes no Extrato)
        const { data: extrato } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        let totalPagar = extrato?.reduce((acc, cur) => acc + (cur.valor < 0 ? Math.abs(cur.valor) : 0), 0) || 0;
        document.getElementById('resumoPagar').innerText = fmt(totalPagar);

        // 3. BUSCAR CONTAS A RECEBER (Status ABERTO da tabela de faturas)
        const { data: receber } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        let totalReceber = receber?.reduce((acc, cur) => acc + Number(cur.valor), 0) || 0;
        document.getElementById('resumoReceber').innerText = fmt(totalReceber);

        // 4. Carregar Tabela de Movimentação
        const { data: lista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false }).limit(50);
        document.getElementById('listaFinanceiro').innerHTML = lista?.map(item => `
            <tr>
                <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td>${item.descricao}</td>
                <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${fmt(item.valor)}</td>
                <td style="font-weight: bold; color: ${item.status === 'PENDENTE' ? '#f59e0b' : '#38bdf8'}">${item.status}</td>
                <td style="text-align: center;">
                    <button onclick="excluirRegistro('${item.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </td>
            </tr>
        `).join('') || '';

    } catch (e) { console.error("Erro ao sincronizar dados:", e); }
}

// Funções de abrir/fechar modal e salvar (mantenha as mesmas da resposta anterior)
// ...
document.addEventListener('DOMContentLoaded', carregarTudo);
