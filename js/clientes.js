import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editandoId = null;

/* ---------------- TABS ---------------- */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

/* --------------- INICIAR --------------- */
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
});

/* --------------- SALVAR --------------- */
document.getElementById("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("clienteId").value;

  const cliente = {
    razao_social: document.getElementById("razao_social").value.trim(),
    nome_fantasia: document.getElementById("nome_fantasia").value.trim(),
    cpf_cnpj: document.getElementById("cpf_cnpj").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    email: document.getElementById("email").value.trim(),
    endereco: document.getElementById("endereco").value.trim()
  };

  // Impedir duplicação
  if (!id) {
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

  let result = id
    ? await supabase.from("clientes").update(cliente).eq("id", id)
    : await supabase.from("clientes").insert([cliente]);

  if (result.error) {
    alert("Erro ao salvar: " + result.error.message);
    return;
  }

  alert("Salvo com sucesso!");
  limparFormulario();
  carregarClientes();
});

/* --------------- LISTAR --------------- */
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

/* --------------- EDITAR --------------- */
window.editarCliente = async function (id) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar cliente!");
    return;
  }

  editandoId = id;

  document.getElementById("clienteId").value = data.id;
  document.getElementById("razao_social").value = data.razao_social;
  document.getElementById("nome_fantasia").value = data.nome_fantasia;
  document.getElementById("cpf_cnpj").value = data.cpf_cnpj;
  document.getElementById("telefone").value = data.telefone;
  document.getElementById("email").value = data.email;
  document.getElementById("endereco").value = data.endereco;

  document.querySelector('.tab[data-tab="cadastro"]').click();
};

/* --------------- EXCLUIR --------------- */
window.excluirCliente = async function (id) {
  if (!confirm("Excluir cliente?")) return;

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir: " + error.message);
    return;
  }

  alert("Excluído!");
  carregarClientes();
};

/* --------------- LIMPAR --------------- */
function limparFormulario() {
  document.getElementById("formCliente").reset();
  document.getElementById("clienteId").value = "";
}

document.getElementById("btnCancelar").addEventListener("click", limparFormulario);
