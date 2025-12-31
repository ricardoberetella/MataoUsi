// ====================================================
// PEDIDOS_ABERTOS.JS — FINAL FUNCIONAL
// Compatível com:
// - HTML atual (IDs corretos)
// - Vercel (/public/js)
// - FIFO correto (data_entrega → numero_pedido)
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

// ====================================================
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
// FORMATAR DATA DD/MM/AAAA
// ====================================================
function formatarData(valor) {
  if (!valor) return "-";
  const [a, m, d] = String(valor).substring(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

// ====================================================
// CARREGAR FILTROS (IDs DO HTML)
// ====================================================
async function carregarFiltros() {
  const selCliente = document.getElementById("clienteFiltro");
  const selProduto = document.getElementById("produtoFiltro");
  if (!selCliente || !selProduto) return;

  // CLIENTES
  const { data: clientes, error: errC } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  if (!errC) {
    selCliente.innerHTML = `<option value="">Todos</option>`;
    clientes?.forEach(c => {
      selCliente.innerHTML += `<option value="${c.id}">${c.razao_social}</option>`;
    });
  }

  // PRODUTOS
  const { data: produtos, error: errP } = await supabase
    .from("produtos")
    .select("id, codigo, descricao")
    .order("codigo");

  if (!errP) {
    selProduto.innerHTML = `<option value="">Todos</option>`;
    produtos?.forEach(p => {
      selProduto.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.descricao}</option>`;
    });
  }
}

// ====================================================
// CARREGAR PEDIDOS EM ABERTO
// ====================================================
async function carregarPedidosAbertos() {
  const tbody = document.getElementById("listaPedidos");
  if (!tbody) return;

  // Estado carregando
  tbody.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  const produtoId  = document.getElementById("produtoFiltro")?.value || "";
  const entregaAte = document.getElementById("dataFiltro")?.value || "";

  let query = supabase
    .from("pedidos_itens")
    .select(`
      id,
      pedido_id,
      produto_id,
      quantidade,
      quantidade_baixada,
      data_entrega,
      pedidos:pedido_id ( numero_pedido ),
      produtos:produto_id ( codigo, descricao )
    `);

  if (produtoId)  query = query.eq("produto_id", produtoId);
  if (entregaAte) query = query.lte("data_entrega", entregaAte);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar pedidos</td></tr>`;
    return;
  }

  // Filtrar somente pedidos realmente em aberto e com joins válidos
  const abertos = data.filter(i => {
    const aberto = i.quantidade - (i.quantidade_baixada || 0);
    return aberto > 0 && i.pedidos && i.produtos;
  });

  if (abertos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum pedido em aberto</td></tr>`;
    return;
  }

  // ====================================================
  // FIFO CORRETO
  // 1) data_entrega (ASC)
  // 2) numero_pedido (ASC)
  // ====================================================
  abertos.sort((a, b) => {
    const da = a.data_entrega;
    const db = b.data_entrega;
    if (da < db) return -1;
    if (da > db) return 1;
    return Number(a.pedidos.numero_pedido) - Number(b.pedidos.numero_pedido);
  });

  // Renderizar
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
