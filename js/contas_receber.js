// ===============================================
// CONTAS_RECEBER.JS — BOLETOS + NF + MANUAL
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];
let mapaNF = {};

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

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    // ===============================
    // ELEMENTOS
    // ===============================
    const btnFiltrar = document.getElementById("btnFiltrar");
    const btnManual = document.getElementById("btnLancamentoManual");

    const modal = document.getElementById("modalManual");
    const nf = document.getElementById("manualNF");
    const desc = document.getElementById("manualDescricao");
    const valor = document.getElementById("manualValor");
    const venc = document.getElementById("manualVencimento");
    const btnSalvar = document.getElementById("btnSalvarManual");
    const btnCancelar = document.getElementById("btnCancelarManual");

    btnFiltrar.onclick = renderizarTabela;

    // 🔐 PERMISSÃO
    if (roleUsuario !== "admin") {
        btnManual.style.display = "none";
    } else {
        btnManual.onclick = () => {
            modal.style.display = "flex";
        };
    }

    btnCancelar.onclick = () => {
        modal.style.display = "none";
    };

    btnSalvar.onclick = async () => {
        if (!valor.value || !venc.value) {
            alert("Preencha valor e vencimento");
            return;
        }

        const payload = {
            nf_manual: nf.value || null,
            descricao: desc.value || null,
            valor: Number(valor.value),
            data_vencimento: venc.value,
            status: "ABERTO"
        };

        const { error } = await supabase.from("boletos").insert(payload);
        if (error) {
            alert("Erro ao salvar lançamento manual");
            return;
        }

        modal.style.display = "none";
        nf.value = "";
        desc.value = "";
        valor.value = "";
        venc.value = "";

        await carregarDados();
        renderizarTabela();
    };

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
                <td style="text-align:center">${r.status}</td>
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

    document.getElementById("totalReceber").textContent =
        formatarMoeda(total);
}

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
