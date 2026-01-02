// ======================================================
// CONTAS_RECEBER.JS — VERSÃO ESTÁVEL + PAGAR FUNCIONAL
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

function formatarData(isoYYYYMMDD) {
    if (!isoYYYYMMDD) return "-";
    const [y, m, d] = String(isoYYYYMMDD).split("-");
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString("pt-BR");
}

function hojeISOlocal() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

    const statusFiltro = (document.getElementById("filtroStatus")?.value || "").trim();
    const vencimentoAte = (document.getElementById("filtroVencimento")?.value || "").trim();

    let query = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    if (vencimentoAte) query = query.lte("data_vencimento", vencimentoAte);

    const { data, error } = await query;

    if (error) {
        console.error("ERRO CONTAS_RECEBER:", error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
        return;
    }

    const hoje = hojeISOlocal();
    let lista = Array.isArray(data) ? data : [];

    if (statusFiltro === "PAGO") {
        lista = lista.filter(l => (l.status || "").toUpperCase() === "PAGO");
    } else if (statusFiltro === "VENCIDO") {
        lista = lista.filter(l => {
            const status = (l.status || "").toUpperCase();
            return status !== "PAGO" && l.data_vencimento < hoje;
        });
    } else if (statusFiltro === "ABERTO") {
        lista = lista.filter(l => {
            const status = (l.status || "").toUpperCase();
            return status !== "PAGO" && l.data_vencimento >= hoje;
        });
    }

    if (lista.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>Nenhum lançamento</td></tr>";
        totalEl.innerText = "R$ 0,00";
        return;
    }

    tbody.innerHTML = "";
    let total = 0;

    lista.forEach(l => {
        total += Number(l.valor || 0);

        const status = (l.status || "ABERTO").toUpperCase();
        const vencISO = l.data_vencimento || "";
        const estaVencido = status !== "PAGO" && vencISO && vencISO < hoje;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${l.descricao || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${formatarData(l.data_vencimento)}</td>
            <td>${status}</td>
            <td style="display:flex; gap:6px; justify-content:center">
                <button class="btn-azul btn-editar" data-id="${l.id}">
                    Editar
                </button>
                <button class="btn-vermelho btn-pagar" data-id="${l.id}">
                    Pagar
                </button>
            </td>
        `;

        if (estaVencido) {
            const tds = tr.querySelectorAll("td");
            for (let i = 0; i < 4; i++) {
                if (tds[i]) {
                    tds[i].style.color = "#ff3b3b";
                    tds[i].style.fontWeight = "700";
                }
            }
        }

        tbody.appendChild(tr);
    });

    totalEl.innerText = formatarValor(total);
    bindAcoes();
}

// ======================================================
// AÇÕES
// ======================================================
function bindAcoes() {
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            alert("Editar ID: " + btn.dataset.id);
        });
    });

    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.dataset.id);
            if (!id) return;

            if (!confirm("Confirmar pagamento deste lançamento?")) return;

            const { error } = await supabase
                .from("contas_receber")
                .update({
                    status: "PAGO",
                    data_pagamento: hojeISOlocal()
                })
                .eq("id", id);

            if (error) {
                alert("Erro ao pagar: " + error.message);
                console.error(error);
                return;
            }

            alert("Pagamento realizado com sucesso");
            carregarLancamentos();
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
