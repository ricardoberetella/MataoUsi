// ===============================================
// CONTAS_RECEBER.JS — BOLETOS + NF (FUNCIONAL)
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

    document.getElementById("btnFiltrar").onclick = async () => {
        await carregarDados();
        renderizarTabela();
    };

    await carregarDados();
    renderizarTabela();
});

// ===============================================
// CARREGAR BOLETOS
// ===============================================
async function carregarDados() {

    const { data, error } = await supabase
        .from("boletos")
        .select("id, valor, data_vencimento, nota_fiscal_id")
        .order("data_vencimento");

    if (error) {
        console.error(error);
        alert("Erro ao carregar contas a receber");
        return;
    }

    if (!data) {
        registros = [];
        return;
    }

    const nfIds = [...new Set(
        data.map(b => b.nota_fiscal_id).filter(Boolean)
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

    registros = data.map(b => ({
        id: b.id,
        valor: b.valor,
        data_vencimento: b.data_vencimento,
        numero_nf: mapaNF[b.nota_fiscal_id] || "—"
    }));
}

// ===============================================
// RENDERIZAÇÃO COM FILTROS
// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    tbody.innerHTML = "";

    const vencimentoFiltro = document.getElementById("filtroVencimento").value;

    let total = 0;

    registros.forEach(r => {

        if (vencimentoFiltro && r.data_vencimento > vencimentoFiltro) return;

        total += Number(r.valor);

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">${r.numero_nf}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">ABERTO</td>
                <td style="text-align:center">
                    ${roleUsuario === "admin"
                        ? `<button class="btn-verde">Pagar</button>`
                        : "—"}
                </td>
            </tr>
        `;
    });

    document.getElementById("totalReceber").textContent =
        formatarMoeda(total);
}
