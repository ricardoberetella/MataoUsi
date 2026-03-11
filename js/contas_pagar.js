const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formatarMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function carregarDados() {
    try {
        // 1. Carregar Saldos dos Bancos
        const { data: bancos, error: errBancos } = await _supabase.from('bancos').select('*');
        if (errBancos) throw errBancos;

        if (bancos) {
            bancos.forEach(b => {
                // Mapeamento exato baseado na sua tabela 'bancos'
                let id = b.nome === 'CAIXA FEDERAL' ? 'resumoCaixa' : 
                         b.nome === 'SICOOB' ? 'resumoSicoob' : 
                         b.nome === 'APLICAÇÃO' ? 'resumoAplicacao' : null;
                
                const el = document.getElementById(id);
                if (el) el.innerText = formatarMoeda(b.saldo);
            });
        }

        // 2. Soma Previsão Receber
        const { data: receber } = await _supabase.from('contas_receber').select('valor').eq('status', 'ABERTO');
        const totalReceber = receber ? receber.reduce((acc, item) => acc + Number(item.valor), 0) : 0;
        document.getElementById('resumoReceber').innerText = formatarMoeda(totalReceber);

        // 3. Soma Contas a Pagar (Corrigido para somar apenas débitos pendentes)
        const { data: pagar } = await _supabase.from('contas_pagar').select('valor').eq('status', 'PENDENTE');
        // Filtra valores negativos para o card de dívidas
        const totalPagar = pagar ? pagar.reduce((acc, item) => item.valor < 0 ? acc + item.valor : acc, 0) : 0;
        document.getElementById('resumoPagar').innerText = formatarMoeda(Math.abs(totalPagar));

        // 4. Lista de Lançamentos
        const { data: lista, error: errLista } = await _supabase.from('contas_pagar').select('*, bancos(nome)').order('vencimento', { ascending: false });
        if (errLista) throw errLista;

        const tbody = document.getElementById('listaFinanceiro');
        if (tbody) {
            tbody.innerHTML = lista.map(item => `
                <tr>
                    <td>${new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>${item.bancos?.nome || 'N/A'}</td>
                    <td>${item.descricao}</td>
                    <td style="color: ${item.valor < 0 ? '#ef4444' : '#22c55e'}">${formatarMoeda(item.valor)}</td>
                    <td class="${item.status === 'PAGO' ? 'status-pago' : 'status-pendente'}">${item.status}</td>
                    <td>
                        <button onclick="excluir('${item.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }

    } catch (e) {
        console.error("Falha ao carregar dados:", e.message);
    }
}

document.addEventListener('DOMContentLoaded', carregarDados);
