// ===============================================
// CONTAS_RECEBER.JS — BOLETOS + NF (numero_nf)
// PAGAR + REABRIR (ADMIN)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];
let mapaNF = {};

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

    // botão filtrar
    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = aplicarFiltros;

    // botão lançamento manual (ID OBRIGATÓRIO NO HTML)
    const btnManual = document.getElementById("btnLancamentoManual");
    if (btnManual) btnManual.onclick = lancamentoManual;

    await carregarDados();
    renderizarTabela();
});

// ===============================================
async function carregarDados() {

    // 🔒 limpa tudo antes de carregar
    registros = [];
    mapaNF = {};

    const { data: boletos, error } = await supabase
        .from("boletos")
        .select("id, valor, data_vencimento, nota_fiscal_id, status")
        .order("data_vencimento");

    if (error) {
        console.error("Erro boletos:", error);
        alert("Erro ao carregar contas a receber");
        return;
    }

    // 🔒 garante apenas registros válidos
    registros = (boletos || []).filter(b => b.id);

    // buscar numero_nf
    const idsNF = [...new Set(registros.map(r => r.nota_fiscal_id).filter(Boolean))];

    if (idsNF.length > 0) {
        const { data: notas, error: errNF } = await supabase
            .from("notas_fiscais")
            .select("id, numero_nf")
            .in("id", idsNF);

        if (!errNF && notas) {
            notas.forEach(n => {
                mapaNF[n.id] = n.numero_nf;
            });
        }
    }
}

// ===============================================
async function aplicarFiltros() {
    // 🔒 sempre recarrega do banco
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
        document.getElementById("filtroVencimento")?.value
    );

    let total = 0;

    registros.forEach(r => {
        if (!r.id) return;

        const statusCalc = calcularStatus(r);
        const vencISO = soDataISO(r.data_vencimento);

        if (statusFiltro && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && vencISO && vencISO > vencimentoFiltro) return;

        total += Number(r.valor) || 0;

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">
                    ${mapaNF[r.nota_fiscal_id] || "—"}
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

    const totalEl = document.getElementById("totalReceber");
    if (totalEl) totalEl.textContent = formatarMoeda(total);
}

// ===============================================
// LANÇAMENTO MANUAL — CIRÚRGICO
// ===============================================
async function lancamentoManual() {
    if (roleUsuario !== "admin") {
        alert("Apenas ADMIN pode lançar manualmente.");
        return;
    }

    const valorStr = prompt("Valor (ex: 2079.00):");
    if (!valorStr) return;

    const vencStr = prompt("Vencimento (YYYY-MM-DD) ex: 2025-02-03:");
    if (!vencStr) return;

    const valor = Number(String(valorStr).replace(",", "."));
    if (Number.isNaN(valor) || valor <= 0) {
        alert("Valor inválido.");
        return;
    }

    const iso = String(vencStr).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        alert("Data inválida. Use YYYY-MM-DD.");
        return;
    }

    const { error } = await supabase
        .from("boletos")
        .insert([{
            valor,
            data_vencimento: iso,
            nota_fiscal_id: null,
            status: "ABERTO"
        }]);

    if (error) {
        console.error(error);
        alert("Erro ao lançar manualmente.");
        return;
    }

    await carregarDados();
    renderizarTabela();
}

// ===============================================
// AÇÕES ADMIN — NÃO MEXIDAS
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
