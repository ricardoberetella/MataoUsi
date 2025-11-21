import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let itensPedido = [];
let produtosCache = [];

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  configurarEventos();
  setHoje();
});

function setHoje() {
  const hoje = new Date().toISOString().substring(0, 10);
  const inputData = document.getElementById("data_pedido");
  if (inputData && !inputData.value) inputData.value = hoje;
}

/* ------------ CLIENTES ------------ */

async function carregarClientes() {
  const select = document.getElementById("cliente_id");
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.razao_social;
    select.appendChild(opt);
  });
}

/* ------------ EVENTOS ------------ */

function configurarEventos() {
  document.getElementById("btnBuscarProduto").addEventListener("click", abrirModalProdutos);
  document.getElementById("btnFecharModal").addEventListener("click", fecharModalProdutos);
  document.getElementById("buscaProduto").addEventListener("input", filtrarProdutosModal);
  document.getElementById("btnAddItem").addEventListener("click", adicionarItem);
  document.getElementById("btnSalvarPedido").addEventListener("click", salvarPedido);
}

/* ------------ MODAL PRODUTOS ------------ */

async function abrirModalProdutos() {
  const modal = document.getElementById("modalProdutos");
  modal.style.display = "flex";

  if (produtosCache.length === 0) {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, codigo, descricao, preco_venda")
      .order("codigo");

    if (error) {
      console.error(error);
      return;
    }
    produtosCache = data;
  }

  renderizarProdutosModal(produtosCache);
}

function fecharModalProdutos() {
  const modal = document.getElementById("modalProdutos");
  modal.style.display = "none";
}

function filtrarProdutosModal() {
  const termo = document.getElementById("buscaProduto").value.trim().toLowerCase();
  const filtrados = produtosCache.filter(p =>
    p.codigo.toLowerCase().includes(termo) ||
    p.descricao.toLowerCase().includes(termo)
  );
  renderizarProdutosModal(filtrados);
}

function renderizarProdutosModal(lista) {
  const tbody = document.getElementById("listaProdutosModal");
  tbody.innerHTML = "";

  lista.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>${formatarMoeda(p.preco_venda)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" data-id="${p.id}">
          Selecionar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const prod = produtosCache.find(p => p.id === id);
      selecionarProduto(prod);
    });
  });
}

function selecionarProduto(prod) {
  document.getElementById("item_codigo").value = prod.codigo;
  document.getElementById("item_descricao").value = prod.descricao;
  document.getElementById("item_preco").value = formatarValorInput(prod.preco_venda);
  document.getElementById("item_qtd").focus();
  fecharModalProdutos();
}

/* ------------ ITENS EM MEMÓRIA ------------ */

function adicionarItem() {
  const codigo = document.getElementById("item_codigo").value.trim();
  const descricao = document.getElementById("item_descricao").value.trim();
  const precoStr = document.getElementById("item_preco").value.trim();
  const qtdStr = document.getElementById("item_qtd").value.trim();
  const dataEntrega = document.getElementById("item_data_entrega").value;

  const msgErro = document.getElementById("msgErro");
  msgErro.textContent = "";

  if (!codigo || !descricao) {
    msgErro.textContent = "Selecione um produto.";
    return;
  }
  if (!qtdStr || Number(qtdStr) <= 0) {
    msgErro.textContent = "Informe uma quantidade válida.";
    return;
  }

  const produto = produtosCache.find(p => p.codigo === codigo);
  const produto_id = produto ? produto.id : null;
  const preco = parseNumero(precoStr);
  const quantidade = Number(qtdStr);
  const total = preco * quantidade;

  const item = {
    produto_id,
    codigo,
    descricao,
    valor_unitario: preco,
    quantidade,
    data_entrega: dataEntrega || null,
    quantidade_entregue: 0,
    status: "Aberto",
    valor_total: total
  };

  itensPedido.push(item);
  limparLinhaItem();
  renderizarItens();
}

function limparLinhaItem() {
  document.getElementById("item_codigo").value = "";
  document.getElementById("item_descricao").value = "";
  document.getElementById("item_preco").value = "";
  document.getElementById("item_qtd").value = "";
  document.getElementById("item_data_entrega").value = "";
}

function renderizarItens() {
  const tbody = document.getElementById("tabelaItens");
  tbody.innerHTML = "";

  let totalPedido = 0;

  itensPedido.forEach((item, index) => {
    totalPedido += item.valor_total;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.codigo}</td>
      <td>${item.descricao}</td>
      <td>${item.quantidade}</td>
      <td>${formatarMoeda(item.valor_unitario)}</td>
      <td>${item.data_entrega ? formatarDataBR(item.data_entrega) : ""}</td>
      <td>${formatarMoeda(item.valor_total)}</td>
      <td>${item.status}</td>
      <td>
        <button class="btn btn-secondary btn-sm" data-edit="${index}">Editar</button>
        <button class="btn btn-danger btn-sm" data-del="${index}">Remover</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-del]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = Number(b.getAttribute("data-del"));
      itensPedido.splice(idx, 1);
      renderizarItens();
    });
  });

  // (edição simples - pode melhorar depois)
  tbody.querySelectorAll("button[data-edit]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = Number(b.getAttribute("data-edit"));
      editarItem(idx);
    });
  });

  document.getElementById("totalPedido").textContent = formatarMoeda(totalPedido);
}

/* edição básica de item */
function editarItem(idx) {
  const item = itensPedido[idx];
  const novaQtd = window.prompt("Nova quantidade:", item.quantidade);
  if (!novaQtd) return;
  const q = Number(novaQtd);
  if (Number.isNaN(q) || q <= 0) return;

  item.quantidade = q;
  item.valor_total = item.valor_unitario * q;
  renderizarItens();
}

/* ------------ SALVAR PEDIDO ------------ */

async function salvarPedido() {
  const msgErro = document.getElementById("msgErro");
  msgErro.textContent = "";

  const cliente_id = document.getElementById("cliente_id").value;
  const data_pedido = document.getElementById("data_pedido").value;
  const tipo_documento = document.getElementById("tipo_documento").value;
  const numero_documento = document.getElementById("numero_documento").value.trim();

  if (!cliente_id || !data_pedido || !tipo_documento || !numero_documento) {
    msgErro.textContent = "Preencha cliente, data, tipo e número do documento.";
    return;
  }

  if (itensPedido.length === 0) {
    msgErro.textContent = "Adicione pelo menos um item ao pedido.";
    return;
  }

  // anti-duplicação: tipo + número
  const { data: jaExiste, error: errDupl } = await supabase
    .from("pedidos")
    .select("id")
    .eq("tipo_documento", tipo_documento)
    .eq("numero_documento", numero_documento);

  if (errDupl) {
    console.error(errDupl);
    msgErro.textContent = "Erro ao verificar duplicidade: " + errDupl.message;
    return;
  }

  if (jaExiste && jaExiste.length > 0) {
    msgErro.textContent = "Já existe um pedido com esse tipo e número de documento.";
    return;
  }

  const totalPedido = itensPedido.reduce((acc, it) => acc + it.valor_total, 0);

  // 1) insere cabeçalho
  const { data: novoPedido, error: errPedido } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: Number(cliente_id),
      data_pedido,
      tipo_documento,
      numero_documento,
      total: totalPedido
    })
    .select("id")
    .single();

  if (errPedido) {
    console.error(errPedido);
    msgErro.textContent = "Erro ao salvar pedido: " + errPedido.message;
    return;
  }

  const pedido_id = novoPedido.id;

  // 2) insere itens
  const itensParaInsert = itensPedido.map(it => ({
    pedido_id,
    produto_id: it.produto_id,
    quantidade: it.quantidade,
    valor_unitario: it.valor_unitario,
    valor_total: it.valor_total,
    data_entrega: it.data_entrega,
    quantidade_entregue: 0,
    status: "Aberto"
  }));

  const { error: errItens } = await supabase
    .from("pedidos_itens")
    .insert(itensParaInsert);

  if (errItens) {
    console.error(errItens);
    msgErro.textContent = "Erro ao salvar itens: " + errItens.message;
    return;
  }

  alert("Pedido salvo com sucesso!");
  window.location.href = "pedidos.html";
}

/* ------------ HELPERS ------------ */

function parseNumero(val) {
  if (!val) return 0;
  return Number(val.replace(/\./g, "").replace(",", "."));
}

function formatarMoeda(v) {
  if (v == null) return "";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarValorInput(v) {
  if (v == null) return "";
  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarDataBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}
