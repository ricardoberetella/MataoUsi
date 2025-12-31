// ====================================================
// PEDIDOS_ABERTOS.JS — FINAL DEFINITIVO (ANTI-RLS)
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
function formatarData(valor) {
  if (!valor) return "-";
  const [a, m, d] = String(valor).substring(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

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
async function carregarPedidosAbertos() {
  const tbody = document.getElementById("listaPedidos");
  tbody.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  const produtoId  = document.getElementById("produtoFiltro").value;
  const entregaAte = document.getElementById("dataFiltro").value;

  let query = supabase
    .from("pedidos_itens")
    .select(`
      id,
      pedido_id,
      produto_id,
      quantidade,
      quantidade_baixada,
      data_entrega
    `);

  if (produtoId)  query = query.eq("produto_id", produtoId);
  if (entregaAte) query = query.lte("data_entrega", entregaAte);

  const { data: itens, error } = await query;

  if (error) {
    console.error("ERRO ITENS:", error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar pedidos</td></tr>`;
    return;
  }

  if (!itens || itens.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum pedido em aberto</td></tr>`;
    return;
  }

  // IDs únicos
  const pedidosIds  = [...new Set(itens.map(i => i.pedido_id))];
  const produtosIds = [...new Set(itens.map(i => i.produto_id))];

  // Buscar pedidos
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, numero_pedido")
    .in("id", pedidosIds);

  // Buscar produtos
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, codigo, descricao")
    .in("id", produtosIds);

  const mapPedidos  = Object.fromEntries(pedidos.map(p => [p.id, p]));
  const mapProdutos = Object.fromEntries(produtos.map(p => [p.id, p]));

  const abertos = itens
    .map(i => ({
      ...i,
      pedido: mapPedidos[i.pedido_id],
      produto: mapProdutos[i.produto_id]
    }))
    .filter(i => {
      const aberto = i.quantidade - (i.quantidade_baixada || 0);
      return aberto > 0 && i.pedido && i.produto;
    });

  if (abertos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum pedido em aberto</td></tr>`;
    return;
  }

  // FIFO
  abertos.sort((a, b) => {
    if (a.data_entrega < b.data_entrega) return -1;
    if (a.data_entrega > b.data_entrega) return 1;
    return Number(a.pedido.numero_pedido) - Number(b.pedido.numero_pedido);
  });

  tbody.innerHTML = "";

  abertos.forEach(i => {
    const baixado = i.quantidade_baixada || 0;
    const aberto  = i.quantidade - baixado;

    tbody.innerHTML += `
      <tr>
        <td>${i.pedido.numero_pedido}</td>
        <td>${i.produto.codigo} - ${i.produto.descricao}</td>
        <td>${formatarData(i.data_entrega)}</td>
        <td>${i.quantidade}</td>
        <td>${baixado}</td>
        <td>${aberto}</td>
      </tr>
    `;
  });
}
