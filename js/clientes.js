import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;

/* ============================================
      TROCA DE ABAS
============================================ */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

/* ============================================
      CARREGAR AO ABRIR
============================================ */
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
});

/* ============================================
      SALVAR CLIENTE
============================================ */
document.getElementById("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const cliente = {
    razao_social: document.getElementById("razao_social").value.trim(),
    nome_fantasia: document.getElementById("nome_fantasia").value.trim(),
    cpf_cnpj: document.getElementById("cpf_cnpj").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    email: document.getElementById("email").value.trim(),
    endereco: document.getElementById("endereco").value.trim()
  };

  if (!cliente.razao_social) {
    alert("Razão Social é obrigatória!");
    return;
  }

  // Verificar duplicado somente quando for novo cadastro
  if (!editandoId) {
    const { data: existe } = await supabase
      .from("clientes")
      .select("id")
      .eq("razao_social", cliente.razao_social)
      .maybeSingle();

    if (existe) {
      alert("Já existe um cliente com essa Razão Social!");
      return;
    }
  }

  let result;

  if (editandoId) {
    result = await supabase.from("clientes").update(cliente).eq("id", editandoId);
  } else {
    result = await supabase.from("clientes").insert([cliente]);
  }

  if (result.error) {
    alert("Erro ao salvar: " + result.error.message);
    return;
  }

  alert(editandoId ? "Cliente atualizado!" : "Cliente cadastrado!");
  limparFormulario();
  carregarClientes();
});

/* ============================================
      LISTAR CLIENTES
============================================ */
async function carregarClientes() {
  const tabela = document.getElementById("tabelaClientes");
  tabela.innerHTML = `<tr><td colspan="7" style="text-align:center;">Carregando...</td></tr>`;

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    tabela.innerHTML = `<tr><td colspan="7">Erro ao carregar clientes!</td></tr>`;
    return;
  }

  tabela.innerHTML = "";

  data.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.razao_social}</td>
      <td>${c.nome_fantasia ?? ""}</td>
      <td>${c.cpf_cnpj ?? ""}</td>
      <td>${c.telefone ?? ""}</td>
      <td>${c.email ?? ""}</td>
      <td>${c.endereco ?? ""}</td>
      <td>
        <button class="btn-editar" onclick="editarCliente(${c.id})">Editar</button>
        <button class="btn-excluir" onclick="excluirCliente(${c.id})">Excluir</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

/* ============================================
      EDITAR CLIENTE
============================================ */
window.editarCliente = async function (id) {
  const { data, error } = await supabase.from("clientes").select("*").eq("id", id).single();

  if (error || !data) {
    alert("Erro ao carregar cliente!");
    return;
  }

  editandoId = id;

  document.getElementById("clienteId").value = id;
  document.getElementById("razao_social").value = data.razao_social;
  document.getElementById("nome_fantasia").value = data.nome_fantasia;
  document.getElementById("cpf_cnpj").value = data.cpf_cnpj;
  document.getElementById("telefone").value = data.telefone;
  document.getElementById("email").value = data.email;
  document.getElementById("endereco").value = data.endereco;

  document.querySelector('.tab[data-tab="cadastro"]').click();
};

/* ============================================
      EXCLUIR CLIENTE
============================================ */
window.excluirCliente = async function (id) {
  if (!confirm("Deseja realmente excluir?")) return;

  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    alert("Erro ao excluir: " + error.message);
    return;
  }

  alert("Cliente excluído!");
  carregarClientes();
};

/* ============================================
      LIMPAR FORMULÁRIO
============================================ */
function limparFormulario() {
  editandoId = null;
  document.getElementById("clienteId").value = "";
  document.getElementById("formCliente").reset();
}

document.getElementById("btnCancelar").addEventListener("click", limparFormulario);
