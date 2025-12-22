// ===============================================
// CONTAS_RECEBER.JS — BOLETOS + NF (numero_nf)
// PAGAR FUNCIONANDO (STATUS NO BANCO)
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

// STATUS REAL (COLUNA EXISTENTE)
function calcularStatus(r) {
    return (r.status || "ABERTO").toUpperCase();
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    const btn = document.getElementById("btnFiltrar");
    if (btn) btn.onclick = aplicarFiltros;

    await carregarDados();
    renderizarTabela();
});

// ===============================================
async function carregarDados() {

    const { data: boletos, error } = await supabase
        .from("boletos")
        .select("id, valor, data_vencimento, nota_fiscal_id, status")
        .order("data_vencimento");

    if (error) {
        console.error("Erro boletos:", error);
        alert("Erro ao carregar contas a receber");
        registros = [];
        return;
    }

    registros = boletos || [];

    // Buscar numero_nf
    const idsNF = [...new Set(registros.map(r => r.nota_fiscal_id).filter(Boolean))];
    mapaNF = {};

    if (idsNF.length > 0) {
        const { data: notas, error: errNF } = await supabase
            .from("notas_fiscais")
            .select("id, numero_nf")
            .in("id", idsNF);

        if (!errNF) {
            notas.forEach(n => {
                mapaNF[n.id] = n.numero_nf;
            });
        }
    }
}

// ===============================================
function aplicarFiltros() {
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
                        roleUsuario === "admin" && statusCalc === "ABERTO"
                            ? `<button class="btn-verde" onclick="pagar(${r.id})">Pagar</button>`
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
// AÇÃO PAGAR (ADMIN)
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
