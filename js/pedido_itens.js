import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// PEGAR O ID PASSADO NA URL
// ===============================
const params = new URLSearchParams(window.location.search);
const pedidoId = params.get("id"); // <--- CORRIGIDO

if (!pedidoId) {
  alert("ID do pedido não informado.");
  window.location.href = "pedidos_lista.html";
}

// ===============================
// AO CARREGAR A PÁGINA
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  carregarPedido();
  carregarItens();
});

// ===============================
// CARREGAR INFO DO PEDIDO
// ===============================
async function carregarPedido() {
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
    console.error(error);
    alert("Erro ao carregar o pedido.");
    return;
  }

  document.getElementById("pedidoNumero").textContent = data.numero_pedido;
  document.getElementById("pedidoCliente").textContent = data.clientes?.razao_social || "—";
  document.getElementById("pedidoData").textContent = new Date(data.data_pedido).toLocaleDateString("pt-BR");
  document.getElementById("pedidoTipo").textContent = data.tipo_pedido;
  document.getElementById("pedidoTotal").textContent = formatar(data.total);
}

// ===============================
// CARREGAR ITENS
// ===============================
async function carregarItens() {
  const tbody = document.getElementById("tbodyItens");
  tbody.innerHTML = "";

  const { data, error } = await supabase
    .from("pedidos_itens")
    .select(`
      *,
      produtos:produto_id ( codigo, descricao )
    `)
    .eq("pedido_id", pedidoId);

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="10">Erro ao carregar itens.</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10">Nenhum item encontrado.</td></tr>`;
    return;
  }

  data.forEach((item) => {
    const entrega = item.data_entrega
      ? new Date(item.data_entrega).toLocaleDateString("pt-BR")
      : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produtos?.codigo || ""}</td>
      <td>${item.produtos?.descricao || ""}</td>
      <td>${formatar(item.quantidade)}</td>
      <td>${formatar(item.valor_unitario)}</td>
      <td>${formatar(item.total_item)}</td>
      <td>${entrega}</td>
      <td>${item.status || "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}

function formatar(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
