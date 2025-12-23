// ===============================================
// CONTAS_RECEBER.JS — ESTÁVEL E FUNCIONAL
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
    if (valor === null || valor === undefined) return "—";
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

    // FILTRAR
    document.getElementById("btnFiltrar")?.addEventListener("click", renderizarTabela);

    // LANÇAMENTO MANUAL — SEM TRAVA
    const btnManual = document.getElementById("btnNovoManual");
    if (btnManual) {
        btnManual.addEventListener("click", () => {
            if (roleUsuario !== "admin") {
                alert("Sem permissão");
                return;
            }
            lancamentoManual();
        });
    }

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
    const hoje = new Date().toISOString().split("T")[0];

    registros.forEach(r => {
        let statusCalc = r.status || "ABERTO";

        if (statusCalc === "ABERTO" && r.data_vencimento < hoje) {
            statusCalc = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== "Todos" && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && r.data_vencimento > vencimentoFiltro) return;

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

    const totalSpan = document.getElementById("totalReceber");
    if (totalSpan) totalSpan.textContent = formatarMoeda(total);
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
// FUNÇÕES GLOBAIS (OBRIGATÓRIO)
// ===============================================
window.marcarPago = async function (id) {
    if (roleUsuario !== "admin") return;

    if (!confirm("Marcar como pago?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (error) {
        alert("Erro ao marcar como pago");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async function (id) {
    if (roleUsuario !== "admin") return;

    if (!confirm("Reabrir este lançamento?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({ status: "ABERTO" })
        .eq("id", id);

    if (error) {
        alert("Erro ao reabrir");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// LANÇAMENTO MANUAL — PROMPT ESTÁVEL
// ===============================================
async function lancamentoManual() {
    const origem = prompt("Origem (ex: 6231A, NF-ANTIGA-2022):");
    const valorStr = prompt("Valor:");
    const dataBR = prompt("Vencimento (DD/MM/AAAA):");

    if (!valorStr || !dataBR) {
        alert("Valor e vencimento são obrigatórios");
        return;
    }

    const partes = dataBR.split("/");
    if (partes.length !== 3) {
        alert("Data inválida. Use DD/MM/AAAA");
        return;
    }

    const dataISO = `${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`;

    const { error } = await supabase.from("boletos").insert({
        origem: origem || null,
        valor: Number(valorStr.replace(",", ".")),
        data_vencimento: dataISO,
        status: "ABERTO"
    });

    if (error) {
        alert("Erro ao lançar manualmente");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
}
