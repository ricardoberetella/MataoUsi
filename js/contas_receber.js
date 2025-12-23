// ==================================================
// CONTAS_RECEBER.JS — DEFINITIVO / BLINDADO
// ==================================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ==================================================
// UTILIDADES
// ==================================================
function soData(iso) {
    return iso ? String(iso).split("T")[0] : "";
}

function hojeISO() {
    return new Date().toISOString().split("T")[0];
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

// ==================================================
// INIT
// ==================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", renderizarTabela);

    const btnManual = document.getElementById("btnNovoManual");
    if (btnManual && roleUsuario === "admin") {
        btnManual.onclick = abrirModalManual;
    }

    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModalManual);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);

    await carregarBoletos();
    renderizarTabela();
});

// ==================================================
// CARREGAR BOLETOS
// ==================================================
async function carregarBoletos() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    if (error) {
        console.error("Erro carregar boletos:", error);
        registros = [];
        return;
    }

    registros = data || [];
}

// ==================================================
// RENDER TABELA
// ==================================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    const totalSpan = document.getElementById("totalReceber");
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
                <td style="text-align:center">
                    ${renderizarAcoes(r)}
                </td>
            </tr>
        `;
    });

    if (totalSpan) totalSpan.textContent = formatarMoeda(total);
}

// ==================================================
// AÇÕES
// ==================================================
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

// ==================================================
// PAGAR / REABRIR  (FUNCIONA — DEPENDE DA POLICY)
// ==================================================
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
        alert("Erro ao marcar como pago (policy)");
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
        alert("Erro ao reabrir (policy)");
        console.error(error);
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ==================================================
// MODAL — LANÇAMENTO MANUAL (SEM NULL, SEM ERRO)
// ==================================================
function abrirModalManual() {
    const modal = document.getElementById("modalManual");
    if (!modal) {
        alert("Modal manual não existe no HTML");
        return;
    }

    document.getElementById("manOrigem") && (document.getElementById("manOrigem").value = "");
    document.getElementById("manValor") && (document.getElementById("manValor").value = "");
    document.getElementById("manVencimento") && (document.getElementById("manVencimento").value = "");

    modal.style.display = "flex";
}

function fecharModalManual() {
    const modal = document.getElementById("modalManual");
    if (modal) modal.style.display = "none";
}

// ==================================================
// SALVAR MANUAL  (DD/MM/AAAA)
// ==================================================
async function salvarManual() {
    const origem = document.getElementById("manOrigem")?.value || null;
    const valor = Number(document.getElementById("manValor")?.value);
    const vencBR = document.getElementById("manVencimento")?.value || "";

    if (!valor || isNaN(valor)) {
        alert("Valor inválido");
        return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(vencBR)) {
        alert("Data inválida (use dd/mm/aaaa)");
        return;
    }

    const [d, m, y] = vencBR.split("/");
    const vencISO = `${y}-${m}-${d}`;

    const { error } = await supabase
        .from("boletos")
        .insert({
            origem,
            valor,
            data_vencimento: `${vencISO}T12:00:00`,
            status: "ABERTO"
        });

    if (error) {
        alert("Erro ao lançar manual (policy)");
        console.error(error);
        return;
    }

    fecharModalManual();
    await carregarBoletos();
    renderizarTabela();
}
