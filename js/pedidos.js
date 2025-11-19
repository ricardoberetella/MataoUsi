import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================
// Troca de Abas
// ============================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ============================
// Carregar no início
// ============================
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  carregarPedidos();
});

// ============================
// CARREGAR LISTA DE CLIENTES
// ============================
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  if (error) return console.error(error);

  const select = document.getElementById("cliente_id");
  select.innerHTML = "";

  data.forEach(c => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.razao_social;
    select.appendChild(op);
  });
}

// ============================
// SALVAR PEDIDO
// ============================
document.getElementById("formPedido").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("pedidoId").value;

  const pedido = {
    cliente_id: document.getElementById("cliente_id").value,
    numero_pedido: document.getElementById("numero_pedido").value,
    data_pedido: document.getElementById("data_pedido").value,
    data_entrega: document.getElementById("data_entrega").value,
    status: document.getElementById("status").value
  };

  let res;

  if (id) {
    res = await supabase.from("pedidos").update(pedido).eq("id", id);
  } else {
    res = await supabase.from("pedidos").insert(pedido);
  }

  if (res.error) return alert("Erro ao salvar: " + res.error.message);

  limparFormulario();
  carregarPedidos();
  alert("Pedido salvo com sucesso!");
});

// ============================
// LISTAR PEDIDOS
// ============================
async function carregarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, clientes(razao_social)")
    .order("id", { ascending: false });

  if (error) return console.error(error);

  const tabela = document.getElementById("tabelaPedidos");
  tabela.innerHTML = "";

  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.numero_pedido}</td>
      <td>${p.clientes?.razao_social || ""}</td>
      <td>${p.data_pedido}</td>
      <td>${p.data_entrega || ""}</td>
      <td>${p.status}</td>
      <td>
        <span class="action-btn" onclick="editarPedido(${p.id})">Editar</span>
        <span class="action-btn" onclick="excluirPedido(${p.id})">Excluir</span>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

// ============================
// EDITAR PEDIDO
// ============================
window.editarPedido = async function (id) {
  const { data } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("pedidoId").value = data.id;
  document.getElementById("cliente_id").value = data.cliente_id;
  document.getElementById("numero_pedido").value = data.numero_pedido;
  document.getElementById("data_pedido").value = data.data_pedido;
  document.getElementById("data_entrega").value = data.data_entrega;
  document.getElementById("status").value = data.status;

  document.querySelector('.tab[data-tab="cadastro"]').click();
};

// ============================
// EXCLUIR PEDIDO
// ============================
window.excluirPedido = async function (id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  await supabase.from("pedidos").delete().eq("id", id);
  carregarPedidos();
};

// ============================
// LIMPAR FORMULÁRIO
// ============================
function limparFormulario() {
  document.getElementById("pedidoId").value = "";
  document.getElementById("formPedido").reset();
}

document.getElementById("btnCancelar").addEventListener("click", limparFormulario);
