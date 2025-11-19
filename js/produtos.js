import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lista na memória
let listaProdutos = [];
let produtoEditandoId = null;

// Helpers para número em formato BR
function parseDecimalBR(valor) {
  if (!valor) return null;
  let v = valor.toString().trim();
  v = v.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
}

function formatDecimal(valor, casas = 2) {
  if (valor == null || valor === "") return "";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

// Mostrar mensagens
function mostrarMensagem(texto, erro = true) {
  const msg = document.getElementById("mensagem");
  msg.style.color = erro ? "#ff6b6b" : "#22c55e";
  msg.textContent = texto;
  setTimeout(() => (msg.textContent = ""), 3000);
}

// Carregar produtos
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    mostrarMensagem("Erro ao carregar produtos.", true);
    return;
  }

  listaProdutos = data || [];
  renderizarTabela(listaProdutos);
}

// Renderizar tabela
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
        <button class="edit-btn" onclick="editarProduto('${prod.id}')">Editar</button>
        <button class="delete-btn" onclick="excluirProduto('${prod.id}')">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Salvar novo produto
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
    mostrarMensagem("Erro ao salvar o produto.", true);
  } else {
    mostrarMensagem("Produto salvo com sucesso!", false);
    carregarProdutos();
  }
});

// Excluir produto
async function excluirProduto(id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    mostrarMensagem("Erro ao excluir.", true);
  } else {
    mostrarMensagem("Produto excluído!", false);
    carregarProdutos();
  }
}

// Editar produto (abrir modal)
window.editarProduto = function (id) {
  produtoEditandoId = id;
  const prod = listaProdutos.find(p => p.id === id);

  const campos = `
    <label>Código</label>
    <input id="edit_codigo" value="${prod.codigo}">
    
    <label>Descrição</label>
    <input id="edit_descricao" value="${prod.descricao}">
    
    <label>Unidade</label>
    <input id="edit_unidade" value="${prod.unidade}">
    
    <label>Comprimento (mm)</label>
    <input id="edit_comprimento_mm" value="${formatDecimal(prod.comprimento_mm, 2)}">
    
    <label>Acabamento</label>
    <input id="edit_acabamento" value="${prod.acabamento}">
    
    <label>Peso Líquido</label>
    <input id="edit_peso_liquido" value="${formatDecimal(prod.peso_liquido, 3)}">
    
    <label>Peso Bruto</label>
    <input id="edit_peso_bruto" value="${formatDecimal(prod.peso_bruto, 3)}">
    
    <label>Preço de Custo</label>
    <input id="edit_preco_custo" value="${formatDecimal(prod.preco_custo, 2)}">
    
    <label>Preço de Venda</label>
    <input id="edit_preco_venda" value="${formatDecimal(prod.preco_venda, 2)}">
  `;

  document.getElementById("editFields").innerHTML = campos;
  document.getElementById("editModal").style.display = "block";
};

// Fechar modal
window.fecharEdicao = () => {
  document.getElementById("editModal").style.display = "none";
};

// Salvar edição
window.salvarEdicao = async () => {
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

  const { error } = await supabase.from("produtos").update(atualizado).eq("id", produtoEditandoId);

  if (error) {
    mostrarMensagem("Erro ao atualizar.", true);
  } else {
    mostrarMensagem("Produto atualizado!", false);
    fecharEdicao();
    carregarProdutos();
  }
};

// Busca por código
document.getElementById("buscarCodigo").addEventListener("input", () => {
  const termo = document.getElementById("buscarCodigo").value.trim().toLowerCase();
  const filtrado = listaProdutos.filter(p => p.codigo.toLowerCase().includes(termo));
  renderizarTabela(filtrado);
});

// Inicialização
carregarProdutos();
