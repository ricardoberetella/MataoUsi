/**********************************************
 *  MÓDULO: PEDIDOS
 *  Arquivo completamente revisado, corrigido,
 *  organizado e compatível com Supabase.
 **********************************************/

import { supabase, verificarLogin } from "./auth.js";

// --------------------------------------------------
// MEMÓRIA LOCAL DOS ITENS DO PEDIDO
// --------------------------------------------------
let itens = [];
let indiceEditandoItem = null;

/****************************************************
 * HELPERS GERAIS
 ****************************************************/
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function parseNumeroBR(valor) {
  if (!valor) return 0;
  return Number(String(valor).replace(".", "").replace(",", "."));
}

function formatNumeroBR(valor) {
  if (valor == null) return "0,00";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function mostrarErro(msg) {
  alert("Erro: " + msg);
}

function mostrarOk(msg) {
  alert(msg);
}

/****************************************************
 * INICIALIZAÇÃO POR PÁGINA
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {

  // 🔐 Protege qualquer tela que use este módulo
  await verificarLogin();

  const tabelaPedidos = document.getElementById("tabelaPedidos");
  const formPedido = document.getElementById("formPedido");

  if (tabelaPedidos) initPainelPedidos();
  if (formPedido) initFormPedido();
});

/****************************************************
 * PAINEL – LISTAR PEDIDOS
 ****************************************************/
async function initPainelPedidos() {
  await carregarPedidos();
}

async function carregarPedidos() {

  await verificarLogin(); // 🔐

  const tbody = document.querySelector("#tabelaPedidos tbody");

  tbody.innerHTML = `
    <tr><td colspan="6">Carregando pedidos...</td></tr>
  `;

  /**********************************************
   * CORREÇÃO CRUCIAL:
   * ❌ A tabela pedidos NÃO tem data_entrega
   * ✔ Removido do SELECT
   **********************************************/
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, numero_pedido, data_pedido, total, clientes ( razao_social )")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar pedidos.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum pedido cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  data.forEach((p) => {
    const nomeCliente = p.clientes ? p.clientes.razao_social : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.numero_pedido}</td>
      <td>${nomeCliente}</td>
      <td>${p.data_pedido || ""}</td>
      <td>—</td>     <!-- Coluna reservada, pois data_entrega NÃO existe no pedido -->
      <td>R$ ${formatNumeroBR(p.total)}</td>
      <td>
        <a href="editar_pedido.html?id=${p.id}">
          <button class="btn-table">Editar</button>
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/****************************************************
 * FORM – CADASTRAR / EDITAR PEDIDO
 ****************************************************/
async function initFormPedido() {
  const form = document.getElementById("formPedido");
  const btnAdicionarItem = document.getElementById("btnAdicionarItem");
  const btnCancelar = document.getElementById("btnCancelarPedido");

  await carregarClientesSelect();
  await carregarProdutosSelect();

  itens = [];
  indiceEditandoItem = null;
  atualizarTabelaItens();
  atualizarTotal();

  // Se está editando um pedido existente
  const idURL = getParam("id");
  if (idURL) {
    document.getElementById("pedidoId").value = idURL;
    await carregarPedidoExistente(Number(idURL));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarPedido();
  });

  btnAdicionarItem.addEventListener("click", () => {
    adicionarOuAtualizarItem();
  });

  btnCancelar.addEventListener("click", () => {
    window.location.href = "painel_pedidos.html";
  });
}

/****************************************************
 * CARREGAR SELECTS DE CLIENTES E PRODUTOS
 ****************************************************/
async function carregarClientesSelect() {

  await verificarLogin(); // 🔐

  const select = document.getElementById("clienteId");
  select.innerHTML = `<option value="">Carregando...</option>`;

  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  if (error) {
    console.error(error);
    mostrarErro("Erro ao carregar clientes.");
    return;
  }

  select.innerHTML = `<option value="">Selecione...</option>`;

  data.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.razao_social;
    select.appendChild(opt);
  });
}

async function carregarProdutosSelect() {

  await verificarLogin(); // 🔐

  const select = document.getElementById("produtoId");
  if (!select) return;

  select.innerHTML = `<option value="">Carregando...</option>`;

  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao")
    .order("codigo", { ascending: true });

  if (error) {
    console.error(error);
    mostrarErro("Erro ao carregar produtos.");
    return;
  }

  select.innerHTML = `<option value="">Selecione...</option>`;

  data.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.codigo} - ${p.descricao}`;
    opt.dataset.codigo = p.codigo;
    opt.dataset.descricao = p.descricao;
    select.appendChild(opt);
  });
}

/****************************************************
 * CARREGAR PEDIDO EXISTENTE (EDIÇÃO)
 ****************************************************/
async function carregarPedidoExistente(id) {

  await verificarLogin(); // 🔐

  // Dados do pedido
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pedido) {
    console.error(error);
    mostrarErro("Erro ao carregar o pedido.");
    return;
  }

  document.getElementById("clienteId").value = pedido.cliente_id;
  document.getElementById("dataPedido").value = pedido.data_pedido || "";
  document.getElementById("numeroPedido").value = pedido.numero_pedido || "";

  // Carrega itens do pedido
  const { data: itensDB, error: errorItens } = await supabase
    .from("pedidos_itens")
    .select("id, produto_id, quantidade, valor_unitario, data_entrega, produtos ( codigo, descricao )")
    .eq("pedido_id", id);

  if (errorItens) {
    console.error(errorItens);
    mostrarErro("Erro ao carregar itens.");
    return;
  }

  itens = itensDB.map((it) => ({
    id: it.id,
    produto_id: it.produto_id,
    codigo: it.produtos?.codigo || "",
    descricao: it.produtos?.descricao || "",
    quantidade: Number(it.quantidade),
    valor_unitario: Number(it.valor_unitario),
    data_entrega: it.data_entrega || null
  }));

  atualizarTabelaItens();
  atualizarTotal();
}

/****************************************************
 * GERENCIAMENTO DE ITENS DO PEDIDO
 ****************************************************/
function adicionarOuAtualizarItem() {
  const produtoId = Number(document.getElementById("produtoId").value);
  const quantidade = parseNumeroBR(document.getElementById("quantidadeItem").value);
  const valorUnit = parseNumeroBR(document.getElementById("valorUnitarioItem").value);
  const dataEntrega = document.getElementById("dataEntregaItem").value || null;

  if (!produtoId) return mostrarErro("Selecione um produto.");
  if (!quantidade || quantidade <= 0) return mostrarErro("Quantidade inválida.");
  if (!valorUnit || valorUnit <= 0) return mostrarErro("Valor unitário inválido.");

  const opt = document.getElementById("produtoId").options[document.getElementById("produtoId").selectedIndex];

  const item = {
    produto_id: produtoId,
    codigo: opt.dataset.codigo,
    descricao: opt.dataset.descricao,
    quantidade,
    valor_unitario: valorUnit,
    data_entrega: dataEntrega
  };

  if (indiceEditandoItem != null) {
    itens[indiceEditandoItem] = item;
    indiceEditandoItem = null;
  } else {
    itens.push(item);
  }

  // Limpa campos
  document.getElementById("produtoId").value = "";
  document.getElementById("quantidadeItem").value = "";
  document.getElementById("valorUnitarioItem").value = "";
  document.getElementById("dataEntregaItem").value = "";

  atualizarTabelaItens();
  atualizarTotal();
}

function editarItem(index) {
  const it = itens[index];
  indiceEditandoItem = index;

  document.getElementById("produtoId").value = it.produto_id;
  document.getElementById("quantidadeItem").value = it.quantidade;
  document.getElementById("valorUnitarioItem").value = formatNumeroBR(it.valor_unitario);
  document.getElementById("dataEntregaItem").value = it.data_entrega || "";
}

function excluirItem(index) {
  if (confirm("Deseja remover este item?")) {
    itens.splice(index, 1);
    atualizarTabelaItens();
    atualizarTotal();
  }
}

function atualizarTabelaItens() {
  const tbody = document.querySelector("#tabelaItens tbody");

  if (!itens.length) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum item adicionado.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  itens.forEach((it, index) => {
    const subtotal = it.quantidade * it.valor_unitario;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.codigo}</td>
      <td>${it.descricao}</td>
      <td>${formatNumeroBR(it.quantidade)}</td>
      <td>${formatNumeroBR(it.valor_unitario)}</td>
      <td>${it.data_entrega || ""}</td>
      <td>${formatNumeroBR(subtotal)}</td>
      <td>
        <button class="btn-table" data-acao="editar" data-index="${index}">Editar</button>
        <button class="btn-table btn-danger" data-acao="excluir" data-index="${index}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-acao]").forEach((btn) => {
    const index = Number(btn.dataset.index);
    btn.addEventListener("click", () => {
      if (btn.dataset.acao === "editar") editarItem(index);
      else excluirItem(index);
    });
  });
}

function atualizarTotal() {
  const total = itens.reduce((acc, it) => acc + it.quantidade * it.valor_unitario, 0);
  document.getElementById("totalPedido").textContent = "R$ " + formatNumeroBR(total);
}

/****************************************************
 * SALVAR PEDIDO (INSERT / UPDATE)
 ****************************************************/
async function salvarPedido() {

  await verificarLogin(); // 🔐

  const pedidoIdHidden = document.getElementById("pedidoId").value || null;
  const clienteId = Number(document.getElementById("clienteId").value);
  const dataPedido = document.getElementById("dataPedido").value;
  const numeroPedido = document.getElementById("numeroPedido").value.trim();

  if (!clienteId) return mostrarErro("Selecione o cliente.");
  if (!dataPedido) return mostrarErro("Informe a data.");
  if (!numeroPedido) return mostrarErro("Informe o número.");
  if (!itens.length) return mostrarErro("Adicione itens ao pedido.");

  const total = itens.reduce((acc, it) => acc + it.quantidade * it.valor_unitario, 0);

  const dadosPedido = {
    cliente_id: clienteId,
    data_pedido: dataPedido,
    numero_pedido: numeroPedido,
    tipo_pedido: "NORMAL",
    total
  };

  let pedidoIdFinal = null;

  /******************************
   *  UPDATE
   ******************************/
  if (pedidoIdHidden) {
    const { error: errUpdate } = await supabase
      .from("pedidos")
      .update(dadosPedido)
      .eq("id", Number(pedidoIdHidden));

    if (errUpdate) {
      console.error(errUpdate);
      return mostrarErro("Erro ao atualizar pedido.");
    }

    pedidoIdFinal = Number(pedidoIdHidden);

    // Apagar itens antigos
    await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoIdFinal);
  }

  /******************************
   *  INSERT
   ******************************/
  else {
    const { data: novoPedido, error: errInsert } = await supabase
      .from("pedidos")
      .insert([dadosPedido])
      .select()
      .single();

    if (errInsert) {
      console.error(errInsert);
      return mostrarErro("Erro ao salvar pedido.");
    }

    pedidoIdFinal = novoPedido.id;
  }

  /******************************
   *  INSERIR ITENS
   ******************************/
  const itensInsert = itens.map((it) => ({
    pedido_id: pedidoIdFinal,
    produto_id: it.produto_id,
    quantidade: it.quantidade,
    valor_unitario: it.valor_unitario,
    data_entrega: it.data_entrega
  }));

  const { error: errItens } = await supabase
    .from("pedidos_itens")
    .insert(itensInsert);

  if (errItens) {
    console.error(errItens);
    return mostrarErro("Erro ao salvar itens.");
  }

  mostrarOk("Pedido salvo com sucesso!");
  window.location.href = "painel_pedidos.html";
}
