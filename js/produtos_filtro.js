// =========================================
// SUPABASE (VERSÃO CORRETA PARA VERCEL)
// =========================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS DA TELA
const selectProduto = document.getElementById("produtoSelect");
const tbody = document.querySelector("#tabelaResultados tbody");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnImprimir = document.getElementById("btnImprimir");

const spanDataPrint = document.getElementById("dataGeradaPrint");
const spanNomeProdutoPrint = document.getElementById("nomeProdutoPrint");

// Cache local de produtos para não ficar consultando toda hora
let produtosCache = [];

// =========================================
// INICIALIZAÇÃO
// =========================================
iniciar();

async function iniciar() {
  await carregarProdutos();
  preencherSelect();
  preencherTabela(produtosCache);      // início: lista completa
  atualizarInfoPrintTodos();
}

// =========================================
// CARREGAR PRODUTOS DO SUPABASE
// =========================================
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    alert("Erro ao carregar produtos.");
    return;
  }

  produtosCache = data || [];
}

// =========================================
// PREENCHER SELECT COM "TODOS" + TODOS OS CÓDIGOS/DESCRIÇÕES
// =========================================
function preencherSelect() {
  selectProduto.innerHTML = "";

  // opção "TODOS"
  const optTodos = document.createElement("option");
  optTodos.value = "";
  optTodos.textContent = "TODOS OS PRODUTOS";
  selectProduto.appendChild(optTodos);

  // demais produtos
  produtosCache.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id; // usamos o id para filtrar depois
    opt.textContent = `${p.codigo} - ${p.descricao}`;
    selectProduto.appendChild(opt);
  });
}

// =========================================
// PREENCHER TABELA (LISTA COMPLETA OU FILTRADA)
// =========================================
function preencherTabela(lista) {
  tbody.innerHTML = "";

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center">Nenhum produto encontrado.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>${p.comprimento_mm}</td>
      <td>${p.peso_liquido}</td>
      <td>${p.peso_bruto}</td>
      <td>${p.valor_unitario}</td>
      <td>${p.acabamento}</td>
    `;

    tbody.appendChild(tr);
  });
}

// =========================================
// FILTRAR QUANDO CLICA EM "FILTRAR"
// =========================================
btnFiltrar.addEventListener("click", () => {
  const idSelecionado = selectProduto.value;

  // Se for vazio → TODOS
  if (!idSelecionado) {
    preencherTabela(produtosCache);
    atualizarInfoPrintTodos();
    return;
  }

  // Filtra apenas o produto selecionado
  const selecionado = produtosCache.find((p) => String(p.id) === String(idSelecionado));

  if (!selecionado) {
    preencherTabela([]);
    spanNomeProdutoPrint.textContent = "Produto não encontrado";
    return;
  }

  preencherTabela([selecionado]);
  atualizarInfoPrintProduto(selecionado);
});

// =========================================
// IMPRESSÃO
// =========================================
btnImprimir.addEventListener("click", () => {
  // Atualiza data da impressão sempre que imprimir
  spanDataPrint.textContent = new Date().toLocaleString("pt-BR");
  window.print();
});

// =========================================
// ATUALIZA TEXTO DO CABEÇALHO DE IMPRESSÃO
// =========================================
function atualizarInfoPrintTodos() {
  spanDataPrint.textContent = new Date().toLocaleString("pt-BR");
  spanNomeProdutoPrint.textContent = "TODOS OS PRODUTOS";
}

function atualizarInfoPrintProduto(p) {
  spanDataPrint.textContent = new Date().toLocaleString("pt-BR");
  spanNomeProdutoPrint.textContent = `${p.codigo} - ${p.descricao}`;
}
