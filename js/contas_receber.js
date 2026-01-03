// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL + EDITAR + PAGAR + REVERTER
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

function formatarData(iso) {
    if (!iso) return "-";
    const [y, m, d] = String(iso).split("-");
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

function hojeISOlocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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

    if (vencimentoAte) query = query.lte("data_vencimento", vencimentoAte);

    const { data, error } = await query;
    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar</td></tr>";
        return;
    }

    const hoje = hojeISOlocal();
    let lista = data || [];

    if (statusFiltro === "PAGO") {
        lista = lista.filter(l => l.status === "PAGO");
    } else if (statusFiltro === "VENCIDO") {
        lista = lista.filter(l => l.status !== "PAGO" && l.data_vencimento < hoje);
    } else if (statusFiltro === "ABERTO") {
        lista = lista.filter(l => l.status !== "PAGO" && l.data_vencimento >= hoje);
    }

    tbody.innerHTML = "";
    let total = 0;

    lista.forEach(l => {
        total += Number(l.valor || 0);

        const pago = l.status === "PAGO";
        const vencido = !pago && l.data_vencimento < hoje;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${l.descricao || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${formatarData(l.data_vencimento)}</td>
            <td>${l.status}</td>
            <td style="display:flex; gap:6px; justify-content:center">
                <button class="btn-azul btn-editar" data-id="${l.id}">Editar</button>
                ${pago
                    ? `<button class="btn-cinza btn-reverter" data-id="${l.id}">Reverter</button>`
                    : `<button class="btn-vermelho btn-pagar" data-id="${l.id}">Pagar</button>`
                }
            </td>
        `;

        if (vencido) {
            tr.querySelectorAll("td").forEach((td, i) => {
                if (i < 4) {
                    td.style.color = "#ff3b3b";
                    td.style.fontWeight = "700";
                }
            });
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
        btn.onclick = () => {
            window.location.href = `contas_receber_editar.html?id=${btn.dataset.id}`;
        };
    });

    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Confirmar pagamento?")) return;

            await supabase
                .from("contas_receber")
                .update({
                    status: "PAGO",
                    data_pagamento: hojeISOlocal()
                })
                .eq("id", btn.dataset.id);

            carregarLancamentos();
        };
    });

    document.querySelectorAll(".btn-reverter").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Reverter pagamento?")) return;

            await supabase
                .from("contas_receber")
                .update({
                    status: "ABERTO",
                    data_pagamento: null
                })
                .eq("id", btn.dataset.id);

            carregarLancamentos();
        };
    });
}

// ======================================================
// PDF
// ======================================================
function gerarPDF() {
    document.body.classList.add("modo-pdf");
    html2pdf().from(document.getElementById("areaPdf")).save()
        .then(() => document.body.classList.remove("modo-pdf"));
}

// ======================================================
function atualizarDataHoraPDF() {
    const el = document.getElementById("dataHoraPdf");
    if (!el) return;
    const d = new Date();
    el.innerText = d.toLocaleDateString("pt-BR") + " " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
