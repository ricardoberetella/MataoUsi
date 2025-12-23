// ===============================================
// CONTAS_RECEBER.JS — DEFINITIVO / ESTÁVEL
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
const hojeISO = () => new Date().toISOString().split("T")[0];

const formatarDataBR = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("T")[0].split("-");
    return `${d}/${m}/${y}`;
};

const formatarMoeda = (v) =>
    Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", renderizarTabela);
    document.getElementById("btnNovoManual")?.addEventListener("click", abrirModalManual);
    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModalManual);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);

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
        console.error("Erro ao carregar boletos:", error);
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
        let status = r.status;
        if (status === "ABERTO" && r.data_vencimento < hoje) {
            status = "VENCIDO";
        }

        total += Number(r.valor || 0);

        tbody.innerHTML += `
            <tr>
                <td>${r.origem}</td>
                <td>${formatarMoeda(r.valor)}</td>
                <td>${formatarDataBR(r.data_vencimento)}</td>
                <td>${status}</td>
                <td>${renderizarAcoes(r)}</td>
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
        console.error(error);
        alert("Erro ao marcar como pago (policy)");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async (id) => {
    if (!confirm("Reabrir este pagamento?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({
            status: "ABERTO",
            data_pagamento: null
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Erro ao reabrir pagamento");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// MODAL — LANÇAMENTO MANUAL
// ===============================================
function abrirModalManual() {
    document.getElementById("modalManual").style.display = "flex";
}

function fecharModalManual() {
    document.getElementById("modalManual").style.display = "none";
}

async function salvarManual() {
    const origem = document.getElementById("manOrigem").value;
    const valor = Number(document.getElementById("manValor").value);
    const dataTxt = document.getElementById("manVencimentoTexto").value;

    if (!valor || !dataTxt) {
        alert("Preencha todos os campos");
        return;
    }

    const [d, m, y] = dataTxt.split("/");
    const dataISO = `${y}-${m}-${d}`;

    const { error } = await supabase.from("boletos").insert({
        origem,
        valor,
        data_vencimento: `${dataISO}T12:00:00`,
        status: "ABERTO"
    });

    if (error) {
        console.error(error);
        alert("Erro ao lançar manualmente");
        return;
    }

    fecharModalManual();
    await carregarBoletos();
    renderizarTabela();
}
