// ===============================================
// CONTAS_RECEBER.JS — BOLETOS + NF REAL (SEM JOIN)
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
// CARREGAR DADOS (SEM JOIN)
// ===============================================
async function carregarDados() {

    // 1️⃣ BOLETOS
    const { data: boletos, error: errBoletos } = await supabase
        .from("boletos")
        .select("id, valor, data_vencimento, status, nota_fiscal_id")
        .order("data_vencimento");

    if (errBoletos) {
        console.error(errBoletos);
        alert("Erro ao carregar contas a receber");
        return;
    }

    if (!boletos || boletos.length === 0) {
        registros = [];
        return;
    }

    // 2️⃣ NFs RELACIONADAS
    const nfIds = [...new Set(
        boletos
            .map(b => b.nota_fiscal_id)
            .filter(id => id !== null)
    )];

    let mapaNF = {};

    if (nfIds.length > 0) {
        const { data: nfs, error: errNf } = await supabase
            .from("notas_fiscais")
            .select("id, numero_nf")
            .in("id", nfIds);

        if (errNf) {
            console.error(errNf);
            alert("Erro ao carregar notas fiscais");
            return;
        }

        nfs.forEach(nf => {
            mapaNF[nf.id] = nf.numero_nf;
        });
    }

    // 3️⃣ MONTA REGISTROS FINAIS
    registros = boletos.map(b => ({
        id: b.id,
        valor: b.valor,
        data_vencimento: b.data_vencimento,
        status: b.status,
        numero_nf: mapaNF[b.nota_fiscal_id] || "—"
    }));
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
                <td style="text-align:center">${r.numero_nf}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalculado}</td>
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
// MARCAR COMO PAGO (AGORA NA TABELA CORRETA)
// ===============================================
window.marcarPago = async function (id) {
    if (roleUsuario !== "admin") return;

    if (!confirm("Marcar como pago?")) return;

    const { error } = await supabase
        .from("boletos")
        .update({
            status: "PAGO",
            data_pagamento: new Date().toISOString().split("T")[0]
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Erro ao marcar como pago");
        return;
    }

    await carregarDados();
    renderizarTabela();
};
