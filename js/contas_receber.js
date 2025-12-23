// ===============================================
// CONTAS_RECEBER.JS — ESTÁVEL / DEFINITIVO
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
// UTIL
// ===============================================
function soData(iso) {
    return iso ? String(iso).split("T")[0] : "";
}

function formatarDataBR(dataISO) {
    const d = soData(dataISO);
    if (!d) return "—";
    const [y, m, d2] = d.split("-");
    return `${d2}/${m}/${y}`;
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined) return "—";
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function hojeISO() {
    return new Date().toISOString().split("T")[0];
}

function brParaISO(dataBR) {
    const [d, m, y] = dataBR.split("/");
    return `${y}-${m}-${d}`;
}

// ===============================================
// INIT
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", renderizarTabela);

    const btnManual = document.getElementById("btnNovoManual");
    if (btnManual && roleUsuario === "admin") {
        btnManual.addEventListener("click", abrirLancamentoManual);
    }

    await carregarBoletos();
    renderizarTabela();
});

// ===============================================
// DADOS
// ===============================================
async function carregarBoletos() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento");

    if (error) {
        console.error("Erro ao carregar boletos:", error);
        registros = [];
        return;
    }

    registros = data || [];
}

// ===============================================
// TABELA
// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";
    let total = 0;
    const hoje = hojeISO();

    registros.forEach(r => {
        let statusCalc = r.status || "ABERTO";

        if (statusCalc === "ABERTO" && soData(r.data_vencimento) < hoje) {
            statusCalc = "VENCIDO";
        }

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

    const totalSpan = document.getElementById("totalReceber");
    if (totalSpan) totalSpan.textContent = formatarMoeda(total);
}

// ===============================================
// AÇÕES
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
// PAGAR
// ===============================================
window.marcarPago = async (id) => {
    if (!confirm("Marcar como pago?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({
            status: "PAGO",
            data_pagamento: `${hojeISO()}T12:00:00`
        })
        .eq("id", id);

    if (error) {
        alert("❌ Erro ao marcar como pago (policy)");
        console.error(error);
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// REABRIR (VOLTA PAGAMENTO)
// ===============================================
window.reabrir = async (id) => {
    if (!confirm("Deseja reabrir este lançamento?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({
            status: "ABERTO",
            data_pagamento: null
        })
        .eq("id", id);

    if (error) {
        alert("❌ Erro ao reabrir (policy)");
        console.error(error);
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// LANÇAMENTO MANUAL (dd/mm/aaaa)
// ===============================================
async function abrirLancamentoManual() {
    const origem = prompt("Origem (ex: 6231A, NF-2025):");
    if (origem === null) return;

    const valorTxt = prompt("Valor (ex: 15880,50):");
    if (!valorTxt) return;

    const valor = Number(valorTxt.replace(".", "").replace(",", "."));
    if (isNaN(valor)) {
        alert("Valor inválido");
        return;
    }

    const vencBR = prompt("Vencimento (dd/mm/aaaa):");
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(vencBR)) {
        alert("Data inválida. Use dd/mm/aaaa");
        return;
    }

    const vencISO = brParaISO(vencBR);

    const { error } = await supabase
        .from("boletos")
        .insert({
            origem,
            valor,
            data_vencimento: `${vencISO}T12:00:00`,
            status: "ABERTO"
        });

    if (error) {
        alert("❌ Erro ao lançar manualmente");
        console.error(error);
        return;
    }

    await carregarBoletos();
    renderizarTabela();
}
