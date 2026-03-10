var supabase = window.supabaseClient;
const tabela = document.getElementById("listaPagar");
const modalNovo = document.getElementById("modalNovoPagar");
const modalEditar = document.getElementById("modalEditarPagar");

function moeda(v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function dataBR(data) { if (!data) return "-"; const p = data.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; }
function fecharModais() { modalNovo.style.display = "none"; modalEditar.style.display = "none"; }

async function carregarBancos() {
    const { data } = await supabase.from("bancos").select("id, nome").order("nome");
    const selects = ["novoBanco", "editBanco", "filtroBanco"];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const options = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join("");
            el.innerHTML = id === "filtroBanco" ? `<option value="">Todos os Bancos</option>${options}` : options;
        }
    });
}

async function carregarContas() {
    const dataInicio = document.getElementById("filtroDataInicio").value;
    const dataFim = document.getElementById("filtroDataFim").value;
    const bancoId = document.getElementById("filtroBanco").value;
    const statusFiltro = document.getElementById("filtroStatus").value;

    let query = supabase.from("contas_pagar").select("*, bancos(nome)");

    if (dataInicio) query = query.gte("vencimento", dataInicio);
    if (dataFim) query = query.lte("vencimento", dataFim);
    if (bancoId) query = query.eq("banco_id", bancoId);
    if (statusFiltro) query = query.eq("status", statusFiltro);

    const { data, error } = await query.order("vencimento", { ascending: false });

    if (error) return console.error(error);
    
    tabela.innerHTML = "";
    data.forEach(l => {
        const tr = document.createElement("tr");
        const ePago = l.status === 'PAGO';
        tr.innerHTML = `
            <td>${dataBR(l.vencimento)}</td>
            <td>${l.bancos?.nome || "-"}</td>
            <td>${l.descricao}</td>
            <td>-</td>
            <td style="color:#ef4444; font-weight:bold">${moeda(l.valor)}</td>
            <td style="font-weight:bold; color: ${ePago ? '#22c55e' : '#f39c12'}">${l.status}</td>
            <td>
                ${!ePago 
                    ? `<button onclick="pagarConta('${l.id}', ${l.valor}, '${l.banco_id}')" class="btn btn-verde">Pagar</button>` 
                    : `<button onclick="estornarPagamento('${l.id}', ${l.valor}, '${l.banco_id}')" class="btn btn-cinza">Estornar</button>`}
                <button onclick="abrirEditar('${l.id}')" class="btn btn-amarelo">Editar</button>
                <button onclick="excluirConta('${l.id}')" class="btn btn-vermelho">Excluir</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

// Lógica de Pagar (Deduz do Banco)
async function pagarConta(id, valor, bancoId) {
    // 1. Atualiza Status da Conta
    await supabase.from("contas_pagar").update({ status: "PAGO" }).eq("id", id);
    
    // 2. Busca Saldo Atual para atualizar o banco
    const { data: banco } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    const novoSaldo = (banco.saldo || 0) - valor;

    // 3. Atualiza Saldo na Tabela Bancos
    await supabase.from("bancos").update({ saldo: novoSaldo }).eq("id", bancoId);
    
    carregarContas();
}

// Lógica de Estornar (Devolve ao Banco)
async function estornarPagamento(id, valor, bancoId) {
    if (!confirm("Deseja estornar este pagamento? O valor será devolvido ao saldo do banco.")) return;

    // 1. Volta status para ABERTO
    await supabase.from("contas_pagar").update({ status: "ABERTO" }).eq("id", id);
    
    // 2. Busca Saldo Atual
    const { data: banco } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    const novoSaldo = (banco.saldo || 0) + valor;

    // 3. Extorna o valor para a coluna 'saldo'
    await supabase.from("bancos").update({ saldo: novoSaldo }).eq("id", bancoId);
    
    carregarContas();
}

function limparFiltros() {
    document.getElementById("filtroDataInicio").value = "";
    document.getElementById("filtroDataFim").value = "";
    document.getElementById("filtroBanco").value = "";
    document.getElementById("filtroStatus").value = "ABERTO";
    carregarContas();
}

async function abrirEditar(id) {
    const { data } = await supabase.from("contas_pagar").select("*").eq("id", id).single();
    if (data) {
        document.getElementById("editId").value = data.id;
        document.getElementById("editDescricao").value = data.descricao;
        document.getElementById("editValor").value = data.valor;
        document.getElementById("editVencimento").value = data.vencimento;
        document.getElementById("editBanco").value = data.banco_id;
        document.getElementById("editStatus").value = data.status;
        modalEditar.style.display = "flex";
    }
}

async function atualizarConta() {
    const id = document.getElementById("editId").value;
    const dados = {
        descricao: document.getElementById("editDescricao").value,
        valor: parseFloat(document.getElementById("editValor").value),
        vencimento: document.getElementById("editVencimento").value,
        banco_id: document.getElementById("editBanco").value,
        status: document.getElementById("editStatus").value
    };
    await supabase.from("contas_pagar").update(dados).eq("id", id);
    fecharModais();
    carregarContas();
}

async function excluirConta(id) {
    if (confirm("Deseja realmente excluir?")) {
        await supabase.from("contas_pagar").delete().eq("id", id);
        carregarContas();
    }
}

document.getElementById("btnNovoPagar").onclick = () => modalNovo.style.display = "flex";
document.getElementById("btnSalvarNovoPagar").onclick = async () => {
    const item = {
        descricao: document.getElementById("novoDescricao").value,
        valor: parseFloat(document.getElementById("novoValor").value.replace(",", ".")),
        vencimento: document.getElementById("novoVencimento").value,
        banco_id: document.getElementById("novoBanco").value,
        status: "ABERTO"
    };
    await supabase.from("contas_pagar").insert([item]);
    fecharModais();
    carregarContas();
};

document.getElementById("btnAtualizarPagar").onclick = atualizarConta;
window.onclick = (e) => { if (e.target.className === "modal") fecharModais(); };

// Exportando funções para o contexto global
window.pagarConta = pagarConta; 
window.estornarPagamento = estornarPagamento;
window.abrirEditar = abrirEditar; 
window.excluirConta = excluirConta;
window.limparFiltros = limparFiltros;

// Inicialização
carregarBancos(); 
carregarContas();
