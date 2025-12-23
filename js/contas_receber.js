// ===============================================
// CONTAS_RECEBER.JS — BOLETOS (ORIGEM)
// PAGAR + REABRIR (ADMIN)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
function formatarDataBR(data) {
    if (!data) return "—";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return "—";
    return n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function soDataISO(value) {
    if (!value) return "";
    return String(value).includes("T")
        ? String(value).split("T")[0]
        : String(value);
}

// ===============================================
// STATUS REAL (ABERTO / VENCIDO / PAGO)
// ===============================================
function calcularStatus(r) {
    if (r.status === "PAGO") return "PAGO";

    if (r.status === "ABERTO" && r.data_vencimento) {
        const hojeISO = new Date().toISOString().split("T")[0];
        if (r.data_vencimento < hojeISO) {
            return "VENCIDO";
        }
    }

    return "ABERTO";
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar").onclick = aplicarFiltros;
    document.getElementById("btnNovoManual").onclick = abrirModalManual;
    document.getElementById("btnCancelarManual").onclick = fecharModalManual;
    document.getElementById("btnSalvarManual").onclick = salvarLancamentoManual;

    await carregarDados();
    renderizarTabela();
});

// ===============================================
async function carregarDados() {
    registros = [];

    const { data: boletos, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento");

    if (error) {
        alert("Erro ao carregar contas a receber");
        console.error(error);
        return;
    }

    registros = boletos || [];
}

// ===============================================
async function aplicarFiltros() {
    await carregarDados();
    renderizarTabela();
}

// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    tbody.innerHTML = "";

    const statusFiltro = document.getElementById("filtroStatus").value;
    const vencimentoFiltro = soDataISO(
        document.getElementById("filtroVencimento").value
    );

    let total = 0;

    registros.forEach(r => {
        const statusCalc = calcularStatus(r);
        const vencISO = soDataISO(r.data_vencimento);

        if (statusFiltro && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && vencISO && vencISO > vencimentoFiltro) return;

        total += Number(r.valor) || 0;

        tbody.innerHTML += `
            <tr class="${statusCalc === "VENCIDO" ? "vencido" : ""}">
                <td style="text-align:center">${r.origem || "—"}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalc}</td>
                <td style="text-align:center">
                    ${
                        roleUsuario === "admin"
                            ? statusCalc === "ABERTO" || statusCalc === "VENCIDO"
                                ? `<button class="btn-verde" onclick="pagar(${r.id})">Pagar</button>`
                                : `<button class="btn-vermelho" onclick="reabrir(${r.id})">Reabrir</button>`
                            : "—"
                    }
                </td>
            </tr>
        `;
    });

    document.getElementById("totalReceber").textContent =
        formatarMoeda(total);
}

// ===============================================
// MODAL LANÇAMENTO MANUAL
// ===============================================
function abrirModalManual() {
    document.getElementById("modalManual").style.display = "flex";
}

function fecharModalManual() {
    document.getElementById("modalManual").style.display = "none";
}

async function salvarLancamentoManual() {
    if (roleUsuario !== "admin") return;

    const origem = document.getElementById("origemManual").value.trim();
    const valor = Number(document.getElementById("valorManual").value);
    const vencimento = document.getElementById("vencimentoManual").value;

    if (!origem || !valor || !vencimento) {
        alert("Informe origem, valor e vencimento.");
        return;
    }

    const { error } = await supabase
        .from("boletos")
        .insert([{
            origem,
            valor,
            data_vencimento: vencimento,
            status: "ABERTO",
            tipo_nf: "SEM_NF",
            nf_manual: "SIM"
        }]);

    if (error) {
        alert(error.message);
        return;
    }

    fecharModalManual();
    await carregarDados();
    renderizarTabela();
}

// ===============================================
// AÇÕES ADMIN
// ===============================================
window.pagar = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Confirmar pagamento?")) return;

    await supabase.from("boletos").update({ status: "PAGO" }).eq("id", id);
    await carregarDados();
    renderizarTabela();
};

window.reabrir = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Reabrir este boleto?")) return;

    await supabase.from("boletos").update({ status: "ABERTO" }).eq("id", id);
    await carregarDados();
    renderizarTabela();
};
