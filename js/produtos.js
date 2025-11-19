// ======================================
// IMPORTS DO SUPABASE
// ======================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Cria o cliente
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lista em memória
let listaProdutos = [];
let produtoEditandoId = null;

// ======================================
// FUNÇÕES DE CONVERSÃO (BR <-> US)
// ======================================

// Ex: "1.234,56" → 1234.56
function parseDecimalBR(valor) {
  if (!valor) return null;
  return parseFloat(valor.replace(/\./g, "").replace(",", "."));
}

// Exibe valores no padrão BR
function formatDecimal(valor, casas = 2) {
  if (valor == null) return "";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

// ======================================
// CARREGAR PRODUTOS
// ======================================
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error("Erro ao carregar:", error);
    return;
  }

  listaProdutos = data;
  renderizarTabela();
}

// ======================================
// RENDERIZAR TABELA
// ======================================
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

// ======================================
// SALVAR NOVO PRODUTO
// ======================================
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

  const { error } = await supabase.from("produtos").insert([novo]);

  if (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao salvar produto!");
    return;
  }

  await carregarProdutos();
});

// ======================================
// EDITAR PRODUTO (ABRIR MODAL)
// ======================================
function editarProduto(id) {
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
}

// ======================================
// FECHAR MODAL
// ======================================
function fecharEdicao() {
  document.getElementById("editModal").style.display = "none";
}

// ======================================
// SALVAR EDIÇÃO
// ======================================
async function salvarEdicao() {
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

  const { error } = await supabase
    .from("produtos")
    .update(atualizado)
    .eq("id", produtoEditandoId);

  if (error) {
    console.error("Erro ao atualizar:", error);
    alert("Erro ao atualizar!");
    return;
  }

  fecharEdicao();
  carregarProdutos();
}

// ======================================
// EXCLUIR PRODUTO
// ======================================
async function excluirProduto(id) {
  if (!confirm("Excluir este produto?")) return;

  await supabase.from("produtos").delete().eq("id", id);
  carregarProdutos();
}

// ======================================
// FILTRO POR CÓDIGO
// ======================================
document.getElementById("buscarCodigo").addEventListener("input", () => {
  const termo = document.getElementById("buscarCodigo").value.toLowerCase();

  const filtrado = listaProdutos.filter(p =>
    p.codigo.toLowerCase().includes(termo)
  );

  const tbody = document.getElementById("listaProdutos");
  tbody.innerHTML = "";

  filtrado.forEach(prod => {
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
});

// ======================================
// Expor funções para o HTML (ESSENCIAL)
// ======================================
window.carregarProdutos = carregarProdutos;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.salvarEdicao = salvarEdicao;
window.fecharEdicao = fecharEdicao;

// Inicializa tudo
carregarProdutos();
