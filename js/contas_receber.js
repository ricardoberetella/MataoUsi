// ======================================================
// CONTAS_RECEBER.JS — VERSÃO CORRETA / ESTÁVEL
// EDITAR FUNCIONAL (SEM QUEBRAR NADA)
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", carregarLancamentos);

    document.getElementById("btnGerarPDF")
        ?.addEventListener("click", gerarPDF);

    atualizarDataHoraPDF();
    carregarLancamentos();
});

// ======================================================
// FORMATADORES
// ======================================================
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

// ======================================================
// CARREGAR LANÇAMENTOS
// ======================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");

    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    totalEl.innerText = "R$ 0,00";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoAte = document.getElementById("filtroVencimento")?.value || "";

    let query = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    if (statusFiltro) query = query.eq("status", statusFiltro);
    if (vencimentoAte) query = query.lte("data_vencimento", vencimentoAte);

    const { data, error } = await query;

    if (error) {
        console.error("ERRO CONTAS_RECEBER:", error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>Nenhum lançamento</td></tr>";
        return;
    }

    tbody.innerHTML = "";
    let total = 0;

    data.forEach(l => {
        total += Number(l.valor || 0);

        const tr = document.createElement("tr");
        if (l.status === "VENCIDO") tr.classList.add("vencido");

        tr.innerHTML = `
            <td>${l.descricao || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${formatarData(l.data_vencimento)}</td>
            <td>${l.status}</td>
            <td style="display:flex; gap:6px; justify-content:center">
                <button class="btn-azul btn-editar"
                    data-id="${l.id}"
                    data-descricao="${l.descricao || ""}"
                    data-valor="${l.valor || 0}"
                    data-vencimento="${l.data_vencimento || ""}">
                    Editar
                </button>
                <button class="btn-vermelho btn-pagar" data-id="${l.id}">
                    Pagar
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    totalEl.innerText = formatarValor(total);
    bindAcoes();
}

// ======================================================
// AÇÕES
// ======================================================
function bindAcoes() {

    // ===== EDITAR (FUNCIONAL E ISOLADO) =====
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", async () => {

            const id = btn.dataset.id;

            const novaDescricao = prompt(
                "NF / Origem:",
                btn.dataset.descricao
            );
            if (novaDescricao === null) return;

            const novoValor = prompt(
                "Valor:",
                btn.dataset.valor
            );
            if (novoValor === null) return;

            const novoVencimento = prompt(
                "Vencimento (YYYY-MM-DD):",
                btn.dataset.vencimento
            );
            if (novoVencimento === null) return;

            const { error } = await supabase
                .from("contas_receber")
                .update({
                    descricao: novaDescricao,
                    valor: Number(novoValor),
                    data_vencimento: novoVencimento
                })
                .eq("id", id);

            if (error) {
                alert("Erro ao editar lançamento");
                console.error(error);
                return;
            }

            carregarLancamentos();
        });
    });

    // ===== PAGAR (NÃO MEXIDO) =====
    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.addEventListener("click", () => {
            alert("Pagar ID: " + btn.dataset.id);
        });
    });
}

// ======================================================
// PDF
// ======================================================
function gerarPDF() {
    document.body.classList.add("modo-pdf");

    html2pdf()
        .from(document.getElementById("areaPdf"))
        .set({
            margin: 10,
            filename: "contas_a_receber.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 1 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .save()
        .then(() => document.body.classList.remove("modo-pdf"));
}

// ======================================================
// DATA / HORA PDF
// ======================================================
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
