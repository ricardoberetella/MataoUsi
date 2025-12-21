// ===============================================
// FILTRO DE PRODUTOS — VERSÃO PROTEGIDA
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

// ===============================================
// PROTEGER A PÁGINA (LOGIN OBRIGATÓRIO)
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin(); // 🔒 impede entrar sem login
    if (!user) return;

    // Viewer e Admin podem acessar (somente consulta)
    console.log("Acesso permitido para:", user.email);
});

// ===============================================
// CARREGAMENTO SUPABASE (ORIGINAL MANTIDO)
// ===============================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const supabase2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS
const selectBusca = document.getElementById("selectBusca");
const btnBuscar = document.getElementById("btnBuscar");
const tabela = document.querySelector("#tabelaResultados tbody");

let produtosCache = [];

/* ============================
   FORMATADORES (ORIGINAIS)
============================ */
function fmt1(v) {
  if (v == null) return "";
  return Number(v).toFixed(1).replace(".", ",");
}

function fmt3(v) {
  if (v == null) return "";
  return Number(v).toFixed(3).replace(".", ",");
}

function fmt2money(v) {
  if (v == null) return "R$ 0,00";
  return "R$ " + Number(v).toFixed(2).replace(".", ",");
}

/* ============================================================
   CARREGA PRODUTOS PARA O SELECT
============================================================ */
async function carregarProdutosParaSelect() {
  const { data, error } = await supabase2
    .from("produtos")
    .select("*")
    .order("codigo");

  if (error) {
    console.error(error);
    alert("Erro ao carregar produtos");
    return;
  }

  produtosCache = data;

  selectBusca.innerHTML = "";

  // Opção TODOS
  const optTodos = document.createElement("option");
  optTodos.value = "TODOS";
  optTodos.textContent = "TODOS";
  selectBusca.appendChild(optTodos);

  // Demais produtos
  data.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.codigo} - ${p.descricao}`;
    selectBusca.appendChild(opt);
  });
}

/* ============================================================
                       FILTRAR
============================================================ */
btnBuscar.addEventListener("click", filtrar);

function filtrar() {
  const valor = selectBusca.value;

  if (valor === "TODOS") {
    preencherTabela(produtosCache);
    return;
  }

  const produto = produtosCache.find((p) => p.id == valor);

  if (!produto) {
    tabela.innerHTML = `
      <tr><td colspan="7" style="text-align:center">Nenhum produto encontrado</td></tr>
    `;
    return;
  }

  preencherTabela([produto]);
}

/* ============================================================
                   PREENCHER TABELA
============================================================ */
function preencherTabela(lista) {
  tabela.innerHTML = "";

  lista.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>${fmt1(p.comprimento_mm)}</td>
      <td>${fmt3(p.peso_liquido)}</td>
      <td>${fmt3(p.peso_bruto)}</td>
      <td>${fmt2money(p.valor_unitario)}</td>
      <td>${p.acabamento}</td>
    `;

    tabela.appendChild(tr);
  });
}

/* ============================================================
                        IMPRIMIR
============================================================ */
document.getElementById("btnImprimir").addEventListener("click", () => {
  const dataHora = new Date().toLocaleString("pt-BR");
  const span = document.getElementById("dataGeradaPrint");
  if (span) span.textContent = dataHora;
  window.print();
});

// Iniciar
carregarProdutosParaSelect();
