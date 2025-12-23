// ===============================================
// CONTAS_RECEBER.JS — COM LANÇAMENTO MANUAL + REABRIR
// (sem mexer em estoque / sem depender de boletos.status)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// Modal manual
let modalManual;
let manualNumeroNF;
let manualValor;
let manualVencimento;

function hojeISO() {
    return new Date().toISOString().split("T")[0];
}

function formatarDataBR(data) {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    // Botões
    document.getElementById("btnFiltrar")?.addEventListener("click", aplicarFiltros);

    // Modal manual (pega elementos COM SEGURANÇA)
    modalManual = document.getElementById("modalManual");
    manualNumeroNF = document.getElementById("manualNumeroNF");
    manualValor = document.getElementById("manualValor");
    manualVencimento = document.getElementById("manualVencimento");

    document.getElementById("btnNovoManual")?.addEventListener("click", abrirModalManual);
    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModalManual);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);

    // Se for viewer, não deixa lançar manual (e também não paga/reabre)
    if (roleUsuario !== "admin") {
        const btnNovoManual = document.getElementById("btnNovoManual");
        if (btnNovoManual) btnNovoManual.style.display = "none";
    }

    await carregarDados();
    renderizarTabela();
});

async function carregarDados() {
    // Lê somente da tabela contas_receber (onde tem status e data_pagamento)
    const { data, error } = await supabase
        .from("contas_receber")
        .select("id, numero_nf, valor, data_vencimento, status, data_pagamento")
        .order("data_vencimento");

    if (error) {
        console.error(error);
        alert("Erro ao carregar contas a receber");
        registros = [];
        return;
    }

    registros = data || [];
}

function aplicarFiltros() {
    renderizarTabela();
}

function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoFiltro = document.getElementById("filtroVencimento")?.value || "";

    let total = 0;
    const hoje = hojeISO();

    registros.forEach(r => {
        // Status calculado (VENCIDO automático)
        let statusCalculado = (r.status || "ABERTO").toUpperCase();
        if (statusCalculado === "ABERTO" && r.data_vencimento && r.data_vencimento < hoje) {
            statusCalculado = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== statusCalculado) return;
        if (vencimentoFiltro && r.data_vencimento && r.data_vencimento > vencimentoFiltro) return;

        total += Number(r.valor || 0);

        const podePagar = roleUsuario === "admin" && (r.status || "ABERTO").toUpperCase() !== "PAGO";
        const podeReabrir = roleUsuario === "admin" && (r.status || "").toUpperCase() === "PAGO";

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${r.numero_nf || "—"}</td>
                <td style="text-align:center;">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center;">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center;">${statusCalculado}</td>
                <td style="text-align:center;">
                    ${
                        podePagar
                            ? `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`
                            : (podeReabrir
                                ? `<button class="btn-azul" onclick="reabrir(${r.id})">Reabrir</button>`
                                : "—")
                    }
                </td>
            </tr>
        `;
    });

    const totalSpan = document.getElementById("totalReceber");
    if (totalSpan) totalSpan.textContent = formatarMoeda(total);
}

// =========================
// MODAL MANUAL
// =========================
function abrirModalManual() {
    if (roleUsuario !== "admin") return;

    if (!modalManual || !manualNumeroNF || !manualValor || !manualVencimento) {
        alert("Modal de lançamento manual não encontrado no HTML");
        return;
    }

    manualNumeroNF.value = "";
    manualValor.value = "";
    manualVencimento.value = "";

    modalManual.style.display = "flex";
}

function fecharModalManual() {
    if (!modalManual) return;
    modalManual.style.display = "none";
}

async function salvarManual() {
    if (roleUsuario !== "admin") return;

    const numero_nf = (manualNumeroNF?.value || "").trim();
    const valor = Number(manualValor?.value || 0);
    const data_vencimento = manualVencimento?.value || "";

    if (!numero_nf) {
        alert("Informe o número da NF");
        return;
    }
    if (!valor || valor <= 0) {
        alert("Informe um valor válido");
        return;
    }
    if (!data_vencimento) {
        alert("Informe o vencimento");
        return;
    }

    const payload = {
        numero_nf,
        valor,
        data_vencimento,
        status: "ABERTO",
        data_pagamento: null,
        origem: "MANUAL" // se sua tabela não tiver origem, remova esta linha
    };

    const { error } = await supabase.from("contas_receber").insert(payload);

    if (error) {
        console.error(error);
        alert("Erro ao salvar lançamento manual");
        return;
    }

    fecharModalManual();
    await carregarDados();
    renderizarTabela();
}

// =========================
// AÇÕES: PAGAR / REABRIR
// =========================
window.marcarPago = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Marcar como pago?")) return;

    const { error } = await supabase
        .from("contas_receber")
        .update({
            status: "PAGO",
            data_pagamento: hojeISO()
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Erro ao marcar como pago");
        return;
    }

    await carregarDados();
    renderizarTabela();
};

window.reabrir = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Reabrir este lançamento (voltar para ABERTO)?")) return;

    const { error } = await supabase
        .from("contas_receber")
        .update({
            status: "ABERTO",
            data_pagamento: null
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Erro ao reabrir");
        return;
    }

    await carregarDados();
    renderizarTabela();
};
