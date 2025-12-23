// ===============================================
// CONTAS_RECEBER.JS — ORIGEM CORRETA
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    return dataISO.split("T")[0].split("-").reverse().join("/");
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

    await carregarBoletos();
    renderizarTabela();
});

// ===============================================
async function carregarBoletos() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
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

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">${r.origem || "—"}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalc}</td>
                <td style="text-align:center">${renderizarAcoes(r)}</td>
            </tr>
        `;
    });

    document.getElementById("totalReceber").textContent = formatarMoeda(total);
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
window.marcarPago = async id => {
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

window.reabrir = async id => {
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
// LANÇAMENTO MANUAL — VALIDADO (NÃO SOME)
// ===============================================
async function lancamentoManual() {

    const origem = prompt("Origem do lançamento (ex: 6231A, NF-ANTIGA-2022):");
    if (origem === null) return;

    const valorStr = prompt("Valor (ex: 6580,76):");
    if (valorStr === null) return;

    const venc = prompt("Data de vencimento (AAAA-MM-DD):");
    if (venc === null) return;

    // valida data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) {
        alert("Data inválida. Use o formato AAAA-MM-DD");
        return;
    }

    const valor = Number(valorStr.replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
        alert("Valor inválido");
        return;
    }

    const { error } = await supabase.from("boletos").insert({
        origem: origem || null,
        valor,
        data_vencimento: venc + "T12:00:00", // evita -1 dia
        status: "ABERTO"
    });

    if (error) {
        console.error(error);
        alert("Erro ao lançar manualmente (verifique permissões)");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
}
