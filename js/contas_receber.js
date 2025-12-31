// ====================================================
// CONTAS_RECEBER.JS — FINAL ESTÁVEL
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

let registros = [];

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  await carregarLancamentos();
});

// ====================================================
function formatarData(valor) {
  if (!valor) return "-";
  const [a, m, d] = valor.split("-");
  return `${d}/${m}/${a}`;
}

function formatarValor(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ====================================================
async function carregarLancamentos() {
  // 🔴 ID CORRETO DO TBODY (HTML ATUAL)
  const tbody = document.querySelector("table tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5">Carregando...</td></tr>`;

  const { data, error } = await supabase
    .from("contas_receber")
    .select("*")
    .order("data_vencimento");

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar</td></tr>`;
    return;
  }

  registros = data || [];

  tbody.innerHTML = "";

  if (registros.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">Nenhum lançamento</td></tr>`;
    return;
  }

  registros.forEach(r => {
    const classe =
      r.status === "VENCIDO"
        ? "linha-vencido"
        : r.status === "PAGO"
        ? "linha-pago"
        : "";

    tbody.innerHTML += `
      <tr class="${classe}">
        <td>${r.origem || "-"}</td>
        <td>${formatarValor(r.valor)}</td>
        <td>${formatarData(r.data_vencimento)}</td>
        <td>${r.status}</td>
        <td class="acoes">
          <button class="btn-editar" onclick="editarLancamento(${r.id})">
            Editar
          </button>
          <button class="btn-pagar" onclick="pagarLancamento(${r.id})">
            Pagar
          </button>
        </td>
      </tr>
    `;
  });
}

// ====================================================
window.editarLancamento = function (id) {
  window.location.href = `contas_receber_editar.html?id=${id}`;
};

// ====================================================
window.pagarLancamento = async function (id) {
  if (!confirm("Confirmar pagamento?")) return;

  const { error } = await supabase
    .from("contas_receber")
    .update({
      status: "PAGO",
      data_pagamento: new Date(),
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao pagar");
    console.error(error);
    return;
  }

  carregarLancamentos();
};
