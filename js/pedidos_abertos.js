// ====================================================
// PEDIDOS_ABERTOS.JS — FINAL FUNCIONAL
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  await carregarFiltros();
  await carregarPedidosAbertos();

  document
    .getElementById("btnFiltrar")
    ?.addEventListener("click", carregarPedidosAbertos);
});

// ====================================================
// FORMATAR DATA
// ====================================================
function formatarData(valor) {
  if (!valor) return "-";
  const [a, m, d] = String(valor).substring(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

// ====================================================
// FILTROS
// ====================================================
async function carregarFiltros() {
  const selCliente = document.getElementById("clienteFiltro");
  const selProduto = document.getElementById("produtoFiltro");

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  selCliente.innerHTML = `<option value="">Todos</option>`;
  clientes?.forEach(c => {
    selCliente.innerHTML += `<option value="${c.id}">${c.razao_social}</option>`;
  });

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, codigo, descricao")
    .order("codigo");

  selProduto.innerHTML = `<option value="">Todos</option>`;
  produtos?.forEach(p => {
    selProduto.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.descricao}</option>`;
  });
}

// ====================================================
// PEDIDOS EM ABERTO
// ====================================================
async function carregarPedidosAbertos() {
  const tbody = document.getElementById("listaPedidos");
  tbody.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  const produtoId  = document.getElementById("produtoFiltro").value;
  const entregaAte = document.getElementById("dataFiltro").value;

  let query = supabase
    .from("pedidos_itens")
    .select(`
      id,
      quantidade,
      quantidade_baixada,
      data_entrega,
      pedidos (
        numero_pedido
      ),
      produtos (
        codigo,
        descricao
      )
    `);

  if (produtoId)  query = query.eq("produto_id", produtoId);
  if (entregaAte) query = query.lte("data_entrega", entregaAte);

  const { data, error } = await query;

  if (error) {
    console.error("ERRO SUPABASE:", error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar pedidos</td></tr>`;
    return;
  }

  const abertos = data.filter(i => {
    const aberto = i.quantidade - (i.quantidade_baixada || 0);
    return aberto > 0 && i.pedidos && i.produtos;
  });

  if (abertos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum pedido em aberto</td></tr>`;
    return;
  }

  // FIFO REAL
  abertos.sort((a, b) => {
    if (a.data_entrega < b.data_entrega) return -1;
    if (a.data_entrega > b.data_entrega) return 1;
    return Number(a.pedidos.numero_pedido) - Number(b.pedidos.numero_pedido);
  });

  tbody.innerHTML = "";

  abertos.forEach(i => {
    const baixado = i.quantidade_baixada || 0;
    const aberto  = i.quantidade - baixado;

    tbody.innerHTML += `
      <tr>
        <td>${i.pedidos.numero_pedido}</td>
        <td>${i.produtos.codigo} - ${i.produtos.descricao}</td>
        <td>${formatarData(i.data_entrega)}</td>
        <td>${i.quantidade}</td>
        <td>${baixado}</td>
        <td>${aberto}</td>
      </tr>
    `;
  });
}
