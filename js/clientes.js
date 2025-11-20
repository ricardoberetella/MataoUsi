
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
// Carregar clientes ao abrir
// ============================
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
});

// ============================
// SALVAR CLIENTE
// ============================
document.getElementById("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("clienteId").value;

  const cliente = {
    razao_social: document.getElementById("razao_social").value,
    nome_fantasia: document.getElementById("nome_fantasia").value,
    cpf_cnpj: document.getElementById("cpf_cnpj").value,
    telefone: document.getElementById("telefone").value,
    email: document.getElementById("email").value,
    endereco: document.getElementById("endereco").value
  };

  let result;

  if (id) {
    result = await supabase.from("clientes").update(cliente).eq("id", id);
  } else {
    result = await supabase.from("clientes").insert(cliente);
  }

  if (result.error) {
    alert("Erro ao salvar: " + result.error.message);
    return;
  }

  alert("Cliente salvo com sucesso!");
  limparFormulario();
  carregarClientes();
});

// ============================
// LISTAR CLIENTES
// ============================
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const tabela = document.getElementById("tabelaClientes");
  tabela.innerHTML = "";

  data.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.razao_social}</td>
      <td>${c.nome_fantasia ?? ""}</td>
      <td>${c.cpf_cnpj ?? ""}</td>
      <td>${c.telefone ?? ""}</td>
      <td>
        <span class="action-btn" onclick="editarCliente(${c.id})">Editar</span>
        <span class="action-btn" onclick="excluirCliente(${c.id})">Excluir</span>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

// ============================
// EDITAR CLIENTE
// ============================
window.editarCliente = async function (id) {
  const { data } = await supabase.from("clientes").select("*").eq("id", id).single();

  document.getElementById("clienteId").value = data.id;
  document.getElementById("razao_social").value = data.razao_social;
  document.getElementById("nome_fantasia").value = data.nome_fantasia;
  document.getElementById("cpf_cnpj").value = data.cpf_cnpj;
  document.getElementById("telefone").value = data.telefone;
  document.getElementById("email").value = data.email;
  document.getElementById("endereco").value = data.endereco;

  document.querySelector('.tab[data-tab="cadastro"]').click();
};

// ============================
// EXCLUIR CLIENTE
// ============================
window.excluirCliente = async function (id) {
  if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

  await supabase.from("clientes").delete().eq("id", id);
  carregarClientes();
};

// ============================
// LIMPAR FORMULÁRIO
// ============================
function limparFormulario() {
  document.getElementById("clienteId").value = "";
  document.getElementById("formCliente").reset();
}

document.getElementById("btnCancelar").addEventListener("click", limparFormulario);
