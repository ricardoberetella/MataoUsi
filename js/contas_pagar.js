// Configurações do Supabase (use as suas chaves aqui)
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Define a função abrirModal globalmente para evitar o erro ReferenceError
window.abrirModal = function(tipo) {
    console.log("Iniciando lançamento:", tipo);
    // Adicione aqui a lógica para exibir o seu modal de formulário
    alert("Abrir formulário de " + tipo);
};

async function carregarTabela() {
    const status = document.getElementById('fStatus').value;
    let query = _supabase.from('contas_pagar').select('*, bancos(nome)');
    
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('vencimento', { ascending: false });
    const corpo = document.getElementById('listaFinanceiro');
    corpo.innerHTML = '';

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

window.carregarTudo = () => carregarTabela();
carregarTudo();
