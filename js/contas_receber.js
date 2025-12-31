// ====================================================
// CONTAS_RECEBER.JS — DEFINITIVO / À PROVA DE RLS
// NF ORIGEM COM FALLBACK SEGURO
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

let registros = [];
let mapaNF = {};

// ====================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    await carregarLancamentos();

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", carregarLancamentos);
});

// ====================================================
// FORMATADORES
// ====================================================
function formatarData(valor) {
    if (!valor) return "-";
    const [a, m, d] = valor.substring(0, 10).split("-");
    return `${d}/${m}/${a}`;
}

function formatarValor(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ====================================================
// CARREGAR LANÇAMENTOS (SEM JOIN)
// ====================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaLancamentos");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5">Carregando...</td></tr>`;

    const statusFiltro = document.getElementById("statusFiltro")?.value || "";
    const vencimentoAte = document.getElementById("vencimentoFiltro")?.value || "";

    let query = supabase
        .from("contas_receber")
        .select("id, valor, vencimento, status, nota_fiscal_id")
        .order("vencimento", { ascending: true });

    if (statusFiltro) query = query.eq("status", statusFiltro);
    if (vencimentoAte) query = query.lte("vencimento", vencimentoAte);

    const { data, error } = await query;

    if (error) {
        console.error("ERRO CONTAS_RECEBER:", error);
        tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar lançamentos</td></tr>`;
        return;
    }

    registros = data || [];

    if (registros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Nenhum lançamento encontrado</td></tr>`;
        return;
    }

    await carregarNFs();
    renderizarTabela();
}

// ====================================================
// CARREGAR NFs EM LOTE (SE EXISTIREM)
// ====================================================
async function carregarNFs() {
    mapaNF = {};

    const idsNF = registros
        .map(r => r.nota_fiscal_id)
        .filter(id => id);

    if (idsNF.length === 0) return;

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select("id, numero")
        .in("id", idsNF);

    if (error) {
        console.warn("NF não carregadas (RLS):", error);
        return;
    }

    data.forEach(nf => {
        mapaNF[nf.id] = nf.numero;
    });
}

// ====================================================
// RENDERIZAÇÃO
// ====================================================
function renderizarTabela() {
    const tbody = document.getElementById("listaLancamentos");
    tbody.innerHTML = "";

    registros.forEach(r => {
        const nfOrigem = mapaNF[r.nota_fiscal_id] || "-";

        tbody.innerHTML += `
            <tr>
                <td>${nfOrigem}</td>
                <td>${formatarValor(r.valor)}</td>
                <td>${formatarData(r.vencimento)}</td>
                <td>${r.status}</td>
                <td style="display:flex;gap:8px;justify-content:center;">
                    <button class="btn-primario btn-editar"
                        onclick="editarLancamento(${r.id})">
                        Editar
                    </button>

                    <button class="btn-primario btn-pagar"
                        onclick="pagarLancamento(${r.id})">
                        Pagar
                    </button>
                </td>
            </tr>
        `;
    });
}

// ====================================================
// AÇÕES
// ====================================================
window.editarLancamento = function (id) {
    window.location.href = `contas_receber_editar.html?id=${id}`;
};

window.pagarLancamento = async function (id) {
    if (!confirm("Confirmar pagamento deste lançamento?")) return;

    const { error } = await supabase
        .from("contas_receber")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (error) {
        alert("Erro ao pagar");
        console.error(error);
        return;
    }

    await carregarLancamentos();
};
