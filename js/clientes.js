import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;

/* ============================
   Troca de Abas
============================ */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

/* ============================
   Carrega clientes ao abrir
============================ */
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
});

/* ============================
   LISTAR CLIENTES
============================ */
async function carregarClientes() {
  const tabela = document.getElementById("tabelaClientes");
  tabela.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    alert("Erro ao carregar clientes!");
    console.error(error);
    return;
  }

  tabela.innerHTML = "";

  data.forEach(c => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${c.razao_social ?? ""}</td>
      <td>${c.nome_fantasia ?? ""}</td>
      <td>${c.cpf_cnpj ?? ""}</td>
      <td>${c.telefone ?? ""}</td>
      <td>${c.email ?? ""}</td>
      <td>
        <button class="btn-editar" onclick="editarCliente(${c.id})">Editar</button>
        <button class="btn-excluir" onclick="excluirCliente(${c.id})">Excluir</button>
      </td>
    `;

    tabela.appendChild(tr);
  });
}

/* ============================
   SALVAR CLIENTE
============================ */
document.getElementById("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const cliente = {
    razao_social: document.getElementById("razao_social").value.trim(),
    nome_fantasia: document.getElementById("nome_fantasia").value.trim(),
    cpf_cnpj: document.getElementById("cpf_cnpj").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    email: document.getElementById("email").value.trim(),
    endereco: document.getElementById("endereco").value.trim(),
  };

  /* =============================
       VERIFICAR DUPLICADO
  ============================== */
  if (!editandoId && cliente.cpf_cnpj.trim() !== "") {
    const { data: existente } = await supabase
      .from("clientes")
      .select("*")
      .eq("cpf_cnpj", cliente.cpf_cnpj)
      .maybeSingle();

    if (existente) {
      alert("⚠ Já existe um cliente com este CPF/CNPJ!");
      return;
    }
  }

  let resultado;

  if (editandoId) {
    resultado = await supabase
      .from("clientes")
      .update(cliente)
      .eq("id", editandoId);
  } else {
    resultado = await supabase
      .from("clientes")
      .insert([cliente]);
  }

  if (resultado.error) {
    alert("Erro ao salvar: " + resultado.error.message);
    return;
  }

  alert(editandoId ? "Cliente atualizado!" : "Cliente cadastrado!");

  limparFormulario();
  carregarClientes();
});

/* ============================
   EDITAR CLIENTE
============================ */
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

  document.getElementById("razao_social").value = data.razao_social ?? "";
  document.getElementById("nome_fantasia").value = data.nome_fantasia ?? "";
  document.getElementById("cpf_cnpj").value = data.cpf_cnpj ?? "";
  document.getElementById("telefone").value = data.telefone ?? "";
  document.getElementById("email").value = data.email ?? "";
  document.getElementById("endereco").value = data.endereco ?? "";

  document.getElementById("btnCancelar").style.display = "inline-block";

  document.querySelector('.tab[data-tab="cadastro"]').click();
};

/* ============================
   EXCLUIR CLIENTE
============================ */
window.excluirCliente = async function (id) {
  if (!confirm("Deseja realmente excluir?")) return;

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir!");
    console.error(error);
    return;
  }

  alert("Cliente excluído!");
  carregarClientes();
};

/* ============================
   LIMPAR FORMULÁRIO
============================ */
function limparFormulario() {
  document.getElementById("formCliente").reset();
  document.getElementById("btnCancelar").style.display = "none";
  editandoId = null;
}
