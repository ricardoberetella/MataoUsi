import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  carregarPedidos();
  document.getElementById("btnFiltrar").addEventListener("click", carregarPedidos);
});

/* ============================================================
   CARREGAR LISTA DE PEDIDOS
============================================================ */
async function carregarPedidos() {
  const filtroNumero = document.getElementById("filtroNumero").value.trim();
  const filtroCliente = document.getElementById("filtroCliente").value.trim();
  const filtroTipo = document.getElementById("filtroTipo").value;

  let query = supabase
    .from("pedidos")
    .select(`
      id,
      numero_pedido,
      data_pedido,
      tipo_pedido,
      total,
      clientes:cliente_id ( id, razao_social )
    `)
    .order("id", { ascending: false });

  if (filtroNumero) {
    query = query.ilike("numero_pedido", `%${filtroNumero}%`);
  }

  if (filtroTipo && filtroTipo !== "TODOS") {
    query = query.eq("tipo_pedido", filtroTipo);
  }

  if (filtroCliente) {
    query = query.ilike("clientes.razao_social", `%${filtroCliente}%`);
  }

  const { data, error } = await query;

  const tbody = document.getElementById("tbodyPedidos");
  tbody.innerHTML = "";

  if (error) {
    console.error("Erro ao carregar pedidos:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="erro">Erro ao carregar pedidos.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum pedido encontrado.</td></tr>`;
    return;
  }

  for (const ped of data) {
    const dataBR = ped.data_pedido
      ? new Date(ped.data_pedido).toLocaleDateString("pt-BR")
      : "-";

    const cliente = ped.clientes?.razao_social || "—";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ped.numero_pedido}</td>
      <td>${dataBR}</td>
      <td>${cliente}</td>
      <td>${ped.tipo_pedido}</td>
      <td>R$ ${formatarValor(ped.total)}</td>
      <td class="acoes">
        <a href="pedidos_itens.html?id=${ped.id}" class="btn-ver">Ver</a>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

/* ============================================================
   FORMATAÇÃO
============================================================ */
function formatarValor(v) {
  const val = Number(v || 0);
  return val.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
