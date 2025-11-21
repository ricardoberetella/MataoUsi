import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let itens = [];

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  configurarEventos();
});

function configurarEventos() {
  document.getElementById("btnSalvarPedido").addEventListener("click", salvarPedido);
  document.getElementById("btnCancelar").addEventListener("click", () => {
    window.location.href = "pedidos_lista.html";
  });

  document.getElementById("btnBuscarProduto").addEventListener("click", buscarProdutoPorCodigo);
  document.getElementById("btnAdicionarItem").addEventListener("click", adicionarItem);
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
   PRODUTO POR CÓDIGO
============================== */
async function buscarProdutoPorCodigo() {
  const codigo = document.getElementById("codigo_produto").value.trim();

  if (!codigo) {
    alert("Informe o código do produto.");
    return;
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Erro ao buscar produto.");
    return;
  }

  if (!data) {
    alert("Produto não encontrado para esse código.");
    limparProdutoSelecionado();
    return;
  }

  // Preenche campos visuais
  document.getElementById("descricao_produto").textContent = data.descricao;
  document.getElementById("preco_produto").textContent = formatarValor(data.preco_venda ?? 0);

  // Guarda o produto atual em dataset
  document.getElementById("codigo_produto").dataset.produtoId = data.id;
  document.getElementById("codigo_produto").dataset.precoVenda = data.preco_venda ?? 0;
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

  if (!produtoId || !codigo || !desc || !qtd || qtd <= 0) {
    alert("Busque o produto pelo código e informe uma quantidade válida.");
    return;
  }

  const totalItem = precoVenda * qtd;

  itens.push({
    produto_id: produtoId,
    codigo,
    descricao: desc,
    quantidade: qtd,
    valor_unitario: precoVenda,
    total_item: totalItem
  });

  renderizarItens();
  limparCamposItem();
}

function limparCamposItem() {
  document.getElementById("codigo_produto").value = "";
  document.getElementById("quantidade").value = "";
  limparProdutoSelecionado();
}

function renderizarItens() {
  const tbody = document.getElementById("tbodyItens");
  tbody.innerHTML = "";

  let totalGeral = 0;

  itens.forEach((item, index) => {
    totalGeral += item.total_item;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.codigo}</td>
      <td>${item.descricao}</td>
      <td>${item.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>${formatarValor(item.valor_unitario)}</td>
      <td>${formatarValor(item.total_item)}</td>
      <td class="col-acoes">
        <button class="btn-remover" data-index="${index}">Remover</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Atualiza badge
  document.getElementById("badgeTotal").textContent = `Total: R$ ${formatarValor(totalGeral)}`;

  // Eventos remover
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
  const observacoes = document.getElementById("observacoes").value.trim();

  if (!clienteId || !dataPedido || !tipoPedido || !numeroPedido) {
    alert("Preencha todos os campos obrigatórios do pedido.");
    return;
  }

  if (!itens.length) {
    const confirmar = confirm("Nenhum item foi adicionado. Deseja salvar mesmo assim?");
    if (!confirmar) return;
  }

  // Calcula total
  const totalPedido = itens.reduce((soma, item) => soma + item.total_item, 0);

  // Salva PEDIDO
  const { data: pedidoInserido, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: Number(clienteId),
      data_pedido: dataPedido,
      observacoes,
      tipo_pedido: tipoPedido,
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

  // Salva ITENS (se tiver)
  if (itens.length) {
    const payloadItens = itens.map((it) => ({
      pedido_id: pedidoId,
      produto_id: it.produto_id,
      quantidade: it.quantidade,
      valor_unitario: it.valor_unitario,
      total_item: it.total_item
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
