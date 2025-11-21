import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let itensPedido = [];
let produtoAtual = null;
let pedidoId = null;
let listaProdutos = [];

// Referências do modal (serão preenchidas no DOMContentLoaded)
let modalProdutos;
let buscaProdutoInput;
let tbodyModalProdutos;
let btnFecharModal;

function parseDecimalBR(str) {
  if (!str) return 0;
  return Number(str.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatDecimalBR(valor) {
  if (!valor) valor = 0;
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();

  const params = new URLSearchParams(window.location.search);
  if (params.has("id")) {
    pedidoId = Number(params.get("id"));
    document.getElementById("tituloPagina").textContent = "Editar Pedido";
    carregarPedidoExistente(pedidoId);
  } else {
    document.getElementById("data_pedido").value = new Date()
      .toISOString()
      .slice(0, 10);
  }

  // Campos do formulário
  const inputCodigo = document.getElementById("codigo_produto");
  const btnBuscarProduto = document.getElementById("btnBuscarProduto");
  const btnAdicionarItem = document.getElementById("btnAdicionarItem");
  const tbodyItens = document.getElementById("tbodyItens");
  const btnSalvarPedido = document.getElementById("btnSalvarPedido");

  // Elementos do modal
  modalProdutos = document.getElementById("modalProdutos");
  buscaProdutoInput = document.getElementById("buscaProduto");
  tbodyModalProdutos = document.getElementById("tbodyModalProdutos");
  btnFecharModal = document.querySelector(".btn-fechar-modal");

  // Ao clicar no campo código → abre modal
  inputCodigo.addEventListener("click", abrirModalProdutos);
  inputCodigo.addEventListener("focus", abrirModalProdutos);

  // Botão "Buscar" continua funcionando (caso queira digitar código manual)
  btnBuscarProduto.addEventListener("click", buscarProdutoPorCodigo);

  // Enter no campo código → buscar direto por código
  inputCodigo.addEventListener("keyup", (e) => {
    if (e.key === "Enter") buscarProdutoPorCodigo();
  });

  // Adicionar item
  btnAdicionarItem.addEventListener("click", adicionarItem);

  // Remover item
  tbodyItens.addEventListener("click", removerItem);

  // Salvar pedido
  btnSalvarPedido.addEventListener("click", salvarPedido);

  // Eventos do modal
  btnFecharModal.addEventListener("click", fecharModalProdutos);

  modalProdutos.addEventListener("click", (e) => {
    // clicar fora da caixa fecha o modal
    if (e.target === modalProdutos) fecharModalProdutos();
  });

  // Busca em tempo real no modal
  buscaProdutoInput.addEventListener("keyup", () => {
    renderListaProdutosModal(buscaProdutoInput.value.trim());
  });

  // Selecionar produto no modal (delegação)
  tbodyModalProdutos.addEventListener("click", (e) => {
    const btn = e.target;
    if (!btn.matches(".btn-selecionar-produto")) return;
    const id = Number(btn.dataset.id);
    const produto = listaProdutos.find((p) => p.id === id);
    if (!produto) return;

    produtoAtual = produto;

    document.getElementById("codigo_produto").value = produto.codigo || "";
    document.getElementById("descricao_produto").value = produto.descricao || "";
    document.getElementById("preco_unitario").value = formatDecimalBR(
      produto.preco_venda || 0
    );

    fecharModalProdutos();
    document.getElementById("quantidade").focus();
  });
});

/* ======================================================
   MODAL DE PRODUTOS
   ====================================================== */

async function abrirModalProdutos() {
  if (!listaProdutos.length) {
    await carregarProdutosModal();
  }

  modalProdutos.classList.add("aberto");
  document.body.classList.add("modal-aberto");

  buscaProdutoInput.value = "";
  renderListaProdutosModal("");
  buscaProdutoInput.focus();
}

function fecharModalProdutos() {
  modalProdutos.classList.remove("aberto");
  document.body.classList.remove("modal-aberto");
}

async function carregarProdutosModal() {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .order("codigo", { ascending: true });

  if (error) {
    alert("Erro ao carregar produtos: " + error.message);
    return;
  }

  listaProdutos = data || [];
  renderListaProdutosModal("");
}

function renderListaProdutosModal(filtro) {
  tbodyModalProdutos.innerHTML = "";

  let filtrados = listaProdutos;

  if (filtro) {
    const termo = filtro.toLowerCase();
    filtrados = listaProdutos.filter((p) => {
      const cod = (p.codigo || "").toLowerCase();
      const desc = (p.descricao || "").toLowerCase();
      return cod.includes(termo) || desc.includes(termo);
    });
  }

  if (filtrados.length === 0) {
    tbodyModalProdutos.innerHTML =
      `<tr><td colspan="4">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  for (const p of filtrados) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codigo || ""}</td>
      <td>${p.descricao || ""}</td>
      <td>R$ ${formatDecimalBR(p.preco_venda || 0)}</td>
      <td>
        <button type="button" class="btn btn-secondary btn-selecionar-produto" data-id="${p.id}">
          Selecionar
        </button>
      </td>
    `;
    tbodyModalProdutos.appendChild(tr);
  }
}

/* ======================================================
   BUSCAR PRODUTO POR CÓDIGO (manual, se quiser)
   ====================================================== */

async function buscarProdutoPorCodigo() {
  const codigo = document.getElementById("codigo_produto").value.trim();
  const descricaoInput = document.getElementById("descricao_produto");
  const precoInput = document.getElementById("preco_unitario");

  if (!codigo) {
    alert("Digite o código do produto.");
    return;
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) {
    alert("Erro ao buscar produto: " + error.message);
    return;
  }

  if (!data) {
    alert("Produto não encontrado.");
    descricaoInput.value = "";
    precoInput.value = "";
    produtoAtual = null;
    return;
  }

  produtoAtual = data;

  descricaoInput.value = data.descricao || "";
  precoInput.value = formatDecimalBR(data.preco_venda || 0);
  document.getElementById("quantidade").focus();
}

/* ======================================================
   ITENS DO PEDIDO
   ====================================================== */

function adicionarItem() {
  if (!produtoAtual) {
    alert("Selecione ou busque um produto antes de adicionar.");
    return;
  }

  const qtd = Number(document.getElementById("quantidade").value);
  const preco = parseDecimalBR(
    document.getElementById("preco_unitario").value
  );

  if (!qtd || qtd <= 0) {
    alert("Informe quantidade válida.");
    return;
  }

  if (!preco || preco <= 0) {
    alert("Informe preço válido.");
    return;
  }

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

function removerItem(e) {
  const btn = e.target;
  if (!btn.matches(".btn-remover-item")) return;

  const index = Number(btn.dataset.index);
  itensPedido.splice(index, 1);
  renderItens();
}

function renderItens() {
  const tbody = document.getElementById("tbodyItens");
  const totalSpan = document.getElementById("totalPedido");

  tbody.innerHTML = "";

  if (itensPedido.length === 0) {
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

/* ======================================================
   SALVAR PEDIDO
   ====================================================== */

async function salvarPedido() {
  const cliente = Number(document.getElementById("cliente").value);
  const dataPedido = document.getElementById("data_pedido").value;
  const tipoDoc = document.getElementById("tipo_documento").value;
  const numeroDoc = document.getElementById("numero_documento").value.trim();

  if (!cliente || !dataPedido || !tipoDoc || !numeroDoc) {
    alert("Preencha todos os campos do cabeçalho.");
    return;
  }

  if (itensPedido.length === 0) {
    alert("Adicione pelo menos um item.");
    return;
  }

  const { data: existe, error: erroCheck } = await supabase
    .from("pedidos")
    .select("id")
    .eq("numero_documento", numeroDoc)
    .maybeSingle();

  if (erroCheck) {
    alert("Erro ao verificar número do documento.");
    return;
  }

  if (!pedidoId && existe) {
    alert("Já existe um pedido com esse número de documento!");
    return;
  }

  if (pedidoId && existe && existe.id !== pedidoId) {
    alert("Já existe outro pedido com esse número de documento!");
    return;
  }

  const total = itensPedido.reduce((acc, it) => acc + it.total, 0);
  let pedidoCriadoId = pedidoId;

  if (!pedidoId) {
    const { data: novo, error } = await supabase
      .from("pedidos")
      .insert([
        {
          cliente_id: cliente,
          data_pedido: dataPedido,
          tipo_documento: tipoDoc,
          numero_documento: numeroDoc,
          total,
        },
      ])
      .select("id")
      .single();

    if (error) {
      alert("Erro ao salvar pedido: " + error.message);
      return;
    }

    pedidoCriadoId = novo.id;
  } else {
    const { error } = await supabase
      .from("pedidos")
      .update({
        cliente_id: cliente,
        data_pedido: dataPedido,
        tipo_documento: tipoDoc,
        numero_documento: numeroDoc,
        total,
      })
      .eq("id", pedidoId);

    if (error) {
      alert("Erro ao atualizar pedido: " + error.message);
      return;
    }

    await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoId);
  }

  const itensInsert = itensPedido.map((it) => ({
    pedido_id: pedidoCriadoId,
    produto_id: it.produto_id,
    quantidade: it.quantidade,
    valor_unitario: it.valor_unitario,
  }));

  const { error: erroItens } = await supabase
    .from("pedidos_itens")
    .insert(itensInsert);

  if (erroItens) {
    alert("Erro ao salvar itens: " + erroItens.message);
    return;
  }

  alert("Pedido salvo com sucesso!");
  window.location.href = "pedidos.html";
}

/* ======================================================
   CARREGAR CLIENTES E PEDIDO EXISTENTE
   ====================================================== */

async function carregarClientes() {
  const select = document.getElementById("cliente");

  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  if (error) {
    alert("Erro ao carregar clientes");
    return;
  }

  data.forEach((c) => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.razao_social;
    select.appendChild(op);
  });
}

async function carregarPedidoExistente(id) {
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pedido) {
    alert("Erro ao carregar pedido.");
    return;
  }

  document.getElementById("cliente").value = pedido.cliente_id;
  document.getElementById("data_pedido").value = pedido.data_pedido;
  document.getElementById("tipo_documento").value = pedido.tipo_documento || "";
  document.getElementById("numero_documento").value = pedido.numero_documento || "";

  const { data: itens, error: erroItens } = await supabase
    .from("pedidos_itens")
    .select("produto_id, quantidade, valor_unitario")
    .eq("pedido_id", id);

  if (erroItens) {
    alert("Erro ao carregar itens do pedido: " + erroItens.message);
    return;
  }

  itensPedido = [];

  for (const it of itens) {
    const { data: prod } = await supabase
      .from("produtos")
      .select("codigo, descricao")
      .eq("id", it.produto_id)
      .maybeSingle();

    itensPedido.push({
      produto_id: it.produto_id,
      codigo: prod?.codigo || "",
      descricao: prod?.descricao || "",
      quantidade: Number(it.quantidade),
      valor_unitario: Number(it.valor_unitario),
      total: Number(it.quantidade) * Number(it.valor_unitario),
    });
  }

  renderItens();
}
