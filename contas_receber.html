// ===============================================
// CONTAS_RECEBER.JS — BOLETOS (ORIGEM)
// PAGAR + REABRIR (ADMIN) + PDF
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
    return value;
}

// ===============================================
function calcularStatus(r) {
    if (r.status === "PAGO") return "PAGO";

    const hojeISO = new Date().toISOString().split("T")[0];
    if (r.status === "ABERTO" && r.data_vencimento < hojeISO) {
        return "VENCIDO";
    }

    return "ABERTO";
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar").onclick = aplicarFiltros;
    document.getElementById("btnGerarPdf").onclick = gerarPdf;

    await carregarDados();
    renderizarTabela();
});

// ===============================================
async function carregarDados() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento");

    if (error) {
        alert("Erro ao carregar dados");
        console.error(error);
        return;
    }

    registros = data || [];
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

        if (statusFiltro && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && r.data_vencimento > vencimentoFiltro) return;

        total += Number(r.valor) || 0;

        tbody.innerHTML += `
            <tr class="${statusCalc === "VENCIDO" ? "vencido" : ""}">
                <td>${r.origem || "—"}</td>
                <td>${formatarMoeda(r.valor)}</td>
                <td>${formatarDataBR(r.data_vencimento)}</td>
                <td>${statusCalc}</td>
                <td>
                    ${
                        roleUsuario === "admin"
                            ? statusCalc === "ABERTO" || statusCalc === "VENCIDO"
                                ? `<button class="btn-verde">Pagar</button>`
                                : `<button class="btn-vermelho">Reabrir</button>`
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
// GERAR PDF (PADRÃO SISTEMA)
// ===============================================
function gerarPdf() {
    document.body.classList.add("modo-pdf");

    document.getElementById("dataHoraPdf").textContent =
        new Date().toLocaleString("pt-BR");

    const area = document.getElementById("areaPdf");

    html2pdf().set({
        margin: 8,
        filename: "contas_a_receber.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    }).from(area).save().then(() => {
        document.body.classList.remove("modo-pdf");
    });
}
