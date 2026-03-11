// Configurações do Supabase (Substitua pelas suas credenciais se necessário)
const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_AQUI"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// FUNÇÕES GLOBAIS - Resolvem o erro "abrirModal is not defined"
window.abrirModal = (tipo) => {
    console.log("Iniciando novo lançamento:", tipo);
    // Aqui você deve disparar a exibição do seu formulário modal
    alert("Formulário de " + tipo + " em desenvolvimento.");
};

window.editarRegistro = (id) => alert("Editando ID: " + id);
window.excluirRegistro = async (id) => {
    if(confirm("Deseja realmente excluir este lançamento?")) {
        await _supabase.from('contas_pagar').delete().eq('id', id);
        carregarTudo();
    }
};

window.baixarTitulo = async (id) => {
    await _supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', id);
    carregarTudo();
};

window.estornarTitulo = async (id) => {
    await _supabase.from('contas_pagar').update({ status: 'ABERTO' }).eq('id', id);
    carregarTudo();
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
                <td style="color:#22c55e; font-weight:bold;">${item.tipo === 'CREDITO' ? moeda(item.valor) : '-'}</td>
                <td style="color:#ef4444; font-weight:bold;">${item.tipo === 'DEBITO' ? moeda(item.valor) : '-'}</td>
                <td style="font-weight:bold; color:${corStatus}">${item.status}</td>
                <td>
                    <div style="display: flex;">
                        <button onclick="editarRegistro('${item.id}')" class="btn-tab" style="background:#0ea5e9">EDITAR</button>
                        ${!isPago ? 
                            `<button onclick="baixarTitulo('${item.id}')" class="btn-tab" style="background:#22c55e">PAGAR</button>` : 
                            `<button onclick="estornarTitulo('${item.id}')" class="btn-tab" style="background:#f59e0b">ESTORNAR</button>`
                        }
                        <button onclick="excluirRegistro('${item.id}')" class="btn-tab" style="background:#ef4444">X</button>
                    </div>
                </td>
            </tr>`;
    });
}

// Atualiza os cards de resumo (Simulação - vincule aos dados reais do Supabase)
async function atualizarResumo() {
    // Exemplo de atualização:
    // document.getElementById('resumoSicoob').innerText = moeda(118950.08);
}

window.carregarTudo = () => {
    atualizarResumo();
    carregarTabela();
};

// Inicia o sistema ao abrir a página
carregarTudo();
