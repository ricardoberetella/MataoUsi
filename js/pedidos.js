import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaProdutos = [];
let itensPedido = [];

// ============================
// Troca de Abas
// ============================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ============================
// Helpers
// ============================
function formatMoney(val) {
  const n = Number(val || 0);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseNumeroBR(val) {
  if (!val) return 0;
  return Number(val.replace(/\./g, "").replace(",", "."));
}

// ============================
// Carregar no início
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  await carregarClientes();
  await carregarProdutos();
  await carregarPedidos();

  // Eventos dos campos de item
  document.getElementById("produto_id_select").addEventListener("change", atualizarValorUnitarioItem);
  document.getElementById("quantidade_item").addEventListener("input", atualizarTotalItem);
  document.getElementById("btnAddItem").addEventListener("click", adicionarItem);
});

// ============================
// CARREGAR LISTA DE CLIENTES
// ============================
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("cliente_id");
  select.innerHTML = "";

  data.forEach(c => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.razao_social;
    select.appendChild(op);
  });
}

// ============================
// CARREGAR LISTA DE PRODUTOS
// ============================
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .order("codigo", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  listaProdutos = data || [];

  const select = document.getElementById("produto_id_select");
  select.innerHTML = "";

  listaProdutos.forEach(p => {
    const op = document.createElement("option");
    op.value = p.id;
    op.textContent = `${p.codigo} - ${p.descricao}`;
    op.dataset.preco = p.preco_venda || 0;
    select.appendChild(op);
  });

  atualizarValorUnitarioItem();
}

// ============================
// Atualizar valor unitário quando muda o produto
// ============================
function atualizarValorUnitarioItem() {
  const select = document.getElementById("produto_id_select");
  const option = select.options[select.selectedIndex];
  if (!option) return;

  const preco = option.dataset.preco ? Number(option.dataset.preco) : 0;
  document.getElementById("valor_unitario_item").value = formatMoney(preco);
  atualizarTotalItem();
}

// ============================
// Atualizar total do item
// ============================
function atualizarTotalItem() {
  const qtd = parseNumeroBR(document.getElementById("quantidade_item").value);
  const valorUniStr = document.getElementById("valor_unitario_item").value;
  const valorUni = parseNumeroBR(valorUniStr);
  const total = qtd * valorUni;

  document.getElementById("total_item").value = formatMoney(total);
}

// ============================
// ADICIONAR ITEM AO PEDIDO
// ============================
function adicionarItem() {
  const select = document.getElementById("produto_id_select");
  const option = select.options[select.selectedIndex];
  if (!option) {
    alert("Selecione um produto.");
    return;
  }

  const produto_id = Number(option.value);
  const produto = listaProdutos.find(p => p.id === produto_id);
  if (!produto) {
    alert("Produto não encontrado.");
    return;
  }

  const qtd = parseNumeroBR(document.getElementById("quantidade_item").value);
  if (!qtd || qtd <= 0) {
    alert("Informe uma quantidade válida.");
    return;
  }

  const valorUniStr = document.getElementById("valor_unitario_item").value;
  const valorUni = parseNumeroBR(valorUniStr);

  itensPedido.push({
    produto_id,
    codigo: produto.codigo,
    descricao: produto.descricao,
    quantidade: qtd,
    valor_unitario: valorUni
  });

  renderizarItens();
  // limpa os campos de item
  document.getElementById("quantidade_item").value = "";
  atualizarTotalItem();
}

// ============================
// RENDERIZAR ITENS NA TABELA
// ============================
function renderizarItens() {
  const tbody = document.getElementById("tabelaItens");
  tbody.innerHTML = "";

  let totalPedido = 0;

  itensPedido.forEach((item, index) => {
    const total = item.quantidade * item.valor_unitario;
    totalPedido += total;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.codigo}</td>
      <td>${item.descricao}</td>
      <td>${formatMoney(item.quantidade)}</td>
      <td>${formatMoney(item.valor_unitario)}</td>
      <td>${formatMoney(total)}</td>
      <td>
        <span class="action-btn" onclick="removerItem(${index})">Remover</span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("total_pedido").textContent = "R$ " + formatMoney(totalPedido);
}

window.removerItem = function(index) {
  itensPedido.splice(index, 1);
  renderizarItens();
};

// ============================
// SALVAR PEDIDO
// ============================
document.getElementById("formPedido").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("pedidoId").value;

  if (!itensPedido.length) {
    alert("Adicione pelo menos um item ao pedido.");
    return;
  }

  const pedido = {
    cliente_id: document.getElementById("cliente_id").value,
    numero_pedido: document.getElementById("numero_pedido").value,
    data_pedido: document.getElementById("data_pedido").value,
    data_entrega: document.getElementById("data_entrega").value || null,
    status: document.getElementById("status").value
  };

  if (!pedido.data_pedido) {
    alert("Informe a data do pedido.");
    return;
  }

  let pedidoId;

  if (id) {
    // Atualizar pedido
    const { error: errUpdate } = await supabase
      .from("pedidos")
      .update(pedido)
      .eq("id", id);

    if (errUpdate) {
      alert("Erro ao atualizar pedido: " + errUpdate.message);
      return;
    }
    pedidoId = Number(id);

    // Apagar itens antigos e inserir novamente
    await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoId);
  } else {
    // Inserir novo pedido
    const { data, error } = await supabase
      .from("pedidos")
      .insert(pedido)
      .select("id")
      .single();

    if (error) {
      alert("Erro ao salvar pedido: " + error.message);
      return;
    }
    pedidoId = data.id;
  }

  // Inserir itens
  const itensParaInserir = itensPedido.map(item => ({
    pedido_id: pedidoId,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario
  }));

  const { error: errItens } = await supabase
    .from("pedidos_itens")
    .insert(itensParaInserir);

  if (errItens) {
    alert("Erro ao salvar itens: " + errItens.message);
    return;
  }

  limparFormulario();
  await carregarPedidos();
  alert("Pedido salvo com sucesso!");
});

// ============================
// LISTAR PEDIDOS
// ============================
async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, clientes(razao_social)")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const tabela = document.getElementById("tabelaPedidos");
  tabela.innerHTML = "";

  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.numero_pedido}</td>
      <td>${p.clientes?.razao_social || ""}</td>
      <td>${p.data_pedido || ""}</td>
      <td>${p.data_entrega || ""}</td>
      <td>${p.status}</td>
      <td>
        <span class="action-btn" onclick="editarPedido(${p.id})">Editar</span>
        <span class="action-btn" onclick="excluirPedido(${p.id})">Excluir</span>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

// ============================
// EDITAR PEDIDO
// ============================
window.editarPedido = async function(id) {
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("pedidoId").value = pedido.id;
  document.getElementById("cliente_id").value = pedido.cliente_id;
  document.getElementById("numero_pedido").value = pedido.numero_pedido;
  document.getElementById("data_pedido").value = pedido.data_pedido;
  document.getElementById("data_entrega").value = pedido.data_entrega || "";
  document.getElementById("status").value = pedido.status;

  // Carregar itens do pedido
  const { data: itens, error: errItens } = await supabase
    .from("pedidos_itens")
    .select("id, produto_id, quantidade, valor_unitario, produtos(codigo, descricao)")
    .eq("pedido_id", id);

  if (errItens) {
    console.error(errItens);
    return;
  }

  itensPedido = (itens || []).map(i => ({
    produto_id: i.produto_id,
    codigo: i.produtos?.codigo || "",
    descricao: i.produtos?.descricao || "",
    quantidade: Number(i.quantidade),
    valor_unitario: Number(i.valor_unitario)
  }));

  renderizarItens();

  document.querySelector('.tab[data-tab="cadastro"]').click();
};

// ============================
// EXCLUIR PEDIDO
// ============================
window.excluirPedido = async function(id) {
  if (!confirm("Tem certeza que deseja excluir este pedido?")) return;

  await supabase.from("pedidos_itens").delete().eq("pedido_id", id);
  await supabase.from("pedidos").delete().eq("id", id);

  carregarPedidos();
};

// ============================
// LIMPAR FORMULÁRIO
// ============================
function limparFormulario() {
  document.getElementById("pedidoId").value = "";
  document.getElementById("formPedido").reset();
  itensPedido = [];
  renderizarItens();
}

document.getElementById("btnCancelar").addEventListener("click", limparFormulario);
