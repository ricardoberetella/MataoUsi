import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    maximumFractionDigits: 2
  });
}

/* =============================
      AO INICIAR
============================= */
document.addEventListener("DOMContentLoaded", async () => {
  await carregarClientes();
  await carregarProdutos();
  atualizarTabela();

  const btnAddItem = document.getElementById("btnAddItem");
  const btnConfirmarItem = document.getElementById("btnConfirmarItem");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const btnSalvar = document.getElementById("btnSalvar");
  const inputBusca = document.getElementById("produto_busca");

  if (btnAddItem) btnAddItem.addEventListener("click", abrirModalItem);
  if (btnConfirmarItem) btnConfirmarItem.addEventListener("click", adicionarItem);
  if (btnFecharModal) btnFecharModal.addEventListener("click", fecharModalItem);
  if (btnSalvar) btnSalvar.addEventListener("click", salvarPedido);

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
    console.error("Erro ao carregar clientes", error);
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
    .select("id, codigo, descricao, valor_unitario")  // <-- CORRIGIDO
    .order("codigo");

  if (error) {
    console.error("Erro ao carregar produtos", error);
    return;
  }

  listaProdutos = data || [];
}

/* =============================
      MODAL DE ITEM
============================= */
function abrirModalItem() {
  const modal = document.getElementById("modalItem");
  if (modal) modal.style.display = "flex";

  produtoSelecionado = null;

  ["produto_busca", "quantidade", "valor_unitario", "data_entrega"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const inputBusca = document.getElementById("produto_busca");
  if (inputBusca) {
    inputBusca.focus();
    mostrarListaProdutos("");
  }
}

function fecharModalItem() {
  const modal = document.getElementById("modalItem");
  if (modal) modal.style.display = "none";

  const lista = document.getElementById("listaProdutos");
  if (lista) lista.style.display = "none";
}

/* =============================
      LISTA / AUTOCOMPLETE
============================= */
function mostrarListaProdutos(texto) {
  const lista = document.getElementById("listaProdutos");
  if (!lista) return;

  const termo = (texto || "").toLowerCase();

  let filtrados = listaProdutos;
  if (termo) {
    filtrados = listaProdutos.filter((p) => {
      return (
        p.codigo.toLowerCase().includes(termo) ||
        p.descricao.toLowerCase().includes(termo)
      );
    });
  }

  lista.innerHTML = "";
  lista.style.display = "block";

  filtrados.forEach((p) => {
    const div = document.createElement("div");
    div.classList.add("autocomplete-item");
    div.innerHTML = `
      <span class="codigo">${p.codigo}</span>
      <span class="descricao">— ${p.descricao}</span>
    `;

    div.addEventListener("click", () => selecionarProduto(p));
    lista.appendChild(div);
  });
}

function selecionarProduto(produto) {
  produtoSelecionado = produto;

  const inputBusca = document.getElementById("produto_busca");
  const inputValor = document.getElementById("valor_unitario");
  const inputQtd = document.getElementById("quantidade");
  const lista = document.getElementById("listaProdutos");

  if (inputBusca)
    inputBusca.value = `${produto.codigo} — ${produto.descricao}`;

  if (inputValor) {
    const valor = produto.valor_unitario ?? 0;   // <-- CORRIGIDO
    inputValor.value = formatarValorBR(valor);
  }

  if (lista) lista.style.display = "none";
  if (inputQtd) inputQtd.focus();
}

/* =============================
      ADICIONAR ITEM
============================= */
function adicionarItem() {
  if (!produtoSelecionado) {
    alert("Selecione um produto.");
    return;
  }

  const qtdEl = document.getElementById("quantidade");
  const valorEl = document.getElementById("valor_unitario");
  const dataEl = document.getElementById("data_entrega");

  const quantidade = parseInt(qtdEl.value);
  const valorUnit = parseFloat(valorEl.value.replace(".", "").replace(",", "."));
  const dataEntrega = dataEl.value;

  itens.push({
    produto_id: produtoSelecionado.id,
    codigo: produtoSelecionado.codigo,
    descricao: produtoSelecionado.descricao,
    quantidade,
    valor_unitario: valorUnit,
    data_entrega: dataEntrega
  });

  atualizarTabela();
  fecharModalItem();
}

/* =============================
      TABELA DE ITENS
============================= */
function atualizarTabela() {
  const tbody = document.getElementById("tabelaItens");
  if (!tbody) return;

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
  const data_pedido = document.getElementById("data_pedido").value;
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
        tipo_pedido: "normal"
      }
    ])
    .select()
    .single();

  for (const item of itens) {
    await supabase.from("pedidos_itens").insert([
      {
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        data_entrega: item.data_entrega
      }
    ]);
  }

  alert("Pedido salvo com sucesso!");
  window.location.href = "pedidos_lista.html";
}
