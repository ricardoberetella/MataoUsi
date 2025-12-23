// ===============================================
// CONTAS_RECEBER.JS — DEFINITIVO / ESTÁVEL
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ================= UTIL =================
const hojeISO = () => new Date().toISOString().split("T")[0];

const soData = iso => iso ? iso.split("T")[0] : "";

const formatarDataBR = iso => {
    if (!iso) return "—";
    const [y, m, d] = soData(iso).split("-");
    return `${d}/${m}/${y}`;
};

const formatarMoeda = v =>
    Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", renderizarTabela);

    if (roleUsuario === "admin") {
        document.getElementById("btnNovoManual")
            ?.addEventListener("click", abrirModalManual);
    }

    document.getElementById("btnCancelarManual")
        ?.addEventListener("click", fecharModalManual);

    document.getElementById("btnSalvarManual")
        ?.addEventListener("click", salvarManual);

    await carregarBoletos();
    renderizarTabela();
});

// ================= DADOS =================
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

// ================= TABELA =================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";
    let total = 0;

    registros.forEach(r => {
        let status = r.status || "ABERTO";
        if (status === "ABERTO" && soData(r.data_vencimento) < hojeISO()) {
            status = "VENCIDO";
        }

        total += Number(r.valor || 0);

        tbody.innerHTML += `
            <tr>
                <td>${r.origem || "—"}</td>
                <td>${formatarMoeda(r.valor)}</td>
                <td>${formatarDataBR(r.data_vencimento)}</td>
                <td>${status}</td>
                <td>${acoes(r)}</td>
            </tr>
        `;
    });

    document.getElementById("totalReceber").textContent = formatarMoeda(total);
}

const acoes = r => {
    if (roleUsuario !== "admin") return "—";

    if (r.status === "PAGO") {
        return `<button class="btn-azul" onclick="reabrir(${r.id})">Reabrir</button>`;
    }

    return `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`;
};

// ================= AÇÕES =================
window.marcarPago = async id => {
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
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async id => {
    if (!confirm("Reabrir este lançamento?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({
            status: "ABERTO",
            data_pagamento: null
        })
        .eq("id", id);

    if (error) {
        alert("Erro ao reabrir (policy)");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ================= MODAL MANUAL =================
function abrirModalManual() {
    document.getElementById("modalManual").style.display = "flex";
}

function fecharModalManual() {
    document.getElementById("modalManual").style.display = "none";
}

async function salvarManual() {
    const origem = document.getElementById("manOrigem").value || null;
    const valor = Number(document.getElementById("manValor").value);
    const venc = document.getElementById("manVencimentoDate").value;

    if (!valor || !venc) {
        alert("Preencha valor e vencimento");
        return;
    }

    const { error } = await supabase.from("boletos").insert({
        origem,
        valor,
        data_vencimento: `${venc}T12:00:00`,
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
