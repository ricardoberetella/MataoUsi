import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------
// PEGAR ID DO PEDIDO NA URL
// ------------------------------
const params = new URLSearchParams(window.location.search);
const pedidoId = params.get("id");

if (!pedidoId) {
  alert("Pedido inválido.");
  window.location.href = "pedidos_lista.html";
}

// ------------------------------
// AO CARREGAR
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  carregarCabecalho();
  carregarItens();
});

// ------------------------------
// CABEÇALHO DO PEDIDO
// ------------------------------
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

  if (error || !data) {
    console.error(error);
    document.getElementById("infoPedido").textContent = "Erro ao carregar pedido.";
    return;
  }

  const info =
    `Pedido Nº ${data.numero_pedido} — ` +
    `${data.clientes?.razao_social || ""} — ` +
    `${new Date(data.data_pedido).toLocaleDateString("pt-BR")} — ` +
    `Total R$ ${formatar(data.total)}`;

  document.getElementById("infoPedido").textContent = info;
}

// ------------------------------
// LISTAR ITENS DO PEDIDO
// ------------------------------
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
      quantidade_entregue,
      data_entrega,
      valor_unitario,
      total_item,
      status,
      produtos:produto_id ( codigo, descricao )
    `)
    .eq("pedido_id", pedidoId);

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="10">Erro ao carregar itens.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10">Nenhum item encontrado.</td></tr>`;
    return;
  }

  data.forEach((item) => {
    const qtdEnt = Number(item.quantidade_entregue || 0);
    const restante = Number(item.quantidade) - qtdEnt;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.produtos?.codigo || ""}</td>
      <td>${item.produtos?.descricao || ""}</td>
      <td>${formatar(item.quantidade)}</td>
      <td>${formatar(qtdEnt)}</td>
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

  document.querySelectorAll(".btn-remover").forEach((btn) => {
    btn.addEventListener("click", () => excluirItem(btn.dataset.id));
  });
}

// ------------------------------
// EXCLUIR ITEM
// ------------------------------
async function excluirItem(id) {
  if (!confirm("Deseja realmente excluir este item?")) return;

  const { error } = await supabase
    .from("pedidos_itens")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir item.");
    console.error(error);
    return;
  }

  carregarItens();
}

// ------------------------------
function formatar(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
