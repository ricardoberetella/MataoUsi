import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaProdutos = [];
let produtoEditandoId = null;

// Helpers para número com vírgula
function parseDecimalBR(valor) {
  if (!valor) return null;
  let v = valor.toString().trim();
  if (v === "") return null;
  v = v.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
}

function formatDecimalBR(valor, casas = 2) {
  if (valor === null || valor === undefined) return "";
  const num = typeof valor === "number" ? valor : parseFloat(valor);
  if (isNaN(num)) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function mostrarMensagem(elemento, texto, tipo) {
  if (!elemento) return;
  if (!texto) {
    elemento.style.display = "none";
    elemento.textContent = "";
    return;
  }
  elemento.textContent = texto;
  elemento.className = tipo === "sucesso" ? "msg-sucesso" : "msg-erro";
  elemento.style.display = "block";
}

// Carregar produtos do Supabase
async function carregarProdutos() {
  const tbody = document.querySelector("#tabelaProdutos tbody");
  if (tbody) tbody.innerHTML = "<tr><td colspan='10'>Carregando...</td></tr>";

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("sku", { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10">Erro ao carregar produtos.</td></tr>`;
    }
    return;
  }

  listaProdutos = data || [];
  renderizarTabela(listaProdutos);
}

function renderizarTabela(produtos) {
  const tbody = document.querySelector("#tabelaProdutos tbody");
  if (!tbody) return;

  if (!produtos || produtos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  produtos.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.sku || ""}</td>
      <td>${p.descricao || ""}</td>
      <td>${p.unidade || ""}</td>
      <td>${formatDecimalBR(p.comprimento_mm, 2)}</td>
      <td>${p.acabamento || ""}</td>
      <td>${formatDecimalBR(p.peso_liquido, 3)}</td>
      <td>${formatDecimalBR(p.peso_bruto, 3)}</td>
      <td>R$ ${formatDecimalBR(p.preco_custo, 2)}</td>
      <td>R$ ${formatDecimalBR(p.preco_venda, 2)}</td>
      <td class="col-acoes">
        <button class="btn-acao btn-editar" data-id="${p.id}">Editar</button>
        <button class="btn-acao btn-excluir" data-id="${p.id}">Excluir</button>
      </td>
    `;

    const btnEditar = tr.querySelector(".btn-editar");
    const btnExcluir = tr.querySelector(".btn-excluir");

    btnEditar.addEventListener("click", () => abrirModalEdicao(p.id));
    btnExcluir.addEventListener("click", () => excluirProduto(p.id));

    tbody.appendChild(tr);
  });
}

// Filtrar por código (sku)
function filtrarProdutosPorCodigo(texto) {
  const termo = texto.trim().toLowerCase();
  if (termo === "") {
    renderizarTabela(listaProdutos);
    return;
  }

  const filtrados = listaProdutos.filter((p) =>
    (p.sku || "").toLowerCase().includes(termo)
  );

  renderizarTabela(filtrados);
}

// Salvar novo produto
async function onSubmitNovoProduto(event) {
  event.preventDefault();

  const form = event.target;
  const msg = document.getElementById("mensagemForm");

  const sku = form.codigo.value.trim();
  const descricao = form.descricao.value.trim();
  const unidade = form.unidade.value.trim();
  const comprimento = parseDecimalBR(form.comprimento.value);
  const acabamento = form.acabamento.value.trim();
  const peso_liquido = parseDecimalBR(form.peso_liquido.value);
  const peso_bruto = parseDecimalBR(form.peso_bruto.value);
  const preco_custo = parseDecimalBR(form.preco_custo.value);
  const preco_venda = parseDecimalBR(form.preco_venda.value);

  if (!sku || !descricao) {
    mostrarMensagem(msg, "Código e descrição são obrigatórios.", "erro");
    return;
  }

  const novoProduto = {
    sku,
    descricao,
    unidade,
    comprimento_mm: comprimento,
    acabamento,
    peso_liquido,
    peso_bruto,
    preco_custo,
    preco_venda
  };

  const { data, error } = await supabase
    .from("produtos")
    .insert([novoProduto])
    .select();

  if (error) {
    console.error("Erro ao salvar produto:", error);
    mostrarMensagem(msg, "Erro ao salvar o produto.", "erro");
    return;
  }

  mostrarMensagem(msg, "Produto salvo com sucesso!", "sucesso");
  form.reset();

  if (data && data.length > 0) {
    listaProdutos.push(data[0]);
    renderizarTabela(listaProdutos);
  } else {
    await carregarProdutos();
  }

  setTimeout(() => mostrarMensagem(msg, "", "erro"), 2000);
}

// Abrir modal com dados do produto
function abrirModalEdicao(id) {
  const produto = listaProdutos.find((p) => p.id === id);
  if (!produto) return;

  produtoEditandoId = id;

  document.getElementById("edit_id").value = produto.id;
  document.getElementById("edit_codigo").value = produto.sku || "";
  document.getElementById("edit_descricao").value = produto.descricao || "";
  document.getElementById("edit_unidade").value = produto.unidade || "";
  document.getElementById("edit_comprimento").value = formatDecimalBR(produto.comprimento_mm, 2);
  document.getElementById("edit_acabamento").value = produto.acabamento || "";
  document.getElementById("edit_peso_liquido").value = formatDecimalBR(produto.peso_liquido, 3);
  document.getElementById("edit_peso_bruto").value = formatDecimalBR(produto.peso_bruto, 3);
  document.getElementById("edit_preco_custo").value = formatDecimalBR(produto.preco_custo, 2);
  document.getElementById("edit_preco_venda").value = formatDecimalBR(produto.preco_venda, 2);

  document.getElementById("modalEditar").classList.remove("hidden");
}

// Fechar modal
function fecharModalEdicao() {
  document.getElementById("modalEditar").classList.add("hidden");
  produtoEditandoId = null;
  mostrarMensagem(document.getElementById("mensagemEditar"), "", "erro");
}

// Salvar alterações
async function onSubmitEditarProduto(event) {
  event.preventDefault();

  if (!produtoEditandoId) return;

  const msg = document.getElementById("mensagemEditar");

  const id = document.getElementById("edit_id").value;
  const sku = document.getElementById("edit_codigo").value.trim();
  const descricao = document.getElementById("edit_descricao").value.trim();
  const unidade = document.getElementById("edit_unidade").value.trim();
  const comprimento = parseDecimalBR(document.getElementById("edit_comprimento").value);
  const acabamento = document.getElementById("edit_acabamento").value.trim();
  const peso_liquido = parseDecimalBR(document.getElementById("edit_peso_liquido").value);
  const peso_bruto = parseDecimalBR(document.getElementById("edit_peso_bruto").value);
  const preco_custo = parseDecimalBR(document.getElementById("edit_preco_custo").value);
  const preco_venda = parseDecimalBR(document.getElementById("edit_preco_venda").value);

  if (!sku || !descricao) {
    mostrarMensagem(msg, "Código e descrição são obrigatórios.", "erro");
    return;
  }

  const dadosAtualizados = {
    sku,
    descricao,
    unidade,
    comprimento_mm: comprimento,
    acabamento,
    peso_liquido,
    peso_bruto,
    preco_custo,
    preco_venda,
    atualizado_em: new Date().toISOString()
  };

  const { error } = await supabase
    .from("produtos")
    .update(dadosAtualizados)
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar produto:", error);
    mostrarMensagem(msg, "Erro ao atualizar o produto.", "erro");
    return;
  }

  mostrarMensagem(msg, "Produto atualizado com sucesso!", "sucesso");

  // Atualiza na lista local
  const idx = listaProdutos.findIndex((p) => p.id === id || p.id === Number(id));
  if (idx !== -1) {
    listaProdutos[idx] = { ...listaProdutos[idx], ...dadosAtualizados };
  }

  renderizarTabela(listaProdutos);

  setTimeout(() => {
    fecharModalEdicao();
  }, 800);
}

// Excluir produto
async function excluirProduto(id) {
  const confirma = window.confirm("Tem certeza que deseja excluir este produto?");
  if (!confirma) return;

  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir produto:", error);
    alert("Erro ao excluir o produto.");
    return;
  }

  listaProdutos = listaProdutos.filter((p) => p.id !== id);
  renderizarTabela(listaProdutos);
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const formNovo = document.getElementById("produtoForm");
  const formEditar = document.getElementById("formEditar");
  const inputBusca = document.getElementById("buscaCodigo");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const btnCancelarModal = document.getElementById("btnCancelarModal");
  const modal = document.getElementById("modalEditar");

  if (formNovo) {
    formNovo.addEventListener("submit", onSubmitNovoProduto);
  }

  if (formEditar) {
    formEditar.addEventListener("submit", onSubmitEditarProduto);
  }

  if (inputBusca) {
    inputBusca.addEventListener("input", (e) => {
      filtrarProdutosPorCodigo(e.target.value);
    });
  }

  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", fecharModalEdicao);
  }

  if (btnCancelarModal) {
    btnCancelarModal.addEventListener("click", fecharModalEdicao);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        fecharModalEdicao();
      }
    });
  }

  carregarProdutos();
});
