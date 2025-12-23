// ===============================================
// CONTAS_RECEBER.JS — ESTÁVEL / À PROVA DE ERRO
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

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

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", renderizarTabela);

    const btnManual = document.getElementById("btnNovoManual");
    if (btnManual && roleUsuario === "admin") {
        btnManual.addEventListener("click", abrirModalManual);
    }

    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModalManual);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);

    await carregarBoletos();
    renderizarTabela();
});

// ===============================================
// CARREGAR BOLETOS
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
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// MODAL — LANÇAMENTO MANUAL (BLINDADO)
// ===============================================
function abrirModalManual() {
    const modal = document.getElementById("modalManual");
    if (!modal) {
        alert("Modal não encontrado no HTML");
        return;
    }

    const origem = document.getElementById("manOrigem");
    const valor = document.getElementById("manValor");
    const vencTxt = document.getElementById("manVencimentoTexto");
    const vencDate = document.getElementById("manVencimentoDate");

    if (origem) origem.value = "";
    if (valor) valor.value = "";
    if (vencTxt) vencTxt.value = "";
    if (vencDate) vencDate.value = "";

    modal.style.display = "flex";
}

function fecharModalManual() {
    const modal = document.getElementById("modalManual");
    if (modal) modal.style.display = "none";
}

// ===============================================
async function salvarManual() {
    const origem = document.getElementById("manOrigem")?.value || null;
    const valor = Number(document.getElementById("manValor")?.value);
    const vencTxt = document.getElementById("manVencimentoTexto")?.value || "";
    const vencDate = document.getElementById("manVencimentoDate")?.value || "";

    if (!valor || Number.isNaN(valor)) {
        alert("Valor inválido");
        return;
    }

    let vencISO = "";
    if (vencDate) {
        vencISO = vencDate;
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(vencTxt)) {
        const [d, m, y] = vencTxt.split("/");
        vencISO = `${y}-${m}-${d}`;
    } else {
        alert("Data inválida (use dd/mm/aaaa ou seletor)");
        return;
    }

    const { error } = await supabase
        .from("boletos")
        .insert({
            origem,
            valor,
            data_vencimento: `${vencISO}T12:00:00`,
            status: "ABERTO"
        });

    if (error) {
        alert("Erro ao lançar manualmente");
        return;
    }

    fecharModalManual();
    await carregarBoletos();
    renderizarTabela();
}
