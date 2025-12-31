// ====================================================
// PEDIDOS_ABERTOS.JS — FINAL ABSOLUTO
// QUANTIDADE BAIXADA REAL (SEM JOIN PROBLEMÁTICO)
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  await carregarFiltros();
  await carregarPedidosAbertos();

  document.getElementById("btnFiltrar")
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
  if (!selCliente || !selProduto) return;

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  selCliente.innerHTML = `<option value="">Todos</option>`;
  clientes?.forEach(c =>
    selCliente.innerHTML += `<option value="${c.id}">${c.razao_social}</option>`
  );

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, codigo, descricao")
    .order("codigo");

  selProduto.innerHTML = `<option value="">Todos</option>`;
  produtos?.forEach(p =>
    selProduto.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.descricao}</option>`
  );
}

// ====================================================
async function carregarPedidosAbertos() {
  const tbody = document.getElementById("listaPedidos");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  const produtoId = document.getElementById("produtoFiltro")?.value || "";
  const entregaAte = document.getElementById("dataFiltro")?.value || "";

  // 1️⃣ Buscar pedidos_itens
  let query = supabase
    .from("pedidos_itens")
    .select(`
      id,
      quantidade,
      data_entrega,
      pedidos:pedido_id ( numero_pedido ),
      produtos:produto_id ( codigo, descricao )
    `);

  if (produtoId) query = query.eq("produto_id", produtoId);
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

  // 2️⃣ Buscar baixas separadamente
  const ids = itens.map(i => i.id);

  const { data: baixas, error: erroBaixas } = await supabase
    .from("notas_pedidos_baixas")
    .select("pedido_item_id, quantidade")
    .in("pedido_item_id", ids);

  if (erroBaixas) {
    console.error("ERRO BAIXAS:", erroBaixas);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao calcular baixas</td></tr>`;
    return;
  }

  // 3️⃣ Somar baixas por item
  const mapaBaixas = {};
  baixas?.forEach(b => {
    mapaBaixas[b.pedido_item_id] =
      (mapaBaixas[b.pedido_item_id] || 0) + Number(b.quantidade || 0);
  });

  // 4️⃣ Calcular saldo
  const abertos = itens.map(i => {
    const baixado = mapaBaixas[i.id] || 0;
    return {
      ...i,
      baixado,
      aberto: i.quantidade - baixado
    };
  }).filter(i => i.aberto > 0);

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

  // Render
  tbody.innerHTML = "";

  abertos.forEach(i => {
    tbody.innerHTML += `
      <tr>
        <td>${i.pedidos.numero_pedido}</td>
        <td>${i.produtos.codigo} - ${i.produtos.descricao}</td>
        <td>${formatarData(i.data_entrega)}</td>
        <td>${i.quantidade}</td>
        <td>${i.baixado}</td>
        <td>${i.aberto}</td>
      </tr>
    `;
  });
}
