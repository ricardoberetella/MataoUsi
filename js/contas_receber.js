// ===============================================
// CONTAS_RECEBER.JS — ORIGEM NA COLUNA "NF"
// + PAGAR/REABRIR (ADMIN)
// + LANÇAMENTO MANUAL (MODAL)
// + DATA SEM “-1 DIA” (SALVA T12:00:00)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
function soData(iso) {
    if (!iso) return "";
    return String(iso).split("T")[0];
}

function formatarDataBR(dataISO) {
    const d = soData(dataISO);
    if (!d) return "—";
    const [yyyy, mm, dd] = d.split("-");
    return `${dd}/${mm}/${yyyy}`;
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function hojeISO() {
    return new Date().toISOString().split("T")[0];
}

function parseDataFlexivelParaISO(inputTexto, inputDate) {
    // prioridade: date picker
    const dPicker = (inputDate || "").trim();
    if (dPicker) return dPicker; // já vem YYYY-MM-DD

    const t = (inputTexto || "").trim();
    if (!t) return "";

    // aceita "dd/mm/aaaa"
    const m1 = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

    // aceita "aaaa-mm-dd"
    const m2 = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return t;

    return "__INVALID__";
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", () => {
        renderizarTabela();
    });

    // Botão manual (somente admin)
    const btnManual = document.getElementById("btnNovoManual");
    if (btnManual) {
        if (roleUsuario !== "admin") {
            btnManual.style.display = "none";
        } else {
            btnManual.addEventListener("click", abrirModalManual);
        }
    }

    // Modal manual
    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModalManual);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);

    // Fecha modal clicando fora
    document.getElementById("modalManual")?.addEventListener("click", (e) => {
        if (e.target?.id === "modalManual") fecharModalManual();
    });

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
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoFiltro = document.getElementById("filtroVencimento")?.value || "";

    let total = 0;
    const hoje = hojeISO();

    registros.forEach(r => {
        let statusCalc = (r.status || "ABERTO").toUpperCase();

        // vencido automático
        if (statusCalc === "ABERTO" && soData(r.data_vencimento) && soData(r.data_vencimento) < hoje) {
            statusCalc = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && soData(r.data_vencimento) && soData(r.data_vencimento) > vencimentoFiltro) return;

        total += Number(r.valor || 0);

        tbody.innerHTML += `
            <tr>
                <!-- NF = ORIGEM -->
                <td style="text-align:center">${r.origem || "—"}</td>

                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalc}</td>
                <td style="text-align:center">${renderizarAcoes(r, statusCalc)}</td>
            </tr>
        `;
    });

    const totalSpan = document.getElementById("totalReceber");
    if (totalSpan) totalSpan.textContent = formatarMoeda(total);
}

// ===============================================
function renderizarAcoes(r, statusCalc) {
    if (roleUsuario !== "admin") return "—";

    const statusBanco = (r.status || "ABERTO").toUpperCase();

    if (statusBanco === "ABERTO") {
        return `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`;
    }

    if (statusBanco === "PAGO") {
        return `<button class="btn-azul" onclick="reabrir(${r.id})">Reabrir</button>`;
    }

    // se for VENCIDO no cálculo mas no banco ainda ABERTO, deixa pagar
    if (statusCalc === "VENCIDO" && statusBanco === "ABERTO") {
        return `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`;
    }

    return "—";
}

// ===============================================
window.marcarPago = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Marcar como pago?")) return;

    // tenta com data_pagamento (se existir). Se não existir, tenta só status.
    let resp = await supabase
        .from("boletos")
        .update({ status: "PAGO", data_pagamento: `${hojeISO()}T12:00:00` })
        .eq("id", id);

    if (resp.error) {
        // fallback (caso coluna data_pagamento não exista)
        resp = await supabase
            .from("boletos")
            .update({ status: "PAGO" })
            .eq("id", id);
    }

    if (resp.error) {
        console.error(resp.error);
        alert("Erro ao marcar como pago");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Reabrir este lançamento?")) return;

    // tenta limpar data_pagamento (se existir). Se não existir, só status.
    let resp = await supabase
        .from("boletos")
        .update({ status: "ABERTO", data_pagamento: null })
        .eq("id", id);

    if (resp.error) {
        resp = await supabase
            .from("boletos")
            .update({ status: "ABERTO" })
            .eq("id", id);
    }

    if (resp.error) {
        console.error(resp.error);
        alert("Erro ao reabrir lançamento");
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

    // limpa campos
    document.getElementById("manOrigem").value = "";
    document.getElementById("manValor").value = "";
    document.getElementById("manVencimentoTexto").value = "";
    document.getElementById("manVencimentoDate").value = "";

    modal.style.display = "flex";
}

function fecharModalManual() {
    const modal = document.getElementById("modalManual");
    if (!modal) return;
    modal.style.display = "none";
}

async function salvarManual() {
    if (roleUsuario !== "admin") return;

    const origem = (document.getElementById("manOrigem")?.value || "").trim() || null;
    const valorStr = (document.getElementById("manValor")?.value || "").trim();
    const vencTexto = (document.getElementById("manVencimentoTexto")?.value || "").trim();
    const vencDate = (document.getElementById("manVencimentoDate")?.value || "").trim();

    const valor = Number(valorStr);
    if (!valor || Number.isNaN(valor)) {
        alert("Informe um valor válido.");
        return;
    }

    const vencISO = parseDataFlexivelParaISO(vencTexto, vencDate);
    if (!vencISO) {
        alert("Informe o vencimento.");
        return;
    }
    if (vencISO === "__INVALID__") {
        alert("Data inválida. Use dd/mm/aaaa ou selecione no calendário.");
        return;
    }

    // salva com T12:00:00 para não virar “um dia anterior”
    const payload = {
        origem,
        valor,
        data_vencimento: `${vencISO}T12:00:00`,
        status: "ABERTO"
    };

    const { error } = await supabase
        .from("boletos")
        .insert(payload);

    if (error) {
        console.error(error);
        alert("Erro ao lançar manualmente");
        return;
    }

    fecharModalManual();
    await carregarBoletos();
    renderizarTabela();
}
