// ====================================================
// CONTAS_RECEBER.JS — ESTÁVEL
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

// ====================================================
// INIT
// ====================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    carregarLancamentos();

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", carregarLancamentos);

    document.getElementById("btnGerarPDF")
        ?.addEventListener("click", gerarPDF);

    atualizarDataHoraPDF();
});

// ====================================================
// FORMATADORES
// ====================================================
function formatarValor(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR");
}

// ====================================================
// CARREGAR LANÇAMENTOS
// ====================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");

    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    totalEl.innerText = "R$ 0,00";

    const status = document.getElementById("filtroStatus")?.value || "";
    const vencimentoAte = document.getElementById("filtroVencimento")?.value || "";

    let query = supabase
        .from("contas_receber")
        .select("id, origem, valor, vencimento, status")
        .order("vencimento");

    if (status) query = query.eq("status", status);
    if (vencimentoAte) query = query.lte("vencimento", vencimentoAte);

    const { data, error } = await query;

    if (error) {
        console.error("ERRO CONTAS_RECEBER:", error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar</td></tr>";
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>Nenhum lançamento</td></tr>";
        return;
    }

    let total = 0;
    tbody.innerHTML = "";

    data.forEach(l => {
        total += Number(l.valor || 0);

        const tr = document.createElement("tr");
        if (l.status === "VENCIDO") tr.classList.add("vencido");

        tr.innerHTML = `
            <td>${l.origem || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${formatarData(l.vencimento)}</td>
            <td>${l.status}</td>
            <td>
                <button class="btn-azul btn-editar" data-id="${l.id}">Editar</button>
                <button class="btn-vermelho btn-pagar" data-id="${l.id}">Pagar</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    totalEl.innerText = formatarValor(total);
    bindAcoes();
}

// ====================================================
// AÇÕES
// ====================================================
function bindAcoes() {
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.onclick = () => {
            alert("Editar ID: " + btn.dataset.id);
        };
    });

    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.onclick = () => {
            alert("Pagar ID: " + btn.dataset.id);
        };
    });
}

// ====================================================
// PDF
// ====================================================
function gerarPDF() {
    document.body.classList.add("modo-pdf");

    html2pdf().from(document.getElementById("areaPdf")).set({
        margin: 10,
        filename: "contas_a_receber.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 1 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    }).save().then(() => {
        document.body.classList.remove("modo-pdf");
    });
}

// ====================================================
// DATA / HORA PDF
// ====================================================
function atualizarDataHoraPDF() {
    const el = document.getElementById("dataHoraPdf");
    if (!el) return;

    const agora = new Date();
    el.innerText =
        agora.toLocaleDateString("pt-BR") +
        " " +
        agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });
}
