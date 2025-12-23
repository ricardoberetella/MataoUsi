// ===============================================
// CONTAS_RECEBER.JS — DEFINITIVO
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===================== UTIL =====================
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

// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", renderizarTabela);
    document.getElementById("btnNovoManual")?.addEventListener("click", abrirModalManual);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);
    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModalManual);

    await carregarBoletos();
    renderizarTabela();
});

// ===================== LOAD =====================
async function carregarBoletos() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento");

    if (error) {
        alert("Erro ao carregar boletos");
        registros = [];
        return;
    }

    registros = data || [];
}

// ===================== TABELA =====================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";
    let total = 0;
    const hoje = hojeISO();

    registros.forEach(r => {
        let statusCalc = r.status;
        if (r.status === "ABERTO" && soData(r.data_vencimento) < hoje) {
            statusCalc = "VENCIDO";
        }

        total += Number(r.valor || 0);

        tbody.innerHTML += `
            <tr>
                <td>${r.origem}</td>
                <td>${formatarMoeda(r.valor)}</td>
                <td>${formatarDataBR(r.data_vencimento)}</td>
                <td>${statusCalc}</td>
                <td>${renderizarAcoes(r)}</td>
            </tr>
        `;
    });

    document.getElementById("totalReceber").textContent = formatarMoeda(total);
}

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

// ===================== AÇÕES =====================
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
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async (id) => {
    if (!confirm("Reabrir este lançamento?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({
            status: "ABERTO",
            data_pagamento: null
        })
        .eq("id", id);

    if (error) {
        alert("Erro ao reabrir");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===================== MODAL =====================
function abrirModalManual() {
    document.getElementById("modalManual").style.display = "flex";
    document.getElementById("manOrigem").value = "";
    document.getElementById("manValor").value = "";
    document.getElementById("manVencimentoTexto").value = "";
}

function fecharModalManual() {
    document.getElementById("modalManual").style.display = "none";
}

async function salvarManual() {
    const origem = document.getElementById("manOrigem").value || null;
    const valor = Number(document.getElementById("manValor").value);
    const vencTxt = document.getElementById("manVencimentoTexto").value;

    if (!valor || !/^\d{2}\/\d{2}\/\d{4}$/.test(vencTxt)) {
        alert("Use valor válido e data dd/mm/aaaa");
        return;
    }

    const [d, m, y] = vencTxt.split("/");
    const vencISO = `${y}-${m}-${d}`;

    const { error } = await supabase.from("boletos").insert({
        origem,
        valor,
        data_vencimento: `${vencISO}T12:00:00`,
        status: "ABERTO"
    });

    if (error) {
        alert("Erro ao salvar lançamento");
        return;
    }

    fecharModalManual();
    await carregarBoletos();
    renderizarTabela();
}
