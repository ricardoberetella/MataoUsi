import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let itensPedido = [];
let listaProdutos = [];
let produtoAtual = null;

/* ================================
      FORMATAÇÃO NÚMEROS
================================ */
function parseDecimalBR(str) {
  if (!str) return 0;
  return Number(str.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatDecimalBR(val) {
  return Number(val || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ================================
      AO CARREGAR A TELA
================================ */
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();

  document.getElementById("data_pedido").value =
    new Date().toISOString().slice(0, 10);

  // Referências
  const codigoInput = document.getElementById("codigo_produto");
  const btnBuscar = document.getElementById("btnBuscarProduto");
  const btnAdd = document.getElementById("btnAdicionarItem");
  const btnSalvar = document.getElementById("btnSalvarPedido");

  // Modal
  window.modalProdutos = document.getElementById("modalProdutos");
  window.buscaProdutoInput = document.getElementById("buscaProduto");
  window.tbodyModalProdutos = document.getElementById("tbodyModalProdutos");
  window.btnFecharModal = document.querySelector(".btn-fechar-modal");

  // Abrir modal ao clicar no campo código
  codigoInput.addEventListener("click", abrirModal);
  codigoInput.addEventListener("focus", abrirModal);

  // Buscar produto por código manualmente
  btnBuscar.addEventListener("click", buscarPorCodigo);
  codigoInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") buscarPorCodigo();
  });

  // Adicionar item
  btnAdd.addEventListener("click", adicionarItem);

  // Remover item
  document
    .getElementById("tbodyItens")
    .addEventListener("click", removerItem);

  // Salvar pedido
  btnSalvar.addEventListener("click", salvarPedido);

  // Eventos do modal
  btnFecharModal.addEventListener("click", fecharModal);
  modalProdutos.addEventListener("click", (e) => {
    if (e.target === modalProdutos) fecharModal();
  });

  // Busca dentro do modal
  buscaProdutoInput.addEventListener("keyup", () => {
    renderModal(buscaProdutoInput.value.trim());
  });
});

/* ================================
      MODAL DE PRODUTOS
================================ */

async function abrirModal() {
  if (!listaProdutos.length) await carregarProdutos();

  modalProdutos.classList.add("aberto");
  buscaProdutoInput.value = "";
  renderModal("");
  buscaProdutoInput.focus();
}

function fecharModal() {
  modalProdutos.classList.remove("aberto");
}

async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .order("codigo");

  if (error) {
    alert("Erro ao carregar produtos: " + error.message);
    return;
  }

  listaProdutos = data || [];
}

function renderModal(filtro) {
  tbodyModalProdutos.innerHTML = "";

  let lista = listaProdutos;

  if (filtro) {
    const f = filtro.toLowerCase();
    lista = listaProdutos.filter(
      (p) =>
        (p.codigo || "").toLowerCase().includes(f) ||
        (p.descricao || "").toLowerCase().includes(f)
    );
  }

  if (!lista.length) {
    tbodyModalProdutos.innerHTML =
      "<tr><td colspan='4'>Nenhum produto encontrado</td></tr>";
    return;
  }

  lista.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>R$ ${formatDecimalBR(p.preco_venda)}</td>
      <td>
        <button class="btn btn-secondary btn-select" data-id="${p.id}">
          Selecionar
        </button>
      </td>
    `;
    tr.querySelector(".btn-select").addEventListener("click", () => {
      produtoAtual = p;
      document.getElementById("codigo_produto").value = p.codigo;
      document.getElementById("descricao_produto").value = p.descricao;
      document.getElementById("preco_unitario").value = formatDecimalBR(
        p.preco_venda
      );
      fecharModal();
      document.getElementById("quantidade").focus();
    });

    tbodyModalProdutos.appendChild(tr);
  });
}

/* ================================
      BUSCAR POR CÓDIGO MANUAL
================================ */

async function buscarPorCodigo() {
  const codigo = document.getElementById("codigo_produto").value.trim();
  if (!codigo) return alert("Digite ou selecione um código!");

  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return alert("Produto não encontrado!");

  produtoAtual = data;

  document.getElementById("descricao_produto").value = data.descricao;
  document.getElementById("preco_unitario").value = formatDecimalBR(
    data.preco_venda
  );
  document.getElementById("quantidade").focus();
}

/* ================================
      ADICIONAR ITEM
================================ */

function adicionarItem() {
  if (!produtoAtual) return alert("Selecione um produto!");

  const qtd = Number(document.getElementById("quantidade").value);
  const preco = parseDecimalBR(
    document.getElementById("preco_unitario").value
  );

  if (!qtd || qtd <= 0) return alert("Quantidade inválida!");
  if (!preco || preco <= 0) return alert("Preço inválido!");

  itensPedido.push({
    produto_id: produtoAtual.id,
    codigo: produtoAtual.codigo,
    descricao: produtoAtual.descricao,
    quantidade: qtd,
    valor_unitario: preco,
    total: qtd * preco,
  });

  produtoAtual = null;

  document.getElementById("codigo_produto").value = "";
  document.getElementById("descricao_produto").value = "";
  document.getElementById("preco_unitario").value = "";
  document.getElementById("quantidade").value = "";

  renderItens();
}

/* ================================
      REMOVER ITEM
================================ */

function removerItem(e) {
  if (!e.target.matches(".btn-remover-item")) return;

  const index = e.target.dataset.index;
  itensPedido.splice(index, 1);
  renderItens();
}

/* ================================
      RENDER ITENS
================================ */

function renderItens() {
  const tbody = document.getElementById("tbodyItens");
  const totalSpan = document.getElementById("totalPedido");

  tbody.innerHTML = "";

  if (!itensPedido.length) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum item</td></tr>`;
    totalSpan.textContent = "R$ 0,00";
    return;
  }

  let totalGeral = 0;

  itensPedido.forEach((it, index) => {
    totalGeral += it.total;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.codigo}</td>
      <td>${it.descricao}</td>
      <td>${it.quantidade}</td>
      <td>R$ ${formatDecimalBR(it.valor_unitario)}</td>
      <td>R$ ${formatDecimalBR(it.total)}</td>
      <td>
        <button class="btn btn-ghost btn-remover-item" data-index="${index}">
          Remover
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  totalSpan.textContent = "R$ " + formatDecimalBR(totalGeral);
}

/* ================================
      SALVAR PEDIDO
================================ */

async function salvarPedido() {
  const cliente = Number(document.getElementById("cliente").value);
  const data = document.getElementById("data_pedido").value;
  const tipo = document.getElementById("tipo_documento").value;
  const numero = document.getElementById("numero_documento").value.trim();

  if (!cliente || !data || !tipo || !numero)
    return alert("Preencha todos os campos!");

  if (!itensPedido.length) return alert("Adicione pelo menos um item!");

  // Verifica duplicação
  const { data: existe } = await supabase
    .from("pedidos")
    .select("id")
    .eq("numero_documento", numero)
    .maybeSingle();

  if (existe) return alert("Já existe um documento com este número!");

  const total = itensPedido.reduce((s, it) => s + it.total, 0);

  // Salva cabeçalho
  const { data: novo, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: cliente,
      data_pedido: data,
      tipo_documento: tipo,
      numero_documento: numero,
      total,
    })
    .select("id")
    .single();

  if (error) return alert("Erro ao salvar pedido!");

  // Salva itens
  const itensInsert = itensPedido.map((it) => ({
    pedido_id: novo.id,
    produto_id: it.produto_id,
    quantidade: it.quantidade,
    valor_unitario: it.valor_unitario,
  }));

  await supabase.from("pedidos_itens").insert(itensInsert);

  alert("Pedido salvo com sucesso!");
  window.location.href = "pedidos.html";
}

/* ================================
      CARREGAR CLIENTES
================================ */

async function carregarClientes() {
  const sel = document.getElementById("cliente");

  const { data } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  data?.forEach((c) => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.razao_social;
    sel.appendChild(op);
  });
}
