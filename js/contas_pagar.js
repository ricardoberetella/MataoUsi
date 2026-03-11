// Substitua pelas suas credenciais reais se necessário
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_AQUI"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// FUNÇÃO PARA ABRIR MODAL (Resolve o erro do console)
window.abrirModal = function(tipo) {
    console.log("Abrindo formulário para:", tipo);
    // Aqui você deve disparar a exibição do seu formulário de cadastro
    alert("Iniciando novo lançamento: " + tipo);
};

async function carregarTabela() {
    const status = document.getElementById('fStatus').value;
    const ini = document.getElementById('fDataInicio').value;
    const fim = document.getElementById('fDataFim').value;

    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    
    if (status) query = query.eq('status', status);
    if (ini) query = query.gte('vencimento', ini);
    if (fim) query = query.lte('vencimento', fim);

    const { data, error } = await query.order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

    if (error) { console.error("Erro ao carregar:", error); return; }

    data?.forEach(item => {
        const isPago = item.status === 'PAGO';
        const corStatus = item.status === 'ABERTO' ? '#fbbf24' : '#22c55e';

        corpo.innerHTML += `
            <tr>
                <td>${item.vencimento.split('-').reverse().join('/')}</td>
                <td>${item.bancos?.nome || '-'}</td>
                <td>${item.descricao}</td>
                <td style="color:#22c55e;">${item.tipo === 'CREDITO' ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444;">${item.tipo === 'DEBITO' ? moeda(item.valor) : '-'}</td>
                <td style="font-weight:bold; color:${corStatus}">${item.status}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="editarRegistro('${item.id}')" style="background:#0ea5e9; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">EDITAR</button>
                        ${!isPago ? 
                            `<button onclick="baixarTitulo('${item.id}')" style="background:#22c55e; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">PAGAR</button>` : 
                            `<button onclick="estornarTitulo('${item.id}')" style="background:#f59e0b; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">ESTORNAR</button>`
                        }
                        <button onclick="excluirRegistro('${item.id}')" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">X</button>
                    </div>
                </td>
            </tr>`;
    });
}

// Funções de Ação (Exemplos)
window.excluirRegistro = async (id) => {
    if(confirm("Deseja realmente excluir?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTabela();
    }
};

window.carregarTudo = () => carregarTabela();
carregarTudo();
