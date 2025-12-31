// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL + EDITAR + LANÇAMENTO MANUAL
// (corrige 1 dia anterior / timezone e coluna errada)
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

// estado
let editandoId = null;

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    // botões
    document.getElementById("btnFiltrar")?.addEventListener("click", carregarLancamentos);
    document.getElementById("btnGerarPDF")?.addEventListener("click", gerarPDF);

    document.getElementById("btnNovoManual")?.addEventListener("click", () => {
        abrirModalNovo();
    });

    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModal);

    document.getElementById("modalManual")?.addEventListener("click", (e) => {
        if (e.target?.id === "modalManual") fecharModal();
    });

    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarModal);

    atualizarDataHoraPDF();
    carregarLancamentos();
});

// ======================================================
// FORMATADORES (SEM new Date() PARA NÃO VOLTAR 1 DIA)
// ======================================================
function formatarValor(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isoParaBR(iso) {
    // iso = "YYYY-MM-DD" (date no Supabase)
    if (!iso) return "-";
    const p = String(iso).split("-");
    if (p.length !== 3) return "-";
    return `${p[2]}/${p[1]}/${p[0]}`;
}

function hojeISO() {
    // gera YYYY-MM-DD no fuso local sem timezone shift
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// ======================================================
// CARREGAR LANÇAMENTOS
// ======================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");
    if (!tbody || !totalEl) return;

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    totalEl.innerText = "R$ 0,00";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoAte = document.getElementById("filtroVencimento")?.value || "";

    // IMPORTANTE:
    // sua tabela NÃO tem "origem". Ela tem "descricao" e "data_vencimento".
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

    data.forEach((l) => {
        total += Number(l.valor || 0);

        const tr = document.createElement("tr");
        if (l.status === "VENCIDO") tr.classList.add("vencido");

        const bloqueado = (l.status === "PAGO");

        tr.innerHTML = `
            <td>${l.descricao || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${isoParaBR(l.data_vencimento)}</td>
            <td>${l.status || "-"}</td>
            <td class="td-acoes">
                <button class="btn-azul btn-editar" data-id="${l.id}" ${bloqueado ? "disabled style='opacity:.45;cursor:not-allowed'" : ""}>
                    Editar
                </button>
                <button class="btn-vermelho btn-pagar btn-pagar" data-id="${l.id}" ${bloqueado ? "disabled style='opacity:.45;cursor:not-allowed'" : ""}>
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
// AÇÕES (EDITAR / PAGAR)
// ======================================================
function bindAcoes() {
    document.querySelectorAll(".btn-editar").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.dataset.id);
            if (!id) return;
            await abrirModalEditar(id);
        });
    });

    document.querySelectorAll(".btn-pagar").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.dataset.id);
            if (!id) return;

            const ok = confirm("Confirmar pagamento deste lançamento?");
            if (!ok) return;

            const { error } = await supabase
                .from("contas_receber")
                .update({
                    status: "PAGO",
                    data_pagamento: hojeISO()
                })
                .eq("id", id);

            if (error) {
                console.error("ERRO PAGAR:", error);
                alert("Erro ao marcar como pago.");
                return;
            }

            carregarLancamentos();
        });
    });
}

// ======================================================
// MODAL (NOVO / EDITAR)
// ======================================================
function abrirModalNovo() {
    editandoId = null;

    const modal = document.getElementById("modalManual");
    const titulo = document.getElementById("tituloModal");
    const aviso = document.getElementById("avisoModal");

    const desc = document.getElementById("origemManual");
    const valor = document.getElementById("valorManual");
    const venc = document.getElementById("vencimentoManual");

    if (!modal || !titulo || !aviso || !desc || !valor || !venc) return;

    titulo.innerText = "Novo Lançamento Manual";
    aviso.innerText = "Será salvo como ABERTO.";
    desc.value = "";
    valor.value = "";
    venc.value = "";

    modal.classList.add("ativo");
    desc.focus();
}

async function abrirModalEditar(id) {
    const modal = document.getElementById("modalManual");
    const titulo = document.getElementById("tituloModal");
    const aviso = document.getElementById("avisoModal");

    const desc = document.getElementById("origemManual");
    const valor = document.getElementById("valorManual");
    const venc = document.getElementById("vencimentoManual");

    if (!modal || !titulo || !aviso || !desc || !valor || !venc) return;

    const { data, error } = await supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .eq("id", id)
        .maybeSingle();

    if (error || !data) {
        console.error("ERRO BUSCAR EDITAR:", error);
        alert("Não foi possível abrir para editar.");
        return;
    }

    if (data.status === "PAGO") {
        alert("Lançamento PAGO não pode ser editado.");
        return;
    }

    editandoId = data.id;

    titulo.innerText = `Editar Lançamento #${data.id}`;
    aviso.innerText = "Status PAGO é bloqueado (somente via botão Pagar).";

    desc.value = data.descricao || "";
    valor.value = Number(data.valor || 0);
    venc.value = data.data_vencimento || ""; // mantém YYYY-MM-DD

    modal.classList.add("ativo");
    desc.focus();
}

function fecharModal() {
    const modal = document.getElementById("modalManual");
    if (!modal) return;
    modal.classList.remove("ativo");
}

async function salvarModal() {
    const desc = document.getElementById("origemManual");
    const valor = document.getElementById("valorManual");
    const venc = document.getElementById("vencimentoManual");

    if (!desc || !valor || !venc) return;

    const descricao = (desc.value || "").trim();
    const v = Number(valor.value || 0);
    const data_vencimento = venc.value || "";

    if (!descricao) {
        alert("Preencha NF / Origem.");
        desc.focus();
        return;
    }
    if (!data_vencimento) {
        alert("Preencha o Vencimento.");
        venc.focus();
        return;
    }
    if (!isFinite(v) || v <= 0) {
        alert("Valor inválido.");
        valor.focus();
        return;
    }

    // INSERT (novo)
    if (!editandoId) {
        // mantém compatibilidade com sua estrutura:
        // descricao, valor, data_vencimento, status
        // origem_tipo = "BOLETO" (como seus registros)
        const { error } = await supabase
            .from("contas_receber")
            .insert([{
                origem_tipo: "BOLETO",
                descricao,
                valor: v,
                data_vencimento,
                status: "ABERTO"
            }]);

        if (error) {
            console.error("ERRO SALVAR MANUAL:", error);
            alert("Erro ao salvar lançamento manual.");
            return;
        }

        fecharModal();
        carregarLancamentos();
        return;
    }

    // UPDATE (editar) — não mexe em status aqui
    const { error } = await supabase
        .from("contas_receber")
        .update({
            descricao,
            valor: v,
            data_vencimento
        })
        .eq("id", editandoId);

    if (error) {
        console.error("ERRO ATUALIZAR:", error);
        alert("Erro ao atualizar lançamento.");
        return;
    }

    fecharModal();
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
