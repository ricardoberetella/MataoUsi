import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let clientesCache = [];
let produtosCache = [];
let pedidosCache = [];
let itensPedido = [];

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  carregarProdutos();
  carregarPedidos();

  document.getElementById("btnNovoPedido").addEventListener("click", iniciarNovoPedido);
  document.getElementById("btnAdicionarItem").addEventListener("click", adicionarItemLinha);
  document.getElementById("btnCancelarPedido").addEventListener("click", fecharFormPedido);
  document.getElementById("formPedido").addEventListener("submit", salvarPedido);
  document.getElementById("campoBuscaPedidos").addEventListener("input", filtrarPedidos);
});

/* ============================================
   CARREGAR CLIENTES E PRODUTOS
============================================ */
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  if (error) {
    console.error("Erro ao carregar clientes:", error);
    return;
  }

  clientesCache = data || [];

  const selectCliente = document.getElementById("cliente");
  selectCliente.innerHTML = '<option value="">Selecione um cliente...</option>';

  clientesCache.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.razao_social;
    selectCliente.appendChild(opt);
  });
}

async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, descricao, preco_venda")
    .order("descricao", { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    return;
  }

  produtosCache = data || [];
}

/* ============================================
   CARREGAR PEDIDOS
============================================ */
async function carregarPedidos() {
  const lista = document.getElementById("listaPedidos");
  lista.innerHTML = "<p style='color:#00eaff;'>Carregando pedidos...</p>";

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pedidos:", error);
    lista.innerHTML = "<p style='color:red;'>Erro ao carregar pedidos.</p>";
    return;
  }

  pedidosCache = data || [];
  exibirPedidos(pedidosCache);
}

/* ============================================
   EXIBIR LISTA DE PEDIDOS
============================================ */
function exibirPedidos(pedidos) {
  const lista = document.getElementById("listaPedidos");
  lista.innerHTML = "";

  if (!pedidos || pedidos.length === 0) {
    lista.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidos.forEach(p => {
    const div = document.createElement("div");
    div.classList.add("item-pedido");

    const cliente = clientesCache.find(c => c.id === p.cliente_id);
    const nomeCliente = cliente ? cliente.razao_social : `Cliente #${p.cliente_id}`;

    const dataFormatada = p.data_pedido
      ? p.data_pedido.split("-").reverse().join("/")
      : "-";

    const totalFormatado = formatMoney(p.total);
    const numero = p.numero_pedido || "-";
    const tipo = p.tipo_pedido || "";

    div.innerHTML = `
      <div class="pedido-info">
        <div class="pedido-top">
          <span class="pedido-numero">${tipo ? tipo + " - " : ""}${numero}</span>
          <span class="pedido-data">${dataFormatada}</span>
          <span>#${p.id}</span>
        </div>
        <div class="pedido-cliente">${nomeCliente}</div>
        <div class="pedido-total">${totalFormatado}</div>
      </div>
      <button class="btn-abrir" onclick="abrirPedido(${p.id})">Abrir →</button>
    `;

    lista.appendChild(div);
  });
}

/* ============================================
   FILTRAR PEDIDOS
============================================ */
function filtrarPedidos() {
  const termo = document
    .getElementById("campoBuscaPedidos")
    .value
    .toLowerCase()
    .trim();

  if (!termo) {
    exibirPedidos(pedidosCache);
    return;
  }

  const filtrado = pedidosCache.filter(p => {
    const cliente = clientesCache.find(c => c.id === p.cliente_id);
    const nomeCliente = cliente ? cliente.razao_social.toLowerCase() : "";
    const numero = (p.numero_pedido || "").toLowerCase();
    const data = p.data_pedido ? p.data_pedido.split("-").reverse().join("/") : "";
    const idStr = String(p.id);

    return (
      nomeCliente.includes(termo) ||
      numero.includes(termo) ||
      data.includes(termo) ||
      idStr.includes(termo)
    );
  });

  exibirPedidos(filtrado);
}

/* ============================================
   ABRIR DETALHES DO PEDIDO
============================================ */
window.abrirPedido = async function (id) {
  const pedido = pedidosCache.find(p => p.id === id);
  if (!pedido) return;

  const { data: itens, error } = await supabase
    .from("pedidos_itens")
    .select("*")
    .eq("pedido_id", id);

  if (error) {
    console.error("Erro ao carregar itens do pedido:", error);
    return;
  }

  const det = document.getElementById("detalhesPedido");
  det.classList.remove("hidden");

  const cliente = clientesCache.find(c => c.id === pedido.cliente_id);
  const nomeCliente = cliente ? cliente.razao_social : `Cliente #${pedido.cliente_id}`;

  const dataFormatada = pedido.data_pedido
    ? pedido.data_pedido.split("-").reverse().join("/")
    : "-";

  let linhasItens = "";
  (itens || []).forEach(it => {
    const prod = produtosCache.find(p => p.id === it.produto_id);
    const nomeProduto = prod ? prod.descricao : `Produto #${it.produto_id}`;

    linhasItens += `
      <tr>
        <td>${nomeProduto}</td>
        <td>${Number(it.quantidade).toLocaleString("pt-BR")}</td>
        <td>${formatMoney(it.valor_unitario)}</td>
        <td>${formatMoney(it.valor_total)}</td>
      </tr>
    `;
  });

  det.innerHTML = `
    <h2>Pedido ${pedido.tipo_pedido ? pedido.tipo_pedido + " - " : ""}${pedido.numero_pedido || ""}</h2>

    <p><strong>Cliente:</strong> ${nomeCliente}</p>
    <p><strong>Data:</strong> ${dataFormatada}</p>
    <p><strong>Total:</strong> ${formatMoney(pedido.total)}</p>
    <p><strong>Observações:</strong> ${pedido.observacoes || "-"}</p>

    <h3>Itens</h3>
    <table class="tabela-itens-det">
      <thead>
        <tr>
          <th>Produto</th>
          <th>Qtd</th>
          <th>Valor Unit.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${linhasItens || `<tr><td colspan="4">Nenhum item registrado.</td></tr>`}
      </tbody>
    </table>

    <div class="detalhes-acoes">
      <button class="btn-excluir" onclick="excluirPedido(${pedido.id})">Excluir Pedido</button>
    </div>
  `;
};

/* ============================================
   EXCLUIR PEDIDO
============================================ */
window.excluirPedido = async function (id) {
  if (!confirm("Tem certeza que deseja excluir este pedido e seus itens?")) return;

  // como o pedido_id tem ON DELETE CASCADE, basta apagar o pedido
  const { error } = await supabase
    .from("pedidos")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir pedido.");
    console.error(error);
    return;
  }

  alert("Pedido excluído com sucesso!");
  document.getElementById("detalhesPedido").classList.add("hidden");
  carregarPedidos();
}

/* ============================================
   FORMULÁRIO DE NOVO PEDIDO
============================================ */
function iniciarNovoPedido() {
  itensPedido = [];
  document.getElementById("formPedido").reset();
  document.getElementById("totalGeral").textContent = "R$ 0,00";
  document.getElementById("tituloForm").textContent = "Novo Pedido";

  const hoje = new Date().toISOString().slice(0, 10);
  document.getElementById("data_pedido").value = hoje;

  document.getElementById("formContainer").classList.remove("hidden");

  const tbody = document.getElementById("tbodyItens");
  tbody.innerHTML = "";
  adicionarItemLinha();
}

function fecharFormPedido() {
  document.getElementById("formContainer").classList.add("hidden");
}

/* ============================================
   ITENS DO PEDIDO NO FORM
============================================ */
function adicionarItemLinha() {
  const novo = {
    produto_id: "",
    quantidade: 1,
    valor_unitario: 0,
    total_item: 0
  };
  itensPedido.push(novo);
  renderizarItens();
  atualizarTotalGeral();
}

function removerItemLinha(index) {
  itensPedido.splice(index, 1);
  renderizarItens();
  atualizarTotalGeral();
}

function renderizarItens() {
  const tbody = document.getElementById("tbodyItens");
  tbody.innerHTML = "";

  itensPedido.forEach((item, index) => {
    const tr = document.createElement("tr");

    const prodOptions = produtosCache.map(p =>
      `<option value="${p.id}" ${String(p.id) === String(item.produto_id) ? "selected" : ""}>
        ${p.descricao}
      </option>`
    ).join("");

    tr.innerHTML = `
      <td>
        <select data-index="${index}" class="sel-produto">
          <option value="">Selecione...</option>
          ${prodOptions}
        </select>
      </td>
      <td>
        <input type="number" min="1" step="1" data-index="${index}"
               class="inp-qtd" value="${item.quantidade}">
      </td>
      <td>
        <input type="text" data-index="${index}"
               class="inp-valor" value="${formatNumberBR(item.valor_unitario)}">
      </td>
      <td>
        <input type="text" class="inp-total"
               value="${formatNumberBR(item.total_item)}" disabled>
      </td>
      <td>
        <button type="button" class="btn-remover-linha" data-index="${index}">×</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Eventos
  tbody.querySelectorAll(".sel-produto").forEach(sel => {
    sel.addEventListener("change", onProdutoChange);
  });

  tbody.querySelectorAll(".inp-qtd").forEach(inp => {
    inp.addEventListener("input", onQtdOuValorChange);
  });

  tbody.querySelectorAll(".inp-valor").forEach(inp => {
    inp.addEventListener("input", onQtdOuValorChange);
  });

  tbody.querySelectorAll(".btn-remover-linha").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-index"));
      removerItemLinha(idx);
    });
  });
}

function onProdutoChange(e) {
  const index = Number(e.target.getAttribute("data-index"));
  const produtoId = e.target.value;
  itensPedido[index].produto_id = produtoId;

  const prod = produtosCache.find(p => String(p.id) === String(produtoId));
  if (prod) {
    itensPedido[index].valor_unitario = Number(prod.preco_venda || 0);
  }

  recalcularItem(index);
}

function onQtdOuValorChange(e) {
  const index = Number(e.target.getAttribute("data-index"));
  const linha = itensPedido[index];

  const tbody = document.getElementById("tbodyItens");
  const tr = tbody.querySelectorAll("tr")[index];
  const inpQtd = tr.querySelector(".inp-qtd");
  const inpValor = tr.querySelector(".inp-valor");

  const qtd = Number(inpQtd.value.replace(",", ".") || "0");
  const valor = parseDecimalBR(inpValor.value);

  linha.quantidade = qtd;
  linha.valor_unitario = valor;

  recalcularItem(index);
}

function recalcularItem(index) {
  const linha = itensPedido[index];
  linha.total_item = (linha.quantidade || 0) * (linha.valor_unitario || 0);

  const tbody = document.getElementById("tbodyItens");
  const tr = tbody.querySelectorAll("tr")[index];
  if (!tr) return;

  const inpTotal = tr.querySelector(".inp-total");
  if (inpTotal) {
    inpTotal.value = formatNumberBR(linha.total_item);
  }

  atualizarTotalGeral();
}

function atualizarTotalGeral() {
  const total = itensPedido.reduce((acc, it) => acc + (it.total_item || 0), 0);
  document.getElementById("totalGeral").textContent = formatMoney(total);
}

/* ============================================
   SALVAR PEDIDO
============================================ */
async function salvarPedido(e) {
  e.preventDefault();

  const clienteId = document.getElementById("cliente").value;
  const tipo = document.getElementById("tipo_pedido").value;
  const numeroBruto = document.getElementById("numero_pedido").value.trim();
  const dataPedido = document.getElementById("data_pedido").value;
  const observacoes = document.getElementById("observacoes").value.trim();

  if (!clienteId || !tipo || !numeroBruto || !dataPedido) {
    alert("Preencha cliente, tipo, número e data do pedido.");
    return;
  }

  // monta numero_pedido com prefixo e sem zeros automáticos
  const numeroCompleto = `${tipo}-${numeroBruto}`;

  // itens válidos
  const itensValidos = itensPedido.filter(it => it.produto_id && it.quantidade > 0);
  if (itensValidos.length === 0) {
    alert("Adicione pelo menos um item ao pedido.");
    return;
  }

  const total = itensValidos.reduce((acc, it) => acc + (it.total_item || 0), 0);

  // Bloqueio de número duplicado
  const { data: jaExiste, error: erroDup } = await supabase
    .from("pedidos")
    .select("id")
    .eq("numero_pedido", numeroCompleto);

  if (erroDup) {
    alert("Erro ao verificar número do pedido.");
    console.error(erroDup);
    return;
  }

  if (jaExiste && jaExiste.length > 0) {
    alert("Já existe um pedido com este número.");
    return;
  }

  // 1) Inserir pedido
  const { data: novoPedido, error: erroPedido } = await supabase
    .from("pedidos")
    .insert([{
      cliente_id: Number(clienteId),
      data_pedido: dataPedido,
      observacoes,
      total,
      tipo_pedido: tipo,
      numero_pedido: numeroCompleto
    }])
    .select("*")
    .single();

  if (erroPedido) {
    alert("Erro ao salvar pedido.");
    console.error(erroPedido);
    return;
  }

  // 2) Inserir itens (sem valor_total, o banco calcula)
  const itensToInsert = itensValidos.map(it => ({
    pedido_id: novoPedido.id,
    produto_id: Number(it.produto_id),
    quantidade: it.quantidade,
    valor_unitario: it.valor_unitario
  }));

  const { error: erroItens } = await supabase
    .from("pedidos_itens")
    .insert(itensToInsert);

  if (erroItens) {
    alert("Erro ao salvar itens do pedido.");
    console.error(erroItens);
    return;
  }

  alert("Pedido salvo com sucesso!");
  fecharFormPedido();
  carregarPedidos();
}

/* ============================================
   FORMATADORES
============================================ */
function formatMoney(val) {
  if (val == null) val = 0;
  return Number(val).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatNumberBR(val) {
  if (!val) val = 0;
  return Number(val).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseDecimalBR(str) {
  if (!str) return 0;
  return Number(
    String(str)
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}
