// ===============================================
// CONTAS_RECEBER.JS — DEFINITIVO
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

    document.getElementById("btnFiltrar").onclick = renderizarTabela;

    if (roleUsuario === "admin") {
        document.getElementById("btnNovoManual").onclick = abrirModalManual;
        document.getElementById("btnSalvarManual").onclick = salvarManual;
        document.getElementById("btnCancelarManual").onclick = fecharModalManual;
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
        alert("Erro ao carregar contas a receber");
        registros = [];
        return;
    }

    registros = data || [];
}

// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    tbody.innerHTML = "";

    const statusFiltro = document.getElementById("filtroStatus").value;
    const vencFiltro = document.getElementById("filtroVencimento").value;

    let total = 0;
    const hoje = new Date().toISOString().split("T")[0];

    registros.forEach(r => {
        let status = r.status;

        if (status === "ABERTO" && r.data_vencimento < hoje) {
            status = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== status) return;
        if (vencFiltro && r.data_vencimento > vencFiltro) return;

        total += Number(r.valor);

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
    await supabase.from("boletos").update({ status: "PAGO" }).eq("id", id);
    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async id => {
    await supabase.from("boletos").update({ status: "ABERTO" }).eq("id", id);
    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// MODAL MANUAL
// ===============================================
function abrirModalManual() {
    document.getElementById("modalManual").style.display = "flex";
}

function fecharModalManual() {
    document.getElementById("modalManual").style.display = "none";
}

async function salvarManual() {
    const origem = document.getElementById("origemManual").value || null;
    const valor = Number(document.getElementById("valorManual").value);
    const venc = document.getElementById("vencimentoManual").value;

    if (!valor || !venc) {
        alert("Preencha valor e vencimento");
        return;
    }

    const payload = {
        origem,
        valor,
        data_vencimento: venc + "T12:00:00", // 🔥 FIX DEFINITIVO DO DIA -1
        status: "ABERTO"
    };

    const { error } = await supabase.from("boletos").insert(payload);
    if (error) {
        alert("Erro ao salvar lançamento");
        return;
    }

    fecharModalManual();
    await carregarBoletos();
    renderizarTabela();
}
