// ======================================
// IMPORTS DO SUPABASE
// ======================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lista em memória
let listaProdutos = [];
let produtoEditandoId = null;

// ======================================
// FUNÇÕES DE CONVERSÃO (BR <-> US)
// ======================================

// "1.234,56" -> 1234.56
function parseDecimalBR(valor) {
  if (!valor) return null;
  return parseFloat(valor.replace(/\./g, "").replace(",", "."));
}

// número -> "1.234,56"
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
    alert("Erro ao carregar produtos.");
    return;
  }

  listaProdutos = data || [];
  renderizarTabela(listaProdutos);
}

// ======================================
// RENDERIZAR TABELA
// ======================================
function renderizarTabela(lista) {
  const tbody = document.getElementById("listaProdutos");
  tbody.innerHTML = "";

  lista.forEach(prod => {
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
        <button class="edit-btn">Editar</button>
        <button class="delete-btn">Excluir</button>
      </td>
    `;

    // Botão editar
    const btnEdit = tr.querySelector(".edit-btn");
    btnEdit.addEventListener("click", () => {
      abrirEdicao(prod.id);
    });

    // Botão excluir
    const btnDel = tr.querySelector(".delete-btn");
    btnDel.addEventListener("click", () => {
      excluirProduto(prod.id);
    });

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

  // Limpa o formulário (opcional)
  document.getElementById("codigo").value = "";
  document.getElementById("descricao").value = "";
  document.getElementById("unidade").value = "";
  document.getElementById("comprimento_mm").value = "";
  document.getElementById("acabamento").value = "";
  document.getElementById("peso_liquido").value = "";
  document.getElementById("peso_bruto").value = "";
  document.getElementById("preco_custo").value = "";
  document.getElementById("preco_venda").value = "";

  await carregarProdutos();
});

// ======================================
// ABRIR MODAL DE EDIÇÃO
// ======================================
function abrirEdicao(id) {
  produtoEditandoId = id;
  const prod = listaProdutos.find(p => p.id === id);
  if (!prod) return;

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

// Botões do modal
document.getElementById("btnCancelarEdicao").addEventListener("click", fecharEdicao);
document.getElementById("btnSalvarEdicao").addEventListener("click", salvarEdicao);

// ======================================
// SALVAR EDIÇÃO
// ======================================
async function salvarEdicao() {
  if (!produtoEditandoId) return;

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
    alert("Erro ao atualizar produto!");
    return;
  }

  fecharEdicao();
  await carregarProdutos();
}

// ======================================
// EXCLUIR PRODUTO
// ======================================
async function excluirProduto(id) {
  if (!confirm("Excluir este produto?")) return;

  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir:", error);
    alert("Erro ao excluir produto!");
    return;
  }

  await carregarProdutos();
}

// ======================================
// FILTRO POR CÓDIGO
// ======================================
document.getElementById("buscarCodigo").addEventListener("input", () => {
  const termo = document.getElementById("buscarCodigo").value.toLowerCase();

  const filtrado = listaProdutos.filter(p =>
    p.codigo.toLowerCase().includes(termo)
  );

  renderizarTabela(filtrado);
});

// ======================================
// INICIALIZAÇÃO
// ======================================
carregarProdutos();
