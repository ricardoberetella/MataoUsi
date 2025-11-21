import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Inicializa o Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis globais
let itensPedido = [];
let produtoAtual = null;
let pedidoId = null;

/* ===========================================================
   FUNÇÕES AUXILIARES
   =========================================================== */

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

/* ===========================================================
   AO CARREGAR A PÁGINA
   =========================================================== */

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

  // Eventos
  document
    .getElementById("btnBuscarProduto")
    .addEventListener("click", buscarProduto);

  document
    .getElementById("codigo_produto")
    .addEventListener("keyup", (e) => e.key === "Enter" && buscarProduto());

  document
    .getElementById("btnAdicionarItem")
    .addEventListener("click", adicionarItem);

  document
    .getElementById("tbodyItens")
    .addEventListener("click", removerItem);

  document
    .getElementById("btnSalvarPedido")
    .addEventListener("click", salvarPedido);
});

/* ===========================================================
   BUSCAR PRODUTO PELO CÓDIGO
   =========================================================== */

async function buscarProduto() {
  const codigo = document.getElementById("codigo_produto").value.trim();
  const descricao = document.getElementById("descricao_produto");
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
    descricao.value = "";
    precoInput.value = "";
    produtoAtual = null;
    return;
  }

  produtoAtual = data;

  descricao.value = data.descricao;
  precoInput.value = formatDecimalBR(data.preco_venda || 0);
  document.getElementById("quantidade").focus();
}

/* ===========================================================
   ADICIONAR ITEM NA TABELA
   =========================================================== */

function adicionarItem() {
  if (!produtoAtual) {
    alert("Busque um produto antes de adicionar.");
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
    total: preco * qtd,
  });

  produtoAtual = null;

  // Limpar campos
  document.getElementById("codigo_produto").value = "";
  document.getElementById("descricao_produto").value = "";
  document.getElementById("preco_unitario").value = "";
  document.getElementById("quantidade").value = "";

  renderItens();
}

/* ===========================================================
   REMOVER ITEM
   =========================================================== */

function removerItem(e) {
  const btn = e.target;
  if (!btn.matches(".btn-remover-item")) return;

  const index = Number(btn.dataset.index);
  itensPedido.splice(index, 1);

  renderItens();
}

/* ===========================================================
   ATUALIZAR TABELA DE ITENS
   =========================================================== */

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

/* ===========================================================
   SALVAR PEDIDO (NOVO OU EDITADO)
   =========================================================== */

async function salvarPedido() {
  const cliente = Number(document.getElementById("cliente").value);
  const dataPedido = document.getElementById("data_pedido").value;
  const pc_oc = document.getElementById("pc_oc").value.trim();
  const numero = document.getElementById("numero_pedido").value.trim();
  const tipo = document.getElementById("tipo_pedido").value;
  const obs = document.getElementById("observacoes").value.trim();

  if (!cliente || !dataPedido || !numero || !tipo) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  if (itensPedido.length === 0) {
    alert("Adicione pelo menos um item.");
    return;
  }

  // CHECAR DUPLICAÇÃO
  const { data: existe, error: erroCheck } = await supabase
    .from("pedidos")
    .select("id")
    .eq("numero_pedido", numero)
    .maybeSingle();

  if (erroCheck) {
    alert("Erro ao verificar número do pedido.");
    return;
  }

  if (!pedidoId && existe) {
    alert("Já existe um pedido com esse número!");
    return;
  }

  if (pedidoId && existe && existe.id !== pedidoId) {
    alert("Já existe outro pedido com esse número!");
    return;
  }

  const total = itensPedido.reduce((acc, it) => acc + it.total, 0);

  let pedidoCriadoId = pedidoId;

  /* SALVAR NOVO */
  if (!pedidoId) {
    const { data: novo, error } = await supabase
      .from("pedidos")
      .insert([
        {
          cliente_id: cliente,
          data_pedido: dataPedido,
          pc_oc,
          observacoes: obs,
          tipo_pedido: tipo,
          numero_pedido: numero,
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
    /* ATUALIZAR EXISTENTE */
    const { error } = await supabase
      .from("pedidos")
      .update({
        cliente_id: cliente,
        data_pedido: dataPedido,
        pc_oc,
        observacoes: obs,
        tipo_pedido: tipo,
        numero_pedido: numero,
        total,
      })
      .eq("id", pedidoId);

    if (error) {
      alert("Erro ao atualizar pedido: " + error.message);
      return;
    }

    // limpar itens antigos
    await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoId);
  }

  /* INSERIR ITENS */
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

/* ===========================================================
   CARREGAR CLIENTES
   =========================================================== */

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

/* ===========================================================
   CARREGAR PEDIDO PARA EDIÇÃO
   =========================================================== */

async function carregarPedidoExistente(id) {
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar pedido.");
    return;
  }

  document.getElementById("cliente").value = pedido.cliente_id;
  document.getElementById("data_pedido").value = pedido.data_pedido;
  document.getElementById("pc_oc").value = pedido.pc_oc || "";
  document.getElementById("numero_pedido").value = pedido.numero_pedido;
  document.getElementById("tipo_pedido").value = pedido.tipo_pedido;
  document.getElementById("observacoes").value = pedido.observacoes || "";

  // Carregar itens
  const { data: itens } = await supabase
    .from("pedidos_itens")
    .select("produto_id, quantidade, valor_unitario")
    .eq("pedido_id", id);

  itensPedido = [];

  for (const it of itens) {
    const { data: prod } = await supabase
      .from("produtos")
      .select("codigo, descricao")
      .eq("id", it.produto_id)
      .maybeSingle();

    itensPedido.push({
      produto_id: it.produto_id,
      codigo: prod.codigo,
      descricao: prod.descricao,
      quantidade: Number(it.quantidade),
      valor_unitario: Number(it.valor_unitario),
      total: it.quantidade * it.valor_unitario,
    });
  }

  renderItens();
}
