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
    const d = new Date(data);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
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

function calcularStatus(r) {
    return (r.status || "ABERTO").toUpperCase();
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
        .select(`
            id,
            origem,
            valor,
            data_vencimento,
            status,
            nf_manual
        `)
        .order("data_vencimento");

    if (error) {
        console.error(error);
        alert("Erro ao carregar contas a receber");
        return;
    }

    registros = (boletos || []).filter(b => b.id);
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
            <tr>
                <td style="text-align:center">
                    ${r.origem || "—"}
                </td>
                <td style="text-align:center">
                    ${formatarMoeda(r.valor)}
                </td>
                <td style="text-align:center">
                    ${formatarDataBR(r.data_vencimento)}
                </td>
                <td style="text-align:center">
                    ${statusCalc}
                </td>
                <td style="text-align:center">
                    ${
                        roleUsuario === "admin"
                            ? statusCalc === "ABERTO"
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

// ===============================================
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
        console.error("ERRO SUPABASE:", error.message);
        alert(error.message);
        return;
    }

    fecharModalManual();
    await carregarDados();
    renderizarTabela();
}

// ===============================================
// AÇÕES ADMIN — NÃO ALTERADAS
// ===============================================
window.pagar = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Confirmar pagamento?")) return;

    await supabase.from("boletos")
        .update({ status: "PAGO" })
        .eq("id", id);

    await carregarDados();
    renderizarTabela();
};

window.reabrir = async function (id) {
    if (roleUsuario !== "admin") return;
    if (!confirm("Reabrir este boleto?")) return;

    await supabase.from("boletos")
        .update({ status: "ABERTO" })
        .eq("id", id);

    await carregarDados();
    renderizarTabela();
};
