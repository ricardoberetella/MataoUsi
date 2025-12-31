// ======================================================
// CONTAS_RECEBER.JS – ETAPA 1 (EDIÇÃO SOMENTE FRONT)
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

// ELEMENTOS
const tbody = document.getElementById("listaReceber");
const totalEl = document.getElementById("totalReceber");

const filtroStatus = document.getElementById("filtroStatus");
const filtroVencimento = document.getElementById("filtroVencimento");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnGerarPDF = document.getElementById("btnGerarPDF");

// MODAL EDIÇÃO
const modal = document.getElementById("modalManual");
const origemInput = document.getElementById("origemManual");
const valorInput = document.getElementById("valorManual");
const vencimentoInput = document.getElementById("vencimentoManual");

const btnSalvar = document.getElementById("btnSalvarManual");
const btnCancelar = document.getElementById("btnCancelarManual");

let editandoId = null;

// ======================================================
// INIT
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  carregarLancamentos();
});

btnFiltrar?.addEventListener("click", carregarLancamentos);
btnGerarPDF?.addEventListener("click", gerarPDF);

// ======================================================
// FORMATADORES
// ======================================================
function formatarValor(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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
  tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
  totalEl.innerText = "R$ 0,00";

  let query = supabase
    .from("contas_receber")
    .select("id, origem, valor, vencimento, status")
    .order("vencimento", { ascending: true });

  if (filtroStatus?.value) {
    query = query.eq("status", filtroStatus.value);
  }

  if (filtroVencimento?.value) {
    query = query.lte("vencimento", filtroVencimento.value);
  }

  const { data, error } = await query;

  if (error) {
    console.error("ERRO CONTAS_RECEBER:", error);
    tbody.innerHTML =
      "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='5'>Nenhum lançamento</td></tr>";
    return;
  }

  let total = 0;
  tbody.innerHTML = "";

  data.forEach((l) => {
    total += Number(l.valor || 0);

    const tr = document.createElement("tr");
    if (l.status === "VENCIDO") tr.classList.add("vencido");

    tr.innerHTML = `
      <td>${l.origem || "-"}</td>
      <td>${formatarValor(l.valor)}</td>
      <td>${formatarData(l.vencimento)}</td>
      <td>${l.status}</td>
      <td>
        <button class="btn-editar" data-id="${l.id}">Editar</button>
        <button class="btn-pagar btn-vermelho" data-id="${l.id}">Pagar</button>
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
  document.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalEdicao(btn.dataset.id));
  });

  document.querySelectorAll(".btn-pagar").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert("Pagar ID: " + btn.dataset.id);
    });
  });
}

// ======================================================
// MODAL – EDIÇÃO (SOMENTE FRONT)
// ======================================================
async function abrirModalEdicao(id) {
  editandoId = id;

  const { data, error } = await supabase
    .from("contas_receber")
    .select("origem, valor, vencimento")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar dados para edição");
    return;
  }

  origemInput.value = data.origem || "";
  valorInput.value = data.valor || "";
  vencimentoInput.value = data.vencimento || "";

  modal.classList.add("ativo");
}

// FECHAR MODAL SEM SALVAR
btnCancelar?.addEventListener("click", () => {
  modal.classList.remove("ativo");
  editandoId = null;
});

// SALVAR (NÃO GRAVA – SEGURANÇA TOTAL)
btnSalvar?.addEventListener("click", () => {
  modal.classList.remove("ativo");
  editandoId = null;
});

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
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .save()
    .then(() => {
      document.body.classList.remove("modo-pdf");
    });
}
