// ===============================================
// CONTAS_RECEBER.JS — BOLETOS + NF REAL / MANUAL
// PAGAR + REABRIR + LANÇAMENTO MANUAL
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];
let mapaNF = {};

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

function calcularStatus(r) {
    return (r.status || "ABERTO").toUpperCase();
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar").onclick = renderizarTabela;

    const btnNovo = document.getElementById("btnNovoManual");
    if (roleUsuario !== "admin") {
        btnNovo.style.display = "none";
    } else {
        btnNovo.onclick = () => modalManual.style.display = "flex";
    }

    btnCancelarManual.onclick = () => modalManual.style.display = "none";
    btnSalvarManual.onclick = salvarManual;

    await carregarDados();
    renderizarTabela();
});

// ===============================================
async function carregarDados() {
    const { data } = await supabase
        .from("boletos")
        .select("id, valor, data_vencimento, nota_fiscal_id, nf_manual, status")
        .order("data_vencimento");

    registros = data || [];

    const idsNF = [...new Set(registros.map(r => r.nota_fiscal_id).filter(Boolean))];
    mapaNF = {};

    if (idsNF.length) {
        const { data: notas } = await supabase
            .from("notas_fiscais")
            .select("id, numero_nf")
            .in("id", idsNF);

        notas?.forEach(n => mapaNF[n.id] = n.numero_nf);
    }
}

// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    tbody.innerHTML = "";

    let total = 0;

    registros.forEach(r => {
        const nfExibida =
            r.nota_fiscal_id ? mapaNF[r.nota_fiscal_id] :
            r.nf_manual || "—";

        total += Number(r.valor);

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">${nfExibida}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${calcularStatus(r)}</td>
                <td style="text-align:center">
                    ${
                        roleUsuario === "admin" && r.status === "ABERTO"
                            ? `<button class="btn-verde" onclick="pagar(${r.id})">Pagar</button>`
                            : roleUsuario === "admin"
                                ? `<button class="btn-vermelho" onclick="reabrir(${r.id})">Reabrir</button>`
                                : "—"
                    }
                </td>
            </tr>
        `;
    });

    totalReceber.textContent = formatarMoeda(total);
}

// ===============================================
// AÇÕES
// ===============================================
window.pagar = async id => {
    await supabase.from("boletos").update({ status: "PAGO" }).eq("id", id);
    await carregarDados();
    renderizarTabela();
};

window.reabrir = async id => {
    await supabase.from("boletos").update({ status: "ABERTO" }).eq("id", id);
    await carregarDados();
    renderizarTabela();
};

async function salvarManual() {
    const payload = {
        nf_manual: manualNF.value || null,
        descricao: manualDescricao.value || null,
        valor: Number(manualValor.value),
        data_vencimento: manualVencimento.value,
        status: "ABERTO",
        origem_tipo: "MANUAL"
    };

    await supabase.from("boletos").insert(payload);

    modalManual.style.display = "none";
    manualNF.value = "";
    manualDescricao.value = "";
    manualValor.value = "";
    manualVencimento.value = "";

    await carregarDados();
    renderizarTabela();
}
