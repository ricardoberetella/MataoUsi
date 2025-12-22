// ===============================================
// CONTAS_RECEBER.JS — BOLETOS + NF (numero_nf)
// FILTROS OK + SEM 400 + SEM CAMPOS INEXISTENTES
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = []; // [{ id, valor, data_vencimento, nota_fiscal_id, numero_nf }]
let mapaNF = {};    // { [idNotaFiscal]: numero_nf }

// ===============================================
function formatarDataBR(data) {
  if (!data) return "—";
  const d = new Date(data);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
  const n = Number(valor);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function soDataISO(value) {
  if (!value) return "";
  // aceita "YYYY-MM-DD" ou timestamp
  return String(value).includes("T") ? String(value).split("T")[0] : String(value);
}

function calcularStatus(r) {
  // Se no futuro você criar colunas, isso já aproveita automaticamente:
  // - status (texto)
  // - pago (boolean)
  // - data_pagamento (date)
  // - pago_em (date)
  let statusBase =
    (typeof r.status === "string" && r.status) ? r.status.toUpperCase() :
    (r.pago === true) ? "PAGO" :
    (r.data_pagamento) ? "PAGO" :
    (r.pago_em) ? "PAGO" :
    "ABERTO";

  const hoje = new Date().toISOString().split("T")[0];
  const venc = soDataISO(r.data_vencimento);

  if (statusBase === "ABERTO" && venc && venc < hoje) return "VENCIDO";
  return statusBase;
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  roleUsuario = user.user_metadata?.role || "viewer";

  const btn = document.getElementById("btnFiltrar");
  if (btn) btn.onclick = aplicarFiltros;

  await carregarDados();
  renderizarTabela();
});

// ===============================================
async function carregarDados() {
  // 1) Busca boletos (somente colunas garantidas)
  const { data: boletos, error } = await supabase
    .from("boletos")
    .select("id, valor, data_vencimento, nota_fiscal_id")
    .order("data_vencimento", { ascending: true });

  if (error) {
    console.error("Erro boletos:", error);
    alert("Erro ao carregar contas a receber");
    registros = [];
    mapaNF = {};
    return;
  }

  registros = (boletos || []).map(b => ({
    ...b,
    numero_nf: "—"
  }));

  // 2) Mapa NF (numero_nf) a partir de notas_fiscais
  const idsNF = [...new Set(registros.map(r => r.nota_fiscal_id).filter(Boolean))];

  mapaNF = {};
  if (idsNF.length > 0) {
    const { data: notas, error: errNF } = await supabase
      .from("notas_fiscais")
      .select("id, numero_nf")
      .in("id", idsNF);

    if (errNF) {
      console.error("Erro notas_fiscais:", errNF);
    } else {
      (notas || []).forEach(n => {
        mapaNF[n.id] = n.numero_nf;
      });
    }
  }

  // aplica numero_nf em cada boleto
  registros = registros.map(r => ({
    ...r,
    numero_nf: r.nota_fiscal_id ? (mapaNF[r.nota_fiscal_id] ?? "—") : "—"
  }));
}

// ===============================================
function aplicarFiltros() {
  renderizarTabela();
}

// ===============================================
function renderizarTabela() {
  const tbody = document.getElementById("listaReceber");
  if (!tbody) return;

  tbody.innerHTML = "";

  const statusFiltro = (document.getElementById("filtroStatus")?.value || "").toUpperCase();
  const vencimentoFiltro = soDataISO(document.getElementById("filtroVencimento")?.value || "");

  let total = 0;

  registros.forEach(r => {
    const statusCalc = calcularStatus(r);
    const vencISO = soDataISO(r.data_vencimento);

    if (statusFiltro && statusFiltro !== statusCalc) return;
    if (vencimentoFiltro && vencISO && vencISO > vencimentoFiltro) return;

    total += Number(r.valor) || 0;

    tbody.innerHTML += `
      <tr>
        <td style="text-align:center;">${r.numero_nf ?? "—"}</td>
        <td style="text-align:center;">${formatarMoeda(r.valor)}</td>
        <td style="text-align:center;">${formatarDataBR(r.data_vencimento)}</td>
        <td style="text-align:center;">${statusCalc}</td>
        <td style="text-align:center;">
          ${
            roleUsuario === "admin" && statusCalc === "ABERTO"
              ? `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`
              : "—"
          }
        </td>
      </tr>
    `;
  });

  const totalEl = document.getElementById("totalReceber");
  if (totalEl) totalEl.textContent = formatarMoeda(total);
}

// ===============================================
// AÇÃO PAGAR (admin)
// OBS: só funciona se você tiver um campo para registrar pagamento.
// ===============================================
window.marcarPago = async function (id) {
  if (roleUsuario !== "admin") return;

  // Se sua tabela boletos NÃO tem coluna status/data_pagamento, você precisa criar.
  // Aqui eu tento primeiro "status" e, se falhar, aviso.
  if (!confirm("Marcar como pago?")) return;

  // Tenta atualizar "status" (se existir)
  let resp = await supabase
    .from("boletos")
    .update({ status: "PAGO" })
    .eq("id", id);

  if (resp.error) {
    console.error("Erro update status:", resp.error);
    alert("Seu banco não tem coluna 'status' em boletos. Crie a coluna (status) para funcionar o botão Pagar.");
    return;
  }

  await carregarDados();
  renderizarTabela();
};
