// Acessa o cliente já criado no HTML
var supabase = window.supabaseClient;

// Referências da Tabela e Modais
const tabela = document.getElementById("listaPagar");
const modalNovo = document.getElementById("modalNovoPagar");
const modalTransfer = document.getElementById("modalTransferencia");
const modalNF = document.getElementById("modalNfEntrada");

// Formatação de valores
function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Formatação de data (AAAA-MM-DD -> DD/MM/AAAA)
function dataBR(data) {
    if (!data) return "-";
    const partes = data.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// 1. CARREGAR SELECTS DE BANCOS
async function carregarBancos() {
    const { data, error } = await supabase.from("bancos").select("id, nome").order("nome");
    if (error) return console.error("Erro bancos:", error);

    const selects = ["novoBanco", "nfBanco", "transferBancoOrigem", "transferBancoDestino"];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join("");
        }
    });
}

// 2. CARREGAR LISTA DE CONTAS
async function carregarContas() {
    const { data, error } = await supabase
        .from("contas_pagar")
        .select("*, bancos(nome)")
        .order("vencimento", { ascending: false });

    if (error) return console.error("Erro contas:", error);

    tabela.innerHTML = "";
    if (!data || data.length === 0) {
        tabela.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    data.forEach(l => {
        const tr = document.createElement("tr");
        const ePago = l.status === 'PAGO';

        tr.innerHTML = `
            <td>${dataBR(l.vencimento)}</td>
            <td>${l.bancos?.nome || "-"}</td>
            <td>${l.descricao}</td>
            <td>-</td>
            <td class="valor-saida">${moeda(l.valor)}</td>
            <td style="font-weight:bold; color: ${ePago ? '#22c55e' : '#f39c12'}">${l.status}</td>
            <td>
                ${!ePago 
                    ? `<button onclick="marcarPago('${l.id}')" class="btn btn-verde">Pagar</button>` 
                    : `<span style="color:#22c55e;">✓ Pago</span>`}
            </td>
        `;
        tabela.appendChild(tr);
    });
}

// 3. SALVAR LANÇAMENTO
async function salvarNovoPagar() {
    const desc = document.getElementById("novoDescricao").value;
    const valorRaw = document.getElementById("novoValor").value;
    const valor = parseFloat(valorRaw.replace(",", "."));
    const venc = document.getElementById("novoVencimento").value;
    const banco = document.getElementById("novoBanco").value;

    if (!desc || isNaN(valor) || !venc) {
        alert("Preencha todos os campos!");
        return;
    }

    const { error } = await supabase.from("contas_pagar").insert([{
        descricao: desc,
        valor: valor,
        vencimento: venc,
        banco_id: banco,
        status: "ABERTO"
    }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        modalNovo.style.display = "none";
        // Limpar inputs
        document.getElementById("novoDescricao").value = "";
        document.getElementById("novoValor").value = "";
        carregarContas();
    }
}

// 4. MARCAR COMO PAGO
async function marcarPago(id) {
    const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (error) alert("Erro ao atualizar.");
    else carregarContas();
}

// --- EVENTOS DE CLIQUE ---

// Abrir Modais
document.getElementById("btnNovoPagar").onclick = () => modalNovo.style.display = "flex";
document.getElementById("btnTransferir").onclick = () => {
    if(modalTransfer) modalTransfer.style.display = "flex";
    else alert("Modal de transferência em construção");
};
document.getElementById("btnNfEntrada").onclick = () => {
    if(modalNF) modalNF.style.display = "flex";
};

// Fechar Modais
document.getElementById("btnCancelarNovoPagar").onclick = () => modalNovo.style.display = "none";

// Salvar
document.getElementById("btnSalvarNovoPagar").onclick = salvarNovoPagar;

// Fechar ao clicar fora da caixa
window.onclick = (e) => {
    if (e.target.className === "modal") e.target.style.display = "none";
};

// Exportar para o escopo global (para o onclick do botão funcionar)
window.marcarPago = marcarPago;

// Início
carregarBancos();
carregarContas();
