import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let itens = [];
let produtosCache = [];

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  carregarProdutos();
  configurarEventos();
});

function configurarEventos() {
  document.getElementById("btnSalvarPedido").addEventListener("click", salvarPedido);
  document.getElementById("btnCancelar").addEventListener("click", () => {
    window.location.href = "pedidos_lista.html";
  });

  const campoCodigo = document.getElementById("codigo_produto");
  campoCodigo.addEventListener("change", buscarProdutoPorCodigo);
  campoCodigo.addEventListener("blur", buscarProdutoPorCodigo);

  const btnAdicionar = document.getElementById("btnAdicionarItem");
  btnAdicionar.addEventListener("click", adicionarItem);
}

/* ==============================
   CLIENTES (SELECT)
============================== */
async function carregarClientes() {
  const select = document.getElementById("cliente_id");

  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao carregar clientes.");
    return;
  }

  for (const cli of data) {
    const opt = document.createElement("option");
    opt.value = cli.id;
    opt.textContent = cli.razao_social;
    select.appendChild(opt);
  }
}

/* ==============================
   PRODUTOS PARA LISTA (DATALIST)
============================== */
async function carregarProdutos() {
  const datalist = document.getElementById("listaProdutos");
  datalist.innerHTML = "";

  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .order("codigo", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao carregar produtos.");
    return;
  }

  produtosCache = data || [];

  produtosCache.forEach((prod) => {
    const opt = document.createElement("option");
    opt.value = prod.codigo; // o usuário digita / escolhe o código
    opt.label = `${prod.codigo} - ${prod.descricao}`;
    datalist.appendChild(opt);
  });
}

/* ==============================
   PRODUTO POR CÓDIGO (USANDO CACHE)
============================== */
function buscarProdutoPorCodigo() {
  const campoCodigo = document.getElementById("codigo_produto");
  const codigo = campoCodigo.value.trim();

  if (!codigo) {
    limparProdutoSelecionado();
    return;
  }

  const produto = produtosCache.find(
    (p) => String(p.codigo).toLowerCase() === codigo.toLowerCase()
  );

  if (!produto) {
    alert("Produto não encontrado para esse código.");
    limparProdutoSelecionado();
    return;
  }

  document.getElementById("descricao_produto").textContent = produto.descricao;
  document.getElementById("preco_produto").textContent = formatarValor(produto.preco_venda ?? 0);

  campoCodigo.dataset.produtoId = produto.id;
  campoCodigo.dataset.precoVenda = produto.preco_venda ?? 0;
}

function limparProdutoSelecionado() {
  document.getElementById("descricao_produto").textContent = "-";
  document.getElementById("preco_produto").textContent = "0,00";

  const campoCodigo = document.getElementById("codigo_produto");
  delete campoCodigo.dataset.produtoId;
  delete campoCodigo.dataset.precoVenda;
}

/* ==============================
   ITENS NA MEMÓRIA
============================== */
function adicionarItem() {
  const campoCodigo = document.getElementById("codigo_produto");
  const produtoId = campoCodigo.dataset.produtoId;
  const precoVenda = Number(campoCodigo.dataset.precoVenda || 0);

  const codigo = campoCodigo.value.trim();
  const desc = document.getElementById("descricao_produto").textContent.trim();
  const qtdStr = document.getElementById("quantidade").value.replace(",", ".");
  const qtd = Number(qtdStr || 0);

  const dataEntrega = document.getElementById("data_entrega_item").value;
  const statusItem = document.getElementById("status_item").value || "PENDENTE";

  if (!produtoId || !codigo || !desc || !qtd || qtd <= 0) {
    alert("Selecione o produto pelo código e informe uma quantidade válida.");
    return;
  }

  if (!dataEntrega) {
    const cont = confirm("Data de entrega não preenchida. Deseja continuar mesmo assim?");
    if (!cont) return;
  }

  const totalItem = precoVenda * qtd;

  itens.push({
    produto_id: produtoId,
    codigo,
    descricao: desc,
    quantidade: qtd,
    valor_unitario: precoVenda,
    total_item: totalItem,
    data_entrega: dataEntrega || null,
    status: statusItem
  });

  renderizarItens();
  limparCamposItem();
}

function limparCamposItem() {
  document.getElementById("codigo_produto").value = "";
  document.getElementById("quantidade").value = "";
  document.getElementById("data_entrega_item").value = "";
  document.getElementById("status_item").value = "";
  limparProdutoSelecionado();
}

function renderizarItens() {
  const tbody = document.getElementById("tbodyItens");
  tbody.innerHTML = "";

  let totalGeral = 0;

  itens.forEach((item, index) => {
    totalGeral += item.total_item;

    const dataBR = item.data_entrega
      ? new Date(item.data_entrega).toLocaleDateString("pt-BR")
      : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.codigo}</td>
      <td>${item.descricao}</td>
      <td>${item.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>${formatarValor(item.valor_unitario)}</td>
      <td>${formatarValor(item.total_item)}</td>
      <td>${dataBR}</td>
      <td>${item.status || "PENDENTE"}</td>
      <td class="col-acoes">
        <button class="btn-remover" data-index="${index}">Remover</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("badgeTotal").textContent = `Total: R$ ${formatarValor(totalGeral)}`;

  tbody.querySelectorAll(".btn-remover").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      itens.splice(idx, 1);
      renderizarItens();
    });
  });
}

/* ==============================
   SALVAR PEDIDO + ITENS
============================== */
async function salvarPedido() {
  const clienteId = document.getElementById("cliente_id").value;
  const dataPedido = document.getElementById("data_pedido").value;
  const tipoPedido = document.getElementById("tipo_pedido").value;
  const numeroPedido = document.getElementById("numero_pedido").value.trim();

  if (!clienteId || !dataPedido || !tipoPedido || !numeroPedido) {
    alert("Preencha todos os campos do pedido.");
    return;
  }

  if (!itens.length) {
    const confirmar = confirm("Nenhum item foi adicionado. Deseja salvar mesmo assim?");
    if (!confirmar) return;
  }

  const totalPedido = itens.reduce((soma, item) => soma + item.total_item, 0);

  const { data: pedidoInserido, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: Number(clienteId),
      data_pedido: dataPedido,
      tipo_pedido: tipoPedido, // agora PC ou OC
      numero_pedido: numeroPedido,
      total: totalPedido
    })
    .select()
    .maybeSingle();

  if (erroPedido) {
    console.error(erroPedido);
    alert("Erro ao salvar pedido.");
    return;
  }

  const pedidoId = pedidoInserido.id;

  if (itens.length) {
    const payloadItens = itens.map((it) => ({
      pedido_id: pedidoId,
      produto_id: it.produto_id,
      quantidade: it.quantidade,
      valor_unitario: it.valor_unitario,
      total_item: it.total_item,
      data_entrega: it.data_entrega,
      status: it.status
    }));

    const { error: erroItens } = await supabase.from("pedidos_itens").insert(payloadItens);

    if (erroItens) {
      console.error(erroItens);
      alert("Pedido salvo, mas ocorreu erro ao salvar alguns itens.");
    }
  }

  alert("Pedido salvo com sucesso!");
  window.location.href = "pedidos_lista.html";
}

/* ==============================
   UTILITÁRIOS
============================== */
function formatarValor(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
