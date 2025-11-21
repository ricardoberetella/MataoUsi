import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- pegar ID do pedido da URL ----
const params = new URLSearchParams(window.location.search);
const pedidoId = params.get("id");

if (!pedidoId) {
  alert("ID do pedido não encontrado.");
  window.location.href = "pedidos_lista.html";
}

document.addEventListener("DOMContentLoaded", () => {
  carregarCabecalho();
  carregarItens();
});

// ---- CABEÇALHO ----
async function carregarCabecalho() {
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

  if (error) {
    console.error(error);
    return;
  }

  const texto =
    `Pedido Nº ${data.numero_pedido} — ` +
    `${data.clientes?.razao_social} — ` +
    `${new Date(data.data_pedido).toLocaleDateString("pt-BR")} — ` +
    `Total: R$ ${formatar(data.total)}`;

  document.getElementById("infoPedido").textContent = texto;
}

// ---- LISTAR ITENS ----
async function carregarItens() {
  const tbody = document.getElementById("listaItens");
  tbody.innerHTML = "";

  const { data, error } = await supabase
    .from("pedidos_itens")
    .select(`
      id,
      pedido_id,
      produto_id,
      quantidade,
      valor_unitario,
      total_item,
      data_entrega,
      status,
      produtos:produto_id ( codigo, descricao )
    `)
    .eq("pedido_id", pedidoId);

  if (error) {
    console.error(error);
    tbody.innerHTML = "<tr><td colspan='10'>Erro ao carregar itens.</td></tr>";
    return;
  }

  if (!data.length) {
    tbody.innerHTML = "<tr><td colspan='10'>Nenhum item encontrado.</td></tr>";
    return;
  }

  data.forEach(item => {
    const restante = item.quantidade; // você não tem campo entregue

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produtos?.codigo || ""}</td>
      <td>${item.produtos?.descricao || ""}</td>
      <td>${formatar(item.quantidade)}</td>
      <td>0</td>
      <td>${formatar(restante)}</td>
      <td>${formatar(item.valor_unitario)}</td>
      <td>${formatar(item.total_item)}</td>
      <td>${item.data_entrega ? new Date(item.data_entrega).toLocaleDateString("pt-BR") : "-"}</td>
      <td>${item.status || "-"}</td>
      <td>
        <button class="btn-remover" data-id="${item.id}">Excluir</button>
      </td>
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
