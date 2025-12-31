// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL / DEFINITIVO
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

let idEditando = null;

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    document.getElementById("btnFiltrar")?.addEventListener("click", carregarLancamentos);
    document.getElementById("btnGerarPDF")?.addEventListener("click", gerarPDF);
    document.getElementById("btnNovoManual")?.addEventListener("click", abrirModalNovo);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);
    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModal);

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
    const dt = new Date(d + "T12:00:00"); // 🔒 evita -1 dia
    return dt.toLocaleDateString("pt-BR");
}

// ======================================================
// CARREGAR LANÇAMENTOS
// ======================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    totalEl.innerText = "R$ 0,00";

    const statusFiltro = document.getElementById("filtroStatus").value;
    const vencimentoAte = document.getElementById("filtroVencimento").value;

    let query = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento");

    if (statusFiltro) query = query.eq("status", statusFiltro);
    if (vencimentoAte) query = query.lte("data_vencimento", vencimentoAte);

    const { data, error } = await query;

    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
        return;
    }

    if (!data.length) {
        tbody.innerHTML = "<tr><td colspan='5'>Nenhum lançamento</td></tr>";
        return;
    }

    tbody.innerHTML = "";
    let total = 0;

    data.forEach(l => {
        total += Number(l.valor || 0);

        const tr = document.createElement("tr");

        if (l.status === "VENCIDO") tr.style.color = "red";

        tr.innerHTML = `
            <td>${l.descricao || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${formatarData(l.data_vencimento)}</td>
            <td>${l.status}</td>
            <td style="display:flex; gap:6px; justify-content:center">
                <button class="btn-azul btn-editar" data-id="${l.id}">Editar</button>
                ${
                    l.status === "PAGO"
                        ? `<button class="btn-vermelho btn-reabrir" data-id="${l.id}">Reabrir</button>`
                        : `<button class="btn-vermelho btn-pagar" data-id="${l.id}">Pagar</button>`
                }
            </td>
        `;

        tbody.appendChild(tr);
    });

    totalEl.innerText = formatarValor(total);
    bindAcoes();
}

// ======================================================
// AÇÕES DOS BOTÕES
// ======================================================
function bindAcoes() {

    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.onclick = () => abrirModalEditar(btn.dataset.id);
    });

    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.onclick = () => pagarLancamento(btn.dataset.id);
    });

    document.querySelectorAll(".btn-reabrir").forEach(btn => {
        btn.onclick = () => reabrirLancamento(btn.dataset.id);
    });
}

// ======================================================
// MODAL
// ======================================================
function abrirModalNovo() {
    idEditando = null;
    document.getElementById("origemManual").value = "";
    document.getElementById("valorManual").value = "";
    document.getElementById("vencimentoManual").value = "";
    document.getElementById("modalManual").style.display = "flex";
}

async function abrirModalEditar(id) {
    const { data } = await supabase
        .from("contas_receber")
        .select("*")
        .eq("id", id)
        .single();

    if (!data || data.status === "PAGO") {
        alert("Não é permitido editar lançamento pago.");
        return;
    }

    idEditando = id;
    document.getElementById("origemManual").value = data.descricao || "";
    document.getElementById("valorManual").value = data.valor;
    document.getElementById("vencimentoManual").value = data.data_vencimento;
    document.getElementById("modalManual").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modalManual").style.display = "none";
}

// ======================================================
// SALVAR MANUAL / EDITAR
// ======================================================
async function salvarManual() {
    const descricao = document.getElementById("origemManual").value;
    const valor = document.getElementById("valorManual").value;
    const vencimento = document.getElementById("vencimentoManual").value;

    if (!descricao || !valor || !vencimento) {
        alert("Preencha todos os campos");
        return;
    }

    if (idEditando) {
        await supabase
            .from("contas_receber")
            .update({
                descricao,
                valor,
                data_vencimento: vencimento
            })
            .eq("id", idEditando);
    } else {
        await supabase
            .from("contas_receber")
            .insert({
                descricao,
                valor,
                data_vencimento: vencimento,
                status: "ABERTO"
            });
    }

    fecharModal();
    carregarLancamentos();
}

// ======================================================
// PAGAR / REABRIR
// ======================================================
async function pagarLancamento(id) {
    if (!confirm("Confirmar pagamento?")) return;

    await supabase
        .from("contas_receber")
        .update({ status: "PAGO" })
        .eq("id", id);

    carregarLancamentos();
}

async function reabrirLancamento(id) {
    if (!confirm("Reabrir este lançamento?")) return;

    await supabase
        .from("contas_receber")
        .update({ status: "ABERTO" })
        .eq("id", id);

    carregarLancamentos();
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
        agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
