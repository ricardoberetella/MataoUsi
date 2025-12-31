// ====================================================
// PEDIDOS_DETALHES.JS — ESTÁVEL (ITENS SEM ERRO)
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

let pedidoId = null;

// ====================================================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  pedidoId = params.get("id");

  if (!pedidoId) {
    alert("Pedido não informado");
    window.location.href = "pedidos_lista.html";
    return;
  }

  await carregarPedido();
  await carregarItens();
});

// ====================================================
// PEDIDO
// ====================================================
async function carregarPedido() {
  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id,
      numero_pedido,
      data_pedido,
      total,
      clientes ( razao_social )
    `)
    .eq("id", pedidoId)
    .single();

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedido");
    return;
  }

  document.getElementById("dadosPedido").innerHTML = `
    <p><strong>Número do Pedido:</strong> ${data.numero_pedido}</p>
    <p><strong>Cliente:</strong> ${data.clientes?.razao_social || "-"}</p>
    <p><strong>Data do Pedido:</strong> ${formatarData(data.data_pedido)}</p>
    <p><strong>Total:</strong> R$ ${Number(data.total).toFixed(2)}</p>
  `;
}

// ====================================================
// ITENS DO PEDIDO (SEM SQL INVÁLIDO)
// ====================================================
async function carregarItens() {
  const tbody = document.getElementById("tbodyItens");
  tbody.innerHTML = "";

  const { data: itens, error } = await supabase
    .from("pedidos_itens")
    .select(`
      id,
      produto_id,
      quantidade,
      valor_unitario,
      data_entrega
    `)
    .eq("pedido_id", pedidoId);

  if (error) {
    console.error("ERRO ITENS:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center">
          Erro ao carregar itens do pedido.
        </td>
      </tr>`;
    return;
  }

  if (!itens.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center">
          Nenhum item neste pedido.
        </td>
      </tr>`;
    return;
  }

  // 🔹 Busca produtos separadamente (seguro)
  const ids = [...new Set(itens.map(i => i.produto_id))];

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, codigo, descricao")
    .in("id", ids);

  const mapa = {};
  produtos?.forEach(p => mapa[p.id] = p);

  itens.forEach(item => {
    const prod = mapa[item.produto_id];
    const total = item.quantidade * item.valor_unitario;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${prod?.codigo || "-"}</td>
      <td>${prod?.descricao || "-"}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${Number(item.valor_unitario).toFixed(2)}</td>
      <td>${formatarData(item.data_entrega)}</td>
      <td>
        <button class="btn-editar"
          onclick="editarItem(${item.id})">Editar</button>
        <button class="btn-excluir"
          onclick="excluirItem(${item.id})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ====================================================
window.editarItem = (idItem) => {
  window.location.href =
    `item_editar.html?idItem=${idItem}&idPedido=${pedidoId}`;
};

window.excluirItem = async (idItem) => {
  if (!confirm("Excluir este item?")) return;

  const { error } = await supabase
    .from("pedidos_itens")
    .delete()
    .eq("id", idItem);

  if (error) {
    alert("Erro ao excluir item");
    return;
  }

  await carregarItens();
};

// ====================================================
// DATA DD/MM/AAAA (BLINDADO)
// ====================================================
function formatarData(valor) {
  if (!valor) return "-";
  const limpa = String(valor).substring(0, 10);
  const [ano, mes, dia] = limpa.split("-");
  return `${dia}/${mes}/${ano}`;
}
