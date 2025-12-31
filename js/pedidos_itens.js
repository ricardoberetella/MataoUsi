import { supabase, verificarLogin } from "./auth.js";

// Data BR sem shift de fuso
function dataBR(iso) {
  if (!iso) return "-";
  const s = String(iso).split("T")[0];
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "-";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// ===============================
// PEGAR ID DA URL
// ===============================
const params = new URLSearchParams(window.location.search);
const pedidoId = params.get("id");

if (!pedidoId) {
  alert("ID do pedido não informado.");
  window.location.href = "pedidos_lista.html";
}

document.addEventListener("DOMContentLoaded", async () => {

  // 🔐 Proteção — impede abrir sem login
  const user = await verificarLogin();
  if (!user) return;

  await carregarCabecalho();
  await carregarItens();
});

// ===============================
// CABEÇALHO
// ===============================
async function carregarCabecalho() {

  await verificarLogin(); // 🔐 segurança adicional

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id,
      numero_pedido,
      data_pedido,
      tipo_pedido,
      total,
      clientes:cliente_id ( razao_social )
    `)
    .eq("id", pedidoId)
    .maybeSingle();

  if (error || !data) {
    console.error("Erro carregando cabeçalho:", error);
    return;
  }

  document.getElementById("infoPedido").textContent =
    `Pedido Nº ${data.numero_pedido} — ${data.clientes?.razao_social} — ` +
    `${dataBR(data.data_pedido)} — Total: R$ ${formatar(data.total)}`;
}

// ===============================
// ITENS DO PEDIDO
// ===============================
async function carregarItens() {

  await verificarLogin(); // 🔐 segurança adicional

  const tbody = document.getElementById("listaItens");
  tbody.innerHTML = "";

  const { data, error } = await supabase
    .from("pedidos_itens")
    .select(`
      id,
      produto_id,
      quantidade,
      quantidade_entregue,
      valor_unitario,
      total_item,
      data_entrega,
      status,
      produtos:produto_id ( codigo, descricao )
    `)
    .eq("pedido_id", pedidoId);

  if (error) {
    console.error("Erro Supabase:", error);
    tbody.innerHTML = "<tr><td colspan='10'>Erro ao carregar itens.</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='10'>Nenhum item encontrado.</td></tr>";
    return;
  }

  data.forEach(item => {
    const entregue = Number(item.quantidade_entregue ?? 0);
    const restante = Number(item.quantidade ?? 0) - entregue;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produtos?.codigo ?? ""}</td>
      <td>${item.produtos?.descricao ?? ""}</td>
      <td>${formatar(item.quantidade)}</td>
      <td>${formatar(entregue)}</td>
      <td>${formatar(restante)}</td>
      <td>${formatar(item.valor_unitario)}</td>
      <td>${formatar(item.total_item)}</td>
      <td>${dataBR(item.data_entrega)}</td>
      <td>${item.status ?? "-"}</td>
      <td><button class="btn-remover" data-id="${item.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===============================
// FORMATAR
// ===============================
function formatar(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
