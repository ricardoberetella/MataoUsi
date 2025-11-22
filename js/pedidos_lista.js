import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  carregarPedidos();

  document.getElementById("btnFiltrar").onclick = carregarPedidos;
  document.getElementById("btnAtualizar").onclick = carregarPedidos;
});

/* ============================================================
   LISTAR PEDIDOS
============================================================ */
async function carregarPedidos() {
  const fNum = document.getElementById("filtroNumero").value.trim();
  const fCli = document.getElementById("filtroCliente").value.trim();
  const fTipo = document.getElementById("filtroTipo").value;
  const fCod = document.getElementById("filtroCodigo").value.trim();

  let query = supabase
    .from("pedidos")
    .select(`
      id,
      numero_pedido,
      data_pedido,
      tipo_pedido,
      total,
      clientes:cliente_id ( razao_social ),
      pedidos_itens (*, produtos:produto_id (codigo))
    `)
    .order("id", { ascending: false });

  if (fNum) query = query.ilike("numero_pedido", `%${fNum}%`);

  if (fCli)
    query = query.contains("clientes", { razao_social: fCli });

  if (fTipo)
    query = query.eq("tipo_pedido", fTipo);

  if (fCod)
    query = query.contains("pedidos_itens", {
      produtos: { codigo: fCod }
    });

  const { data, error } = await query;

  const tbody = document.getElementById("tbodyPedidos");
  tbody.innerHTML = "";

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar.</td></tr>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum pedido encontrado.</td></tr>`;
    return;
  }

  for (const ped of data) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${ped.numero_pedido}</td>
      <td>${new Date(ped.data_pedido).toLocaleDateString("pt-BR")}</td>
      <td>${ped.clientes?.razao_social ?? "--"}</td>
      <td>${ped.tipo_pedido}</td>
      <td>R$ ${formatarValor(ped.total)}</td>
      <td><a href="pedidos_itens.html?id=${ped.id}" class="btn-primary">Ver</a></td>
    `;

    tbody.appendChild(tr);
  }
}

function formatarValor(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
