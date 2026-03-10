// Usamos apenas a referência global para evitar o erro "already been declared"
var supabase = window.supabaseClient;

// Seleção de Elementos da Interface
const tabela = document.getElementById("listaPagar");
const modalNovo = document.getElementById("modalNovoPagar");
const modalTransfer = document.getElementById("modalTransferencia");
const modalNF = document.getElementById("modalNfEntrada");

// --- UTILITÁRIOS ---

function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(data) {
    if (!data) return "-";
    const partes = data.split("-"); // Espera AAAA-MM-DD
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// --- FUNÇÕES DE CARREGAMENTO ---

async function carregarBancos() {
    const { data, error } = await supabase.from("bancos").select("id, nome").order("nome");
    if (error) return console.error("Erro ao carregar bancos:", error);

    const selects = ["novoBanco", "nfBanco", "transferBancoOrigem", "transferBancoDestino"];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join("");
        }
    });
}

async function carregarContas() {
    // Buscamos os dados relacionando com a tabela bancos para pegar o nome
    const { data, error } = await supabase
        .from("contas_pagar")
        .select("*, bancos(nome)")
        .order("vencimento", { ascending: false });

    if (error) return console.error("Erro ao carregar contas:", error);

    tabela.innerHTML = "";

    if (!data || data.length === 0) {
        tabela.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhum lançamento encontrado</td></tr>`;
        return;
    }

    data.forEach(l => {
        const tr = document.createElement("tr");
        const valorFormatado = moeda(l.valor);
        
        // Na sua tabela MataoUsi, as colunas são: vencimento, bancos.nome, descricao, valor, status
        tr.innerHTML = `
            <td>${dataBR(l.vencimento)}</td>
            <td>${l.bancos?.nome || "-"}</td>
            <td>${l.descricao}</td>
            <td>-</td> 
            <td class="valor-saida">${valorFormatado}</td>
            <td style="font-weight: bold; color: ${l.status === 'PAGO' ? '#22c55e' : '#f39c12'}">${l.status}</td>
            <td>
                ${l.status !== "PAGO" 
                    ? `<button onclick="marcarPago('${l.id}')" class="btn btn-verde">Pagar</button>` 
                    : `<span style="color: #22c55e;">✓ Pago</span>`}
            </td>
        `;
        tabela.appendChild(tr);
    });
}

// --- AÇÕES DO SISTEMA ---

async function salvarNovoPagar() {
    const descricao = document.getElementById("novoDescricao").value;
    const valorRaw = document.getElementById("novoValor").value;
    const valor = parseFloat(valorRaw.replace(",", "."));
    const vencimento = document.getElementById("novoVencimento").value;
    const banco_id = document.getElementById("novoBanco").value;

    if (!descricao || !valor || !vencimento) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    const { error } = await supabase.from("contas_pagar").insert([{
        descricao,
        valor,
        vencimento,
        banco_id,
        status: "ABERTO" // Conforme visto no seu banco
    }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        modalNovo.style.display = "none";
        // Limpa campos
        document.getElementById("novoDescricao").value = "";
        document.getElementById("novoValor").value = "";
        carregarContas();
    }
}

async function marcarPago(id) {
    const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (error) {
        alert("Erro ao atualizar pagamento.");
    } else {
        carregarContas();
    }
}

// --- CONFIGURAÇÃO DOS EVENTOS (BOTÕES) ---

// Botões que abrem Modais
document.getElementById("btnNovoPagar").onclick = () => modalNovo.style.display = "flex";
document.getElementById("btnTransferir").onclick = () => modalTransfer.style.display = "flex";
document.getElementById("btnNfEntrada").onclick = () => modalNF.style.display = "flex";

// Botões que fecham Modais
document.getElementById("btnCancelarNovoPagar").onclick = () => modalNovo.style.display = "none";
document.getElementById("btnCancelarTransferencia").onclick = () => modalTransfer.style.display = "none";
document.getElementById("btnCancelarNfEntrada").onclick = () => modalNF.style.display = "none";

// Botão Salvar
document.getElementById("btnSalvarNovoPagar").onclick = salvarNovoPagar;

// --- INICIALIZAÇÃO ---

// Expõe funções ao escopo global para os botões do HTML funcionarem
window.marcarPago = marcarPago;

// Roda ao carregar a página
carregarBancos();
carregarContas();
