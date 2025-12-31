// ====================================================
// ITEM_EDITAR.JS — CORREÇÃO DEFINITIVA (DATA + UPDATE)
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

let itemId = null;
let pedidoId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  itemId = params.get("idItem");
  pedidoId = params.get("idPedido");

  if (!itemId || !pedidoId) {
    alert("Parâmetros inválidos");
    return;
  }

  document
    .getElementById("btnSalvar")
    ?.addEventListener("click", salvarAlteracoes);

  carregarItem();
});

// ====================================================
// CARREGAR ITEM
// ====================================================
async function carregarItem() {
  const { data, error } = await supabase
    .from("pedidos_itens")
    .select(`
      id,
      quantidade,
      valor_unitario,
      data_entrega,
      produtos ( codigo, descricao )
    `)
    .eq("id", itemId)
    .single();

  if (error) {
    console.error(error);
    alert("Erro ao carregar item");
    return;
  }

  document.getElementById("produto").value =
    `${data.produtos.codigo} — ${data.produtos.descricao}`;

  document.getElementById("quantidade").value = data.quantidade;
  document.getElementById("valorUnitario").value = data.valor_unitario;

  if (data.data_entrega) {
    const [y, m, d] = data.data_entrega.split("-");
    document.getElementById("dataEntrega").value = `${d}/${m}/${y}`;
  }
}

// ====================================================
// CONVERTER DATA BR → ISO
// ====================================================
function brParaISO(dataBR) {
  if (!dataBR) return null;
  const [d, m, y] = dataBR.split("/");
  if (!d || !m || !y) return null;
  return `${y}-${m}-${d}`;
}

// ====================================================
// SALVAR ALTERAÇÕES
// ====================================================
async function salvarAlteracoes() {
  const quantidade = Number(document.getElementById("quantidade").value);
  const valorUnitario = Number(
    document.getElementById("valorUnitario").value.replace(",", ".")
  );
  const dataEntregaBR = document.getElementById("dataEntrega").value;
  const dataEntregaISO = brParaISO(dataEntregaBR);

  if (!quantidade || !valorUnitario) {
    alert("Preencha quantidade e valor");
    return;
  }

  const { error } = await supabase
    .from("pedidos_itens")
    .update({
      quantidade,
      valor_unitario: valorUnitario,
      data_entrega: dataEntregaISO
    })
    .eq("id", itemId);

  if (error) {
    console.error("Erro ao atualizar item:", error);
    alert("Erro ao atualizar item.");
    return;
  }

  alert("Item atualizado com sucesso!");
  window.location.href = `pedido_ver.html?id=${pedidoId}`;
}
