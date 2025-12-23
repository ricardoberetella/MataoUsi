// ===============================================
// CONTAS_RECEBER.JS — DEFINITIVO / ESTÁVEL
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
function soData(iso) {
    return iso ? String(iso).split("T")[0] : "";
}

function formatarDataBR(iso) {
    if (!iso) return "—";
    const [y, m, d] = soData(iso).split("-");
    return `${d}/${m}/${y}`;
}

function formatarMoeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function hojeISO() {
    return new Date().toISOString().split("T")[0];
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", renderizarTabela);

    if (roleUsuario === "admin") {
        document.getElementById("btnNovoManual")
            ?.addEventListener("click", abrirModalManual);

        document.getElementById("btnSalvarManual")
            ?.addEventListener("click", salvarManual);

        document.getElementById("btnCancelarManual")
            ?.addEventListener("click", fecharModalManual);
    }

    await carregarBoletos();
    renderizarTabela();
});

// ===============================================
async function carregarBoletos() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento");

    if (error) {
        console.error(error);
        registros = [];
        return;
    }

    registros = data || [];
}

// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";
    let total = 0;
    const hoje = hojeISO();

    registros.forEach(r => {
        let status = r.status || "ABERTO";
        if (status === "ABERTO" && soData(r.data_vencimento) < hoje) {
            status = "VENCIDO";
        }

        total += Number(r.valor || 0);

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">${r.origem || "—"}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${status}</td>
                <td style="text-align:center">
                    ${renderizarAcoes(r)}
                </td>
            </tr>
        `;
    });

    document.getElementById("totalReceber").textContent =
        formatarMoeda(total);
}

// ===============================================
function renderizarAcoes(r) {
    if (roleUsuario !== "admin") return "—";

    if (r.status === "ABERTO") {
        return `<button class="btn-verde" onclick="window.marcarPago(${r.id})">Pagar</button>`;
    }

    if (r.status === "PAGO") {
        return `<button class="btn-azul" onclick="window.reabrir(${r.id})">Reabrir</button>`;
    }

    return "—";
}

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
        alert("Erro ao marcar como pago");
        console.error(error);
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async (id) => {
    if (!confirm("Reabrir lançamento?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({
            status: "ABERTO",
            data_pagamento: null
        })
        .eq("id", id);

    if (error) {
        alert("Erro ao reabrir");
        console.error(error);
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// MODAL — LANÇAMENTO MANUAL
// ===============================================
function abrirModalManual() {
    const modal = document.getElementById("modalManual");
    if (!modal) return;

    document.getElementById("manOrigem").value = "";
    document.getElementById("manValor").value = "";
    document.getElementById("manVencimentoDate").value = "";

    modal.style.display = "flex";
}

function fecharModalManual() {
    const modal = document.getElementById("modalManual");
    if (modal) modal.style.display = "none";
}

async function salvarManual() {
    const origem = document.getElementById("manOrigem").value || null;
    const valor = Number(document.getElementById("manValor").value);
    const venc = document.getElementById("manVencimentoDate").value;

    if (!valor || !venc) {
        alert("Preencha valor e vencimento");
        return;
    }

    const { error } = await supabase
        .from("boletos")
        .insert({
            origem,
            valor,
            data_vencimento: `${venc}T12:00:00`,
            status: "ABERTO"
        });

    if (error) {
        alert("Erro ao lançar manualmente");
        console.error(error);
        return;
    }

    fecharModalManual();
    await carregarBoletos();
    renderizarTabela();
}
