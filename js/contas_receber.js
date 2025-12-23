// ===============================================
// CONTAS_RECEBER.JS — BOLETOS (ORIGEM)
// PAGAR + REABRIR (ADMIN) + LANÇAMENTO MANUAL
// VENCIDO (cálculo) + PDF
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
function formatarMoeda(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function soDataISO(value) {
    if (!value) return "";
    const s = String(value);
    return s.includes("T") ? s.split("T")[0] : s;
}

function formatarDataBR(iso) {
    const d = soDataISO(iso);
    if (!d || !d.includes("-")) return "—";
    const [ano, mes, dia] = d.split("-");
    return `${dia}/${mes}/${ano}`;
}

function hojeISOlocal() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ===============================================
// STATUS (ABERTO / VENCIDO / PAGO)
// ===============================================
function calcularStatus(r) {
    const st = String(r.status || "ABERTO").toUpperCase();
    if (st === "PAGO") return "PAGO";

    const venc = soDataISO(r.data_vencimento);
    if (venc) {
        const hoje = hojeISOlocal();
        if (venc < hoje) return "VENCIDO";
    }
    return "ABERTO";
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    // 🔑 LINHA CORRETA (role)
    roleUsuario = user.user_metadata?.role || "viewer";

    // ===============================================
    // 🔒 CONTROLE VISUAL – VIEWER
    // ===============================================
    if (roleUsuario !== "admin") {

        // ❌ esconder botão Lançamento Manual
        const btnNovoManual = document.getElementById("btnNovoManual");
        if (btnNovoManual) btnNovoManual.style.display = "none";

        // ❌ esconder coluna Ações (via CSS)
        document.body.classList.add("viewer");
    }

    // ===============================================
    // EVENTOS
    // ===============================================
    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = aplicarFiltros;

    const btnNovoManual = document.getElementById("btnNovoManual");
    if (btnNovoManual) btnNovoManual.onclick = abrirModalManual;

    const btnCancelarManual = document.getElementById("btnCancelarManual");
    if (btnCancelarManual) btnCancelarManual.onclick = fecharModalManual;

    const btnSalvarManual = document.getElementById("btnSalvarManual");
    if (btnSalvarManual) btnSalvarManual.onclick = salvarLancamentoManual;

    const btnGerarPDF = document.getElementById("btnGerarPDF");
    if (btnGerarPDF) btnGerarPDF.onclick = gerarPDF;

    await carregarDados();
    renderizarTabela();
});

// ===============================================
async function carregarDados() {
    const { data: boletos, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento");

    if (error) {
        console.error("Erro boletos:", error);
        alert("Erro ao carregar contas a receber");
        registros = [];
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
    if (!tbody) return;

    tbody.innerHTML = "";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoFiltro = soDataISO(
        document.getElementById("filtroVencimento")?.value || ""
    );

    let total = 0;

    registros.forEach(r => {
        const statusCalc = calcularStatus(r);
        const vencISO = soDataISO(r.data_vencimento);

        if (statusFiltro && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && vencISO && vencISO > vencimentoFiltro) return;

        total += Number(r.valor) || 0;

        const classeVencido = statusCalc === "VENCIDO" ? "vencido" : "";

        tbody.innerHTML += `
            <tr class="${classeVencido}">
                <td style="text-align:center">${r.origem || "—"}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalc}</td>
                <td style="text-align:center">
                    ${
                        roleUsuario === "admin"
                            ? (statusCalc === "ABERTO" || statusCalc === "VENCIDO")
                                ? `<button class="btn-verde" onclick="pagar(${r.id})">Pagar</button>`
                                : `<button class="btn-vermelho" onclick="reabrir(${r.id})">Reabrir</button>`
                            : "—"
                    }
                </td>
            </tr>
        `;
    });

    const totalEl = document.getElementById("totalReceber");
    if (totalEl) totalEl.textContent = formatarMoeda(total);
}

// ===============================================
// MODAL LANÇAMENTO MANUAL
// ===============================================
function abrirModalManual() {
    const modal = document.getElementById("modalManual");
    if (modal) modal.style.display = "flex";
}

function fecharModalManual() {
    const modal = document.getElementById("modalManual");
    if (modal) modal.style.display = "none";
}

async function salvarLancamentoManual() {
    if (roleUsuario !== "admin") {
        alert("Somente ADMIN pode lançar manualmente.");
        return;
    }

    const origem = (document.getElementById("origemManual")?.value || "").trim();
    const valor = Number(document.getElementById("valorManual")?.value || 0);
    const vencimento = document.getElementById("vencimentoManual")?.value || "";

    if (!origem || !valor || !vencimento) {
        alert("Informe origem, valor e vencimento.");
        return;
    }

    const payload = {
        origem,
        valor,
        data_vencimento: vencimento,
        status: "ABERTO",
        tipo_nf: "SEM_NF",
        nf_manual: "SIM",
    };

    const { error } = await supabase.from("boletos").insert([payload]);

    if (error) {
        console.error("Erro lançamento manual:", error);
        alert(error.message);
        return;
    }

    document.getElementById("origemManual").value = "";
    document.getElementById("valorManual").value = "";
    document.getElementById("vencimentoManual").value = "";

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

    const { error } = await supabase
        .from("boletos")
        .update({ status: "PAGO" })
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
    if (!confirm("Reabrir este boleto?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({ status: "ABERTO" })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Erro ao reabrir boleto");
        return;
    }

    await carregarDados();
    renderizarTabela();
};

// ===============================================
// GERAR PDF
// ===============================================
function gerarPDF() {
    const area = document.getElementById("areaPdf");
    if (!area) return;

    document.body.classList.add("modo-pdf");

    const opt = {
        margin: 8,
        filename: `contas_a_receber_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    document.getElementById("dataHoraPdf").textContent =
        new Date().toLocaleString("pt-BR");

    html2pdf()
        .set(opt)
        .from(area)
        .save()
        .finally(() => {
            document.body.classList.remove("modo-pdf");
        });
}
