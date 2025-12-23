// ===============================================
// CONTAS_RECEBER.JS — ESTÁVEL + LANÇAMENTO MANUAL
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
function formatarDataBR(data) {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-BR");
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

    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = aplicarFiltros;

    const btnManual = document.getElementById("btnLancamentoManual");
    if (btnManual) btnManual.onclick = abrirLancamentoManual;

    await carregarDados();
    renderizarTabela();
});

// ===============================================
async function carregarDados() {
    const { data, error } = await supabase
        .from("boletos")
        .select(`
            id,
            valor,
            data_vencimento,
            status,
            notas_fiscais (
                numero_nf
            )
        `)
        .order("data_vencimento");

    if (error) {
        console.error(error);
        alert("Erro ao carregar contas a receber");
        return;
    }

    registros = data || [];
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
    const vencimentoFiltro = document.getElementById("filtroVencimento").value;

    let total = 0;
    const hoje = new Date().toISOString().split("T")[0];

    registros.forEach(r => {
        let statusCalc = r.status;
        if (r.status === "ABERTO" && r.data_vencimento < hoje) {
            statusCalc = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && r.data_vencimento > vencimentoFiltro) return;

        total += Number(r.valor);

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">${r.notas_fiscais?.numero_nf || "—"}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalc}</td>
                <td style="text-align:center">
                    ${
                        roleUsuario === "admin" && r.status === "ABERTO"
                            ? `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`
                            : "—"
                    }
                </td>
            </tr>
        `;
    });

    document.getElementById("totalReceber").textContent = formatarMoeda(total);
}

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

    await carregarDados();
    renderizarTabela();
};

// ===============================================
// LANÇAMENTO MANUAL (TEMPORÁRIO VIA PROMPT)
// ===============================================
async function abrirLancamentoManual() {
    if (roleUsuario !== "admin") {
        alert("Apenas administrador pode lançar manualmente");
        return;
    }

    const nf = prompt("Número da NF:");
    if (!nf) return;

    const valor = prompt("Valor do boleto:");
    if (!valor) return;

    const vencimento = prompt("Data de vencimento (YYYY-MM-DD):");
    if (!vencimento) return;

    const { error } = await supabase.from("boletos").insert({
        valor: Number(valor),
        data_vencimento: vencimento,
        status: "ABERTO",
        nota_fiscal_id: null,
        numero_nf_manual: nf
    });

    if (error) {
        alert("Erro ao lançar boleto manual");
        console.error(error);
        return;
    }

    await carregarDados();
    renderizarTabela();
}
