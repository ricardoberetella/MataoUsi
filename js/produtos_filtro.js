import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS
const selectBusca = document.getElementById("selectBusca");
const btnBuscar = document.getElementById("btnBuscar");
const tabela = document.querySelector("#tabelaResultados tbody");

let produtosCache = [];

// CARREGAR ITENS NO SELECT AO ABRIR
carregarProdutosParaSelect();

/* ============================================================
   CARREGA PRODUTOS PARA O SELECT (SEM POPUP GIGANTE)
============================================================ */
async function carregarProdutosParaSelect() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo");

  if (error) {
    console.error(error);
    alert("Erro ao carregar produtos");
    return;
  }

  produtosCache = data;

  // Limpa select
  selectBusca.innerHTML = "";

  // Opção TODOS
  const optTodos = document.createElement("option");
  optTodos.value = "TODOS";
  optTodos.textContent = "TODOS";
  selectBusca.appendChild(optTodos);

  // Adiciona produtos
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

  // Se selecionar TODOS
  if (valor === "TODOS") {
    preencherTabela(produtosCache);
    return;
  }

  // Busca produto pelo ID
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
      <td>${p.comprimento_mm}</td>
      <td>${p.peso_liquido}</td>
      <td>${p.peso_bruto}</td>
      <td>${p.valor_unitario}</td>
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
  document.getElementById("dataGeradaPrint").textContent = dataHora;
  window.print();
});
