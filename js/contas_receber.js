// ======================================================
// CONTAS_RECEBER.JS — VERSÃO ESTÁVEL (FILTROS OK + VENCIDO VERMELHO)
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
    // evita bug de fuso (não usa new Date("YYYY-MM-DD") direto)
    const [y, m, d] = String(isoYYYYMMDD).split("-");
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString("pt-BR");
}

function hojeISOlocal() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`; // YYYY-MM-DD em horário local
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

    // ---------------------------
    // Estratégia:
    // - Sempre busca os dados necessários
    // - Aplica filtro "VENCIDO" por data (data_vencimento < hoje e status != PAGO)
    // - Aplica filtro "ABERTO" por status != PAGO e não vencido
    // - Aplica filtro "PAGO" por status == PAGO
    // ---------------------------
    let query = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    // filtro por vencimento até (sempre pode aplicar no banco)
    if (vencimentoAte) query = query.lte("data_vencimento", vencimentoAte);

    // Para não depender do seu status estar “VENCIDO”, o filtro por status é tratado aqui:
    // (se quiser manter parte no banco, teria que garantir o status correto na tabela)
    const { data, error } = await query;

    if (error) {
        console.error("ERRO CONTAS_RECEBER:", error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
        return;
    }

    const hoje = hojeISOlocal();

    // aplica filtros em memória (resolve o “Vencido” sem depender do status gravado)
    let lista = Array.isArray(data) ? data : [];

    if (statusFiltro === "PAGO") {
        lista = lista.filter(l => (l.status || "").toUpperCase() === "PAGO");
    } else if (statusFiltro === "VENCIDO") {
        lista = lista.filter(l => {
            const status = (l.status || "").toUpperCase();
            const venc = (l.data_vencimento || "");
            return status !== "PAGO" && venc && venc < hoje;
        });
    } else if (statusFiltro === "ABERTO") {
        lista = lista.filter(l => {
            const status = (l.status || "").toUpperCase();
            const venc = (l.data_vencimento || "");
            const estaVencido = venc && venc < hoje;
            return status !== "PAGO" && !estaVencido;
        });
    } // "" = Todos => não filtra

    if (!lista || lista.length === 0) {
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

        // ✅ Texto vermelho para vencidos (sem mexer em CSS)
        if (estaVencido) {
            // pinta só as colunas de texto (não mexe nos botões)
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
// AÇÕES (mantido como estava)
// ======================================================
function bindAcoes() {
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            alert("Editar ID: " + btn.dataset.id);
        });
    });

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
