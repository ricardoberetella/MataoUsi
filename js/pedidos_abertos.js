// ====================================================
// PEDIDOS_ABERTOS.JS — FIFO CORRETO + ROBUSTO
// ====================================================

import { supabase, verificarLogin } from "../auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  await carregarFiltros();
  await carregarPedidosAbertos();

  document
    .getElementById("btnFiltrar")
    ?.addEventListener("click", carregarPedidosAbertos);
});

function formatarData(valor) {
  if (!valor) return "-";
  const [a, m, d] = String(valor).substring(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

async function carregarFiltros() {
  const selCliente = document.getElementById("filtroCliente");
  const selProduto = document.getElementById("filtroProduto");
  if (!selCliente || !selProduto) return;

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

async function carregarPedidosAbertos() {
  const tbody = document.getElementById("tbodyPedidosAbertos");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  const produtoId = document.getElementById("filtroProduto")?.value || "";
  const entregaAte = document.getElementById("filtroEntrega")?.value || "";

  let query = supabase
    .from("pedidos_itens")
    .select(`
      id,
      pedido_id,
      quantidade,
      quantidade_baixada,
      data_entrega,
      pedidos:pedido_id ( numero_pedido ),
      produtos:produto_id ( codigo, descricao )
    `);

  if (produtoId) query = query.eq("produto_id", produtoId);
  if (entregaAte) query = query.lte("data_entrega", entregaAte);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar</td></tr>`;
    return;
  }

  // 🔴 FILTRA FKs QUEBRADAS
  const validos = data.filter(i =>
    i.pedidos && i.produtos &&
    (i.quantidade - (i.quantidade_baixada || 0)) > 0
  );

  if (validos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum pedido em aberto</td></tr>`;
    return;
  }

  validos.sort((a, b) => {
    const da = a.data_entrega;
    const db = b.data_entrega;
    if (da < db) return -1;
    if (da > db) return 1;
    return Number(a.pedidos.numero_pedido) - Number(b.pedidos.numero_pedido);
  });

  tbody.innerHTML = "";

  validos.forEach(i => {
    const aberto = i.quantidade - (i.quantidade_baixada || 0);
    tbody.innerHTML += `
      <tr>
        <td>${i.pedidos.numero_pedido}</td>
        <td>${i.produtos.codigo} - ${i.produtos.descricao}</td>
        <td>${formatarData(i.data_entrega)}</td>
        <td>${i.quantidade}</td>
        <td>${i.quantidade_baixada || 0}</td>
        <td>${aberto}</td>
      </tr>
    `;
  });
}
