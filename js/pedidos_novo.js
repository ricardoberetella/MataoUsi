// ===============================================
//  NOVO PEDIDO — ARQUIVO COMPLETO E CORRIGIDO
//  INCLUINDO CORREÇÃO DEFINITIVA DO FUSO-HORÁRIO
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let itens = [];
let listaProdutos = [];
let produtoSelecionado = null;

/* =============================
      FORMATADORES
============================= */
function formatarDataBR(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarQuantidade(valor) {
  if (!valor && valor !== 0) return "0";
  return parseInt(valor).toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function formatarValorBR(num) {
  if (num == null || num === "") num = 0;
  return Number(num).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* =============================
      AO INICIAR
============================= */
document.addEventListener("DOMContentLoaded", async () => {

  // 🔒 PROTEGE A PÁGINA CONTRA ACESSO SEM LOGIN
  const user = await verificarLogin();
  if (!user) return;

  // 🔽 CARREGA DADOS
  await carregarClientes();
  await carregarProdutos();
  atualizarTabela();

  // BOTÕES
  document.getElementById("btnAddItem")?.addEventListener("click", abrirModalItem);
  document.getElementById("btnConfirmarItem")?.addEventListener("click", adicionarItem);
  document.getElementById("btnFecharModal")?.addEventListener("click", fecharModalItem);
  document.getElementById("btnSalvar")?.addEventListener("click", salvarPedido);

  // AUTOCOMPLETE PRODUTOS
  const inputBusca = document.getElementById("produto_busca");
  if (inputBusca) {
    inputBusca.addEventListener("focus", () => mostrarListaProdutos(""));
    inputBusca.addEventListener("input", (e) =>
      mostrarListaProdutos(e.target.value)
    );
  }
});

/* =============================
      CARREGAR CLIENTES
============================= */
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  if (error) {
    console.error("Erro ao carregar clientes:", error);
    return;
  }

  const select = document.getElementById("cliente");
  if (!select) return;

  select.innerHTML = "";

  data.forEach((cli) => {
    const opt = document.createElement("option");
    opt.value = cli.id;
    opt.textContent = cli.razao_social;
    select.appendChild(opt);
  });
}

/* =============================
      CARREGAR PRODUTOS
============================= */
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, valor_unitario")
    .order("codigo");

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    return;
  }

  listaProdutos = data || [];
}

/* =============================
      MODAL DE ITEM
============================= */
function abrirModalItem() {
  document.getElementById("modalItem").style.display = "flex";

  produtoSelecionado = null;

  ["produto_busca", "quantidade", "valor_unitario", "data_entrega"].forEach(
    (id) => (document.getElementById(id).value = "")
  );

  mostrarListaProdutos("");
}

function fecharModalItem() {
  document.getElementById("modalItem").style.display = "none";
  document.getElementById("listaProdutos").style.display = "none";
}

/* =============================
      LISTA / AUTOCOMPLETE 
============================= */
function mostrarListaProdutos(texto) {
  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";

  const termo = texto.toLowerCase();

  const filtrados = listaProdutos.filter(
    (p) =>
      p.codigo.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo)
  );

  lista.style.display = "block";

  filtrados.forEach((p) => {
    const div = document.createElement("div");
    div.classList.add("autocomplete-item");

    div.innerHTML = `
      <span class="codigo">${p.codigo}</span>
      <span class="descricao">— ${p.descricao}</span>
    `;

    div.onclick = () => selecionarProduto(p);
    lista.appendChild(div);
  });
}

function selecionarProduto(produto) {
  produtoSelecionado = produto;

  document.getElementById("produto_busca").value =
    `${produto.codigo} — ${produto.descricao}`;

  document.getElementById("valor_unitario").value =
    formatarValorBR(produto.valor_unitario ?? 0);

  document.getElementById("listaProdutos").style.display = "none";
  document.getElementById("quantidade").focus();
}

/* =============================
      ADICIONAR ITEM
============================= */
function adicionarItem() {
  if (!produtoSelecionado) {
    alert("Selecione um produto.");
    return;
  }

  const quantidade = parseInt(document.getElementById("quantidade").value);
  const valorUnit = parseFloat(
    document.getElementById("valor_unitario").value
      .replace(".", "")
      .replace(",", ".")
  );
  const dataEntrega = document.getElementById("data_entrega").value;

  itens.push({
    produto_id: produtoSelecionado.id,
    codigo: produtoSelecionado.codigo,
    descricao: produtoSelecionado.descricao,
    quantidade,
    valor_unitario: valorUnit,
    data_entrega: dataEntrega,
  });

  atualizarTabela();
  fecharModalItem();
}

/* =============================
      TABELA DE ITENS
============================= */
function atualizarTabela() {
  const tbody = document.getElementById("tabelaItens");
  tbody.innerHTML = "";

  let total = 0;

  itens.forEach((item, index) => {
    total += item.quantidade * item.valor_unitario;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.codigo}</td>
      <td>${item.descricao}</td>
      <td>${formatarQuantidade(item.quantidade)}</td>
      <td>${formatarValorBR(item.valor_unitario)}</td>
      <td>${formatarDataBR(item.data_entrega)}</td>
      <td>
        <button class="btn-azul" onclick="editarItem(${index})">Editar</button>
        <button class="btn-cinza" onclick="excluirItem(${index})">Excluir</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("total").textContent = formatarValorBR(total);
}

window.excluirItem = (index) => {
  itens.splice(index, 1);
  atualizarTabela();
};

window.editarItem = () => {
  alert("Edição de item ainda não implementada.");
};

/* =============================
      SALVAR PEDIDO
============================= */
async function salvarPedido() {
  const cliente_id = document.getElementById("cliente").value;

  // ====================================================
  //  CORREÇÃO DEFINITIVA DO PROBLEMA DE DATA
  // ====================================================
  const dataInput = document.getElementById("data_pedido").value;
  const data_pedido = dataInput + "T12:00:00"; 
  // → nunca vira outro dia no Supabase

  const numero_pedido = document.getElementById("numero_pedido").value;

  const totalPedido = itens.reduce(
    (acc, item) => acc + item.quantidade * item.valor_unitario,
    0
  );

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert([
      {
        cliente_id,
        data_pedido,
        numero_pedido,
        total: totalPedido,
        tipo_pedido: "normal",
      },
    ])
    .select()
    .single();

  if (error) {
    alert("Erro ao salvar pedido: " + error.message);
    return;
  }

  for (const item of itens) {
    await supabase.from("pedidos_itens").insert([
      {
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        data_entrega: item.data_entrega,
      },
    ]);
  }

  alert("Pedido salvo com sucesso!");
  window.location.href = "pedidos_lista.html";
}
