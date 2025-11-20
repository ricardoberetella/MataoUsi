import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;
let listaPedidos = [];
let listaClientes = [];

/* =====================================================================
   ALERTA FUTURISTA
===================================================================== */
function alerta(msg, tipo = "info") {
  const div = document.createElement("div");
  div.className = `alert ${tipo}`;
  div.textContent = msg;

  document.body.appendChild(div);
  setTimeout(() => div.classList.add("show"), 20);

  setTimeout(() => {
    div.classList.remove("show");
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

/* =====================================================================
   TROCA DE ABAS
===================================================================== */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

/* =====================================================================
   CARREGAR CLIENTES
===================================================================== */
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  if (error) {
    alerta("Erro ao carregar clientes!", "erro");
    return;
  }

  listaClientes = data;

  const select = document.getElementById("cliente_id");
  select.innerHTML = "";

  listaClientes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.razao_social;
    select.appendChild(opt);
  });
}

/* =====================================================================
   CARREGAR PEDIDOS
===================================================================== */
async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, clientes(razao_social)")
    .order("id", { ascending: false });

  if (error) {
    alerta("Erro ao carregar pedidos!", "erro");
    return;
  }

  listaPedidos = data;
  renderTabela();
}

/* =====================================================================
   RENDER TABELA
===================================================================== */
function renderTabela() {
  const tbody = document.getElementById("tabelaPedidos");
  tbody.innerHTML = "";

  if (listaPedidos.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5" style="text-align:center;">Nenhum pedido encontrado.</td></tr>
    `;
    return;
  }

  listaPedidos.forEach(p => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.clientes?.razao_social ?? "-"}</td>
      <td>${p.data_pedido ?? "-"}</td>
      <td>${p.status ?? "-"}</td>
      <td>
        <span class="action-btn" onclick="editarPedido(${p.id})">Editar</span>
        <span class="action-btn" onclick="excluirPedido(${p.id})">Excluir</span>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =====================================================================
   SALVAR / ATUALIZAR
===================================================================== */
document.getElementById("formPedido").addEventListener("submit", async (e) => {
  e.preventDefault();

  const item = {
    cliente_id: Number(document.getElementById("cliente_id").value),
    data_pedido: document.getElementById("data_pedido").value,
    status: document.getElementById("status").value.trim()
  };

  let result;

  if (editandoId) {
    result = await supabase.from("pedidos").update(item).eq("id", editandoId);
  } else {
    result = await supabase.from("pedidos").insert([item]);
  }

  if (result.error) {
    alerta("Erro ao salvar pedido!", "erro");
    return;
  }

  alerta(editandoId ? "Pedido atualizado!" : "Pedido cadastrado!", "sucesso");

  limparFormulario();
  carregarPedidos();
});

/* =====================================================================
   EDITAR
===================================================================== */
window.editarPedido = async function (id) {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alerta("Erro ao carregar dados!", "erro");
    return;
  }

  editandoId = id;

  document.getElementById("cliente_id").value = data.cliente_id;
  document.getElementById("data_pedido").value = data.data_pedido;
  document.getElementById("status").value = data.status;

  document.querySelector('.tab[data-tab="cadastro"]').click();
  alerta("Editando pedido...", "info");
};

/* =====================================================================
   EXCLUIR
===================================================================== */
window.excluirPedido = async function (id) {
  if (!confirm("Deseja excluir este pedido?")) return;

  const { error } = await supabase.from("pedidos").delete().eq("id", id);

  if (error) {
    alerta("Erro ao excluir pedido!", "erro");
    return;
  }

  alerta("Pedido removido!", "sucesso");
  carregarPedidos();
};

/* =====================================================================
   LIMPAR FORMULÁRIO
===================================================================== */
function limparFormulario() {
  editandoId = null;
  document.getElementById("formPedido").reset();
}

/* =====================================================================
   BUSCA (search bar)
===================================================================== */
document.getElementById("buscarPedido")?.addEventListener("keyup", () => {
  const termo = document.getElementById("buscarPedido").value.toLowerCase();

  const filtrados = listaPedidos.filter((p) => {
    const cliente = p.clientes?.razao_social?.toLowerCase() ?? "";
    const status = p.status?.toLowerCase() ?? "";
    return (
      cliente.includes(termo) ||
      status.includes(termo) ||
      String(p.id).includes(termo)
    );
  });

  const tbody = document.getElementById("tabelaPedidos");
  tbody.innerHTML = "";

  filtrados.forEach(p => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.clientes?.razao_social ?? "-"}</td>
      <td>${p.data_pedido}</td>
      <td>${p.status}</td>
      <td>
        <span class="action-btn" onclick="editarPedido(${p.id})">Editar</span>
        <span class="action-btn" onclick="excluirPedido(${p.id})">Excluir</span>
      </td>
    `;

    tbody.appendChild(tr);
  });
});

/* =====================================================================
   INICIALIZAR
===================================================================== */
carregarClientes();
carregarPedidos();
