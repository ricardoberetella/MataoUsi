import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnAtualizar").addEventListener("click", carregarPedidos);
  document.getElementById("filtroNumero").addEventListener("input", carregarPedidos);
  document.getElementById("filtroCliente").addEventListener("input", carregarPedidos);
  document.getElementById("filtroTipo").addEventListener("change", carregarPedidos);

  carregarPedidos();
});

async function carregarPedidos() {
  const tbody = document.getElementById("tbodyPedidos");
  const emptyState = document.getElementById("emptyStatePedidos");

  tbody.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  let { data, error } = await supabase
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

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar pedidos.</td></tr>`;
    return;
  }

  // Filtros simples no front
  const filtroNumero = document.getElementById("filtroNumero").value.trim().toLowerCase();
  const filtroCliente = document.getElementById("filtroCliente").value.trim().toLowerCase();
  const filtroTipo = document.getElementById("filtroTipo").value;

  data = data.filter((p) => {
    let ok = true;

    if (filtroNumero) {
      ok = ok && String(p.numero_pedido || "").toLowerCase().includes(filtroNumero);
    }

    if (filtroCliente) {
      const nomeCliente = (p.clientes?.razao_social || "").toLowerCase();
      ok = ok && nomeCliente.includes(filtroCliente);
    }

    if (filtroTipo) {
      ok = ok && p.tipo_pedido === filtroTipo;
    }

    return ok;
  });

  tbody.innerHTML = "";

  if (!data.length) {
    emptyState.style.display = "block";
    return;
  } else {
    emptyState.style.display = "none";
  }

  for (const pedido of data) {
    const tr = document.createElement("tr");

    const dataBR = pedido.data_pedido
      ? new Date(pedido.data_pedido).toLocaleDateString("pt-BR")
      : "-";

    const total = pedido.total ?? 0;

    tr.innerHTML = `
      <td>${pedido.numero_pedido || "-"}</td>
      <td>${dataBR}</td>
      <td>${pedido.clientes?.razao_social || "-"}</td>
      <td>${pedido.tipo_pedido || "-"}</td>
      <td>${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="col-acoes">
        <button class="btn-secondary btn-sm" data-id="${pedido.id}" data-acao="editar">Editar</button>
        <button class="btn-outline btn-sm" data-id="${pedido.id}" data-acao="itens">Itens</button>
      </td>
    `;

    tbody.appendChild(tr);
  }

  // Ações dos botões
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    const acao = btn.getAttribute("data-acao");

    if (acao === "editar") {
      window.location.href = `pedidos.html?id=${id}`;
    } else if (acao === "itens") {
      window.location.href = `pedidos.html?id=${id}#itens`;
    }
  });
}
