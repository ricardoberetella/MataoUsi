import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatDecimal(valor) {
  if (valor == null) return "R$ 0,00";
  const num = Number(valor);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("tbodyPedidos");
  const btnNovo = document.getElementById("btnNovoPedido");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const filtroNumero = document.getElementById("filtroNumero");
  const filtroCliente = document.getElementById("filtroCliente");

  btnNovo.addEventListener("click", () => {
    window.location.href = "pedido_novo.html";
  });

  btnFiltrar.addEventListener("click", carregarPedidos);

  filtroNumero.addEventListener("keyup", (e) => {
    if (e.key === "Enter") carregarPedidos();
  });
  filtroCliente.addEventListener("keyup", (e) => {
    if (e.key === "Enter") carregarPedidos();
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target;

    if (btn.matches(".btn-abrir-pedido")) {
      const id = btn.dataset.id;
      window.location.href = `pedido_novo.html?id=${id}`;
    }

    if (btn.matches(".btn-excluir-pedido")) {
      const id = btn.dataset.id;
      const num = btn.dataset.numero || "";

      if (confirm(`Tem certeza que deseja excluir o documento ${num}?`)) {
        const { error } = await supabase.from("pedidos").delete().eq("id", id);
        if (error) {
          alert("Erro ao excluir pedido: " + error.message);
        } else {
          carregarPedidos();
        }
      }
    }
  });

  carregarPedidos();
});

async function carregarPedidos() {
  const tbody = document.getElementById("tbodyPedidos");
  const filtroNumero = document.getElementById("filtroNumero");
  const filtroCliente = document.getElementById("filtroCliente");

  tbody.innerHTML = `<tr><td colspan="7">Carregando...</td></tr>`;

  let query = supabase
    .from("pedidos")
    .select("id, cliente_id, data_pedido, tipo_documento, numero_documento, total")
    .order("id", { ascending: false });

  const numero = filtroNumero.value.trim();
  if (numero) {
    query = query.ilike("numero_documento", `%${numero}%`);
  }

  const { data: pedidos, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar: ${error.message}</td></tr>`;
    return;
  }

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum pedido encontrado.</td></tr>`;
    return;
  }

  const clienteBusca = filtroCliente.value.trim().toLowerCase();
  const mapaClientes = await carregarNomesClientes(pedidos.map(p => p.cliente_id));

  const filtrados = pedidos.filter(p => {
    if (!clienteBusca) return true;
    const nome = (mapaClientes.get(p.cliente_id) || "").toLowerCase();
    return nome.includes(clienteBusca);
  });

  tbody.innerHTML = "";

  for (const p of filtrados) {
    const tr = document.createElement("tr");
    const nomeCliente = mapaClientes.get(p.cliente_id) || "-";

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.tipo_documento || ""}</td>
      <td>${p.numero_documento || ""}</td>
      <td>${nomeCliente}</td>
      <td>${formatData(p.data_pedido)}</td>
      <td>${formatDecimal(p.total)}</td>
      <td>
        <button class="btn btn-secondary btn-abrir-pedido" data-id="${p.id}">
          Abrir
        </button>
        <button class="btn btn-ghost btn-excluir-pedido" 
                data-id="${p.id}" 
                data-numero="${p.numero_documento}">
          Excluir
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

async function carregarNomesClientes(ids) {
  const mapa = new Map();
  const unicos = [...new Set(ids.filter(id => id != null))];

  if (unicos.length === 0) return mapa;

  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .in("id", unicos);

  if (error || !data) return mapa;

  for (const c of data) {
    mapa.set(c.id, c.razao_social);
  }

  return mapa;
}
