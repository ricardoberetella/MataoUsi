// ====================================================
// PEDIDOS_ABERTOS.JS — FIFO CORRETO (ESTÁVEL)
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
// FORMATAR DATA DD/MM/AAAA
// ====================================================
function formatarData(valor) {
  if (!valor) return "-";
  const limpa = String(valor).substring(0, 10);
  const [ano, mes, dia] = limpa.split("-");
  return `${dia}/${mes}/${ano}`;
}

// ====================================================
// CARREGAR FILTROS (SEM QUEBRAR SE ID NÃO EXISTIR)
// ====================================================
async function carregarFiltros() {
  const selCliente = document.getElementById("filtroCliente");
  const selProduto = document.getElementById("filtroProduto");

  // 👉 Se o HTML não tiver esses filtros, sai sem erro
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

// ====================================================
// CARREGAR PEDIDOS EM ABERTO
// ====================================================
async function carregarPedidosAbertos() {
  const tbody = document.getElementById("tbodyPedidosAbertos");
  if (!tbody) return;

  const clienteId = document.getElementById("filtroCliente")?.value || "";
  const produtoId = document.getElementById("filtroProduto")?.value || "";
  const entregaAte = document.getElementById("filtroEntrega")?.value || "";

  let query = supabase
    .from("pedidos_itens")
    .select(`
      id,
      pedido_id,
      produto_id,
      quantidade,
      quantidade_baixada,
      data_entrega,
      pedidos ( numero_pedido ),
      produtos ( codigo, descricao )
    `);

  if (produtoId) query = query.eq("produto_id", produtoId);
  if (entregaAte) query = query.lte("data_entrega", entregaAte);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    alert("Erro ao carregar pedidos em aberto");
    return;
  }

  // ====================================================
  // ORDENAÇÃO FIFO CORRETA
  // ====================================================
  data.sort((a, b) => {
    const da = String(a.data_entrega).substring(0, 10);
    const db = String(b.data_entrega).substring(0, 10);
    if (da < db) return -1;
    if (da > db) return 1;

    const pa = Number(a.pedidos?.numero_pedido || a.pedido_id);
    const pb = Number(b.pedidos?.numero_pedido || b.pedido_id);
    return pa - pb;
  });

  tbody.innerHTML = "";

  data.forEach(item => {
    const total = item.quantidade;
    const baixado = item.quantidade_baixada || 0;
    const aberto = total - baixado;
    if (aberto <= 0) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.pedidos?.numero_pedido || item.pedido_id}</td>
      <td>${item.produtos.codigo} - ${item.produtos.descricao}</td>
      <td>${formatarData(item.data_entrega)}</td>
      <td>${total}</td>
      <td>${baixado}</td>
      <td>${aberto}</td>
    `;
    tbody.appendChild(tr);
  });
}
