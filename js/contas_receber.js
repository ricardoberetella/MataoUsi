// ===============================================
// CONTAS_RECEBER.JS — NF REAL + ALINHAMENTO
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

    document.getElementById("btnFiltrar").onclick = aplicarFiltros;

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

        let statusCalculado = r.status;
        if (r.status === "ABERTO" && r.data_vencimento < hoje) {
            statusCalculado = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== statusCalculado) return;
        if (vencimentoFiltro && r.data_vencimento > vencimentoFiltro) return;

        total += Number(r.valor);

        tbody.innerHTML += `
            <tr>
                <!-- NF -->
                <td style="text-align:center">
                    ${r.notas_fiscais?.numero_nf || "—"}
                </td>

                <!-- VALOR -->
                <td style="text-align:center">
                    ${formatarMoeda(r.valor)}
                </td>

                <!-- VENCIMENTO -->
                <td style="text-align:center">
                    ${formatarDataBR(r.data_vencimento)}
                </td>

                <!-- STATUS -->
                <td style="text-align:center">
                    ${statusCalculado}
                </td>

                <!-- AÇÕES -->
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

    document.getElementById("totalReceber").textContent =
        formatarMoeda(total);
}

// ===============================================
window.marcarPago = async function (id) {
    if (roleUsuario !== "admin") return;

    if (!confirm("Marcar como pago?")) return;

    const { error } = await supabase
        .from("contas_receber")
        .update({
            status: "PAGO",
            data_pagamento: new Date().toISOString().split("T")[0]
        })
        .eq("id", id);

    if (error) {
        alert("Erro ao marcar como pago");
        return;
    }

    await carregarDados();
    renderizarTabela();
};
