// ===============================================
// CONTAS_RECEBER.JS — NF REAL (numero_nf)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];
let mapaNotas = {}; // { id_nota: numero_nf }

// ===============================================
function formatarDataBR(data) {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined) return "—";
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", aplicarFiltros);

    const btnManual = document.getElementById("btnNovoManual");
    if (btnManual && roleUsuario === "admin") {
        btnManual.addEventListener("click", lancamentoManual);
    }

    await carregarNotas();
    await carregarBoletos();
    renderizarTabela();
});

// ===============================================
// CARREGAR MAPA DE NOTAS (id → numero_nf)
// ===============================================
async function carregarNotas() {
    const { data, error } = await supabase
        .from("notas_fiscais")
        .select("id, numero_nf");

    if (error) {
        console.error(error);
        alert("Erro ao carregar notas fiscais");
        return;
    }

    mapaNotas = {};
    (data || []).forEach(n => {
        mapaNotas[n.id] = n.numero_nf;
    });
}

// ===============================================
// CARREGAR BOLETOS
// ===============================================
async function carregarBoletos() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, valor, data_vencimento, status, nota_fiscal_id")
        .order("data_vencimento", { ascending: true });

    if (error) {
        console.error(error);
        alert("Erro ao carregar contas a receber");
        registros = [];
        return;
    }

    registros = data || [];
}

// ===============================================
function aplicarFiltros() {
    renderizarTabela();
}

// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoFiltro = document.getElementById("filtroVencimento")?.value || "";

    let total = 0;
    const hoje = new Date().toISOString().split("T")[0];

    registros.forEach(r => {
        let statusCalc = r.status || "ABERTO";

        if (statusCalc === "ABERTO" && r.data_vencimento < hoje) {
            statusCalc = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && r.data_vencimento > vencimentoFiltro) return;

        total += Number(r.valor || 0);

        const numeroNF = r.nota_fiscal_id
            ? (mapaNotas[r.nota_fiscal_id] ?? r.nota_fiscal_id)
            : "—";

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">${numeroNF}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalc}</td>
                <td style="text-align:center">
                    ${renderizarAcoes(r)}
                </td>
            </tr>
        `;
    });

    const totalSpan = document.getElementById("totalReceber");
    if (totalSpan) totalSpan.textContent = formatarMoeda(total);
}

// ===============================================
function renderizarAcoes(r) {
    if (roleUsuario !== "admin") return "—";

    if (r.status === "ABERTO") {
        return `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`;
    }

    if (r.status === "PAGO") {
        return `<button class="btn-azul" onclick="reabrir(${r.id})">Reabrir</button>`;
    }

    return "—";
}

// ===============================================
window.marcarPago = async function (id) {
    if (!confirm("Marcar como pago?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (error) {
        alert("Erro ao marcar como pago");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async function (id) {
    if (!confirm("Reabrir este lançamento?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({ status: "ABERTO" })
        .eq("id", id);

    if (error) {
        alert("Erro ao reabrir lançamento");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
async function lancamentoManual() {
    const nf = prompt("Número da NF (antiga ou manual):");
    const valor = prompt("Valor do lançamento:");
    const venc = prompt("Data de vencimento (AAAA-MM-DD):");

    if (!valor || !venc) {
        alert("Valor e vencimento são obrigatórios");
        return;
    }

    const { error } = await supabase.from("boletos").insert({
        nota_fiscal_id: nf || null,
        valor: Number(valor),
        data_vencimento: venc,
        status: "ABERTO"
    });

    if (error) {
        alert("Erro ao lançar manualmente");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
}
