import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaProdutos = [];
let produtoEditandoId = null;

// Conversão BR
function parseDecimalBR(val) {
  if (!val) return null;
  return parseFloat(val.replace(/\./g, "").replace(",", "."));
}

function formatDecimal(val, casas = 2) {
  if (val == null) return "";
  return Number(val).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

// Carregar produtos
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  listaProdutos = data;
  renderizarTabela();
}

// Renderizar tabela
function renderizarTabela() {
  const tbody = document.getElementById("listaProdutos");
  tbody.innerHTML = "";

  listaProdutos.forEach(prod => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${prod.codigo}</td>
      <td>${prod.descricao}</td>
      <td>${prod.unidade}</td>
      <td>${formatDecimal(prod.comprimento_mm, 2)}</td>
      <td>${prod.acabamento}</td>
      <td>${formatDecimal(prod.peso_liquido, 3)}</td>
      <td>${formatDecimal(prod.peso_bruto, 3)}</td>
      <td>${formatDecimal(prod.preco_custo, 2)}</td>
      <td>${formatDecimal(prod.preco_venda, 2)}</td>
      <td>
        <button class="edit-btn" onclick="editarProduto('${prod.id}')">Editar</button>
        <button class="delete-btn" onclick="excluirProduto('${prod.id}')">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Salvar produto
document.getElementById("btnSalvar").addEventListener("click", async () => {
  const novo = {
    codigo: document.getElementById("codigo").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    unidade: document.getElementById("unidade").value.trim(),
    comprimento_mm: parseDecimalBR(document.getElementById("comprimento_mm").value),
    acabamento: document.getElementById("acabamento").value.trim(),
    peso_liquido: parseDecimalBR(document.getElementById("peso_liquido").value),
    peso_bruto: parseDecimalBR(document.getElementById("peso_bruto").value),
    preco_custo: parseDecimalBR(document.getElementById("preco_custo").value),
    preco_venda: parseDecimalBR(document.getElementById("preco_venda").value)
  };

  await supabase.from("produtos").insert([novo]);
  carregarProdutos();
});

// ======================
//  FUNÇÕES GLOBAIS
// ======================

// Editar produto
window.editarProduto = function (id) {
  produtoEditandoId = id;
  const prod = listaProdutos.find(p => p.id === id);

  document.getElementById("editFields").innerHTML = `
    <label>Código</label>
    <input id="edit_codigo" value="${prod.codigo}">
    <label>Descrição</label>
    <input id="edit_descricao" value="${prod.descricao}">
    <label>Unidade</label>
    <input id="edit_unidade" value="${prod.unidade}">
    <label>Comprimento (mm)</label>
    <input id="edit_comprimento_mm" value="${formatDecimal(prod.comprimento_mm,2)}">
    <label>Acabamento</label>
    <input id="edit_acabamento" value="${prod.acabamento}">
    <label>Peso Líquido</label>
    <input id="edit_peso_liquido" value="${formatDecimal(prod.peso_liquido,3)}">
    <label>Peso Bruto</label>
    <input id="edit_peso_bruto" value="${formatDecimal(prod.peso_bruto,3)}">
    <label>Preço Custo</label>
    <input id="edit_preco_custo" value="${formatDecimal(prod.preco_custo,2)}">
    <label>Preço Venda</label>
    <input id="edit_preco_venda" value="${formatDecimal(prod.preco_venda,2)}">
  `;

  document.getElementById("editModal").style.display = "block";
};

// Fechar modal
window.fecharEdicao = function () {
  document.getElementById("editModal").style.display = "none";
};

// Salvar edição
window.salvarEdicao = async function () {
  const atualizado = {
    codigo: document.getElementById("edit_codigo").value.trim(),
    descricao: document.getElementById("edit_descricao").value.trim(),
    unidade: document.getElementById("edit_unidade").value.trim(),
    comprimento_mm: parseDecimalBR(document.getElementById("edit_comprimento_mm").value),
    acabamento: document.getElementById("edit_acabamento").value.trim(),
    peso_liquido: parseDecimalBR(document.getElementById("edit_peso_liquido").value),
    peso_bruto: parseDecimalBR(document.getElementById("edit_peso_bruto").value),
    preco_custo: parseDecimalBR(document.getElementById("edit_preco_custo").value),
    preco_venda: parseDecimalBR(document.getElementById("edit_preco_venda").value)
  };

  await supabase.from("produtos").update(atualizado).eq("id", produtoEditandoId);
  fecharEdicao();
  carregarProdutos();
};

// Excluir produto
window.excluirProduto = async function (id) {
  if (!confirm("Excluir este produto?")) return;
  await supabase.from("produtos").delete().eq("id", id);
  carregarProdutos();
};

// Filtro
document.getElementById("buscarCodigo").addEventListener("input", () => {
  const termo = document.getElementById("buscarCodigo").value.toLowerCase();
  const filtrado = listaProdutos.filter(p => p.codigo.toLowerCase().includes(termo));

  const tbody = document.getElementById("listaProdutos");
  tbody.innerHTML = "";

  filtrado.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>${p.unidade}</td>
      <td>${formatDecimal(p.comprimento_mm, 2)}</td>
      <td>${p.acabamento}</td>
      <td>${formatDecimal(p.peso_liquido, 3)}</td>
      <td>${formatDecimal(p.peso_bruto, 3)}</td>
      <td>${formatDecimal(p.preco_custo, 2)}</td>
      <td>${formatDecimal(p.preco_venda, 2)}</td>
      <td>
        <button class="edit-btn" onclick="editarProduto('${p.id}')">Editar</button>
        <button class="delete-btn" onclick="excluirProduto('${p.id}')">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
});

// Eventos do modal INCLUÍDOS
document.getElementById("btnCancelarEdicao").addEventListener("click", fecharEdicao);
document.getElementById("btnSalvarEdicao").addEventListener("click", salvarEdicao);

// Inicializar
carregarProdutos();
