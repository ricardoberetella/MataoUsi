import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS
const campoBusca = document.getElementById("campoBusca");
const datalist = document.getElementById("listaProdutosDatalist");
const btnBuscar = document.getElementById("btnBuscar");
const tabela = document.querySelector("#tabelaResultados tbody");

let produtosCache = [];

// NÃO CARREGA TABELA AO ABRIR
carregarProdutosParaDatalist();

/* ============================================
   CARREGAR PRODUTOS E POPULAR A LISTA SUSPENSA
============================================ */
async function carregarProdutosParaDatalist() {
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

  datalist.innerHTML = "";

  // Opção TODOS
  const optTodos = document.createElement("option");
  optTodos.value = "TODOS";
  datalist.appendChild(optTodos);

  // Demais produtos
  data.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = `${p.codigo} - ${p.descricao}`;
    opt.dataset.id = p.id; // Guarda ID oculto
    datalist.appendChild(opt);
  });
}

/* ============================================
               BOTÃO BUSCAR
============================================ */
btnBuscar.addEventListener("click", filtrar);

function filtrar() {
  const valor = campoBusca.value.trim();

  // Se selecionar TODOS
  if (valor === "TODOS") {
    preencherTabela(produtosCache);
    return;
  }

  // Achar item selecionado
  const produto = produtosCache.find(p => `${p.codigo} - ${p.descricao}` === valor);

  if (!produto) {
    tabela.innerHTML = `
      <tr><td colspan="7" style="text-align:center">Nenhum produto encontrado</td></tr>
    `;
    return;
  }

  // Exibir somente o produto escolhido
  preencherTabela([produto]);
}

/* ============================================
           PREENCHER TABELA RESULTADO
============================================ */
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

/* ============================================
                 IMPRIMIR
============================================ */
document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});
