import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;

/* ========================================
      MÁSCARA CPF / CNPJ
======================================== */
export function mascararCpfCnpj(input) {
  let v = input.value.replace(/\D/g, "");

  if (v.length <= 11) {
    // CPF 000.000.000-00
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ 00.000.000/0000-00
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  }

  input.value = v;
}

/* ========================================
      AO ABRIR A PÁGINA
======================================== */
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();

  document.getElementById("formCliente").addEventListener("submit", (e) => {
    e.preventDefault();
    salvarCliente();
  });

  document.getElementById("btnCancelar").addEventListener("click", () => {
    limparFormulario();
  });
});

/* ========================================
      SALVAR CLIENTE
======================================== */
async function salvarCliente() {
  const razao_social = document.getElementById("razao_social").value;
  const cpf_cnpj = document.getElementById("cpf_cnpj").value.replace(/\D/g, "");
  const telefone = document.getElementById("telefone").value;
  const email = document.getElementById("email").value;
  const endereco = document.getElementById("endereco").value;

  if (!razao_social || !cpf_cnpj) {
    alert("Preencha Razão Social e CPF/CNPJ!");
    return;
  }

  let dados = {
    razao_social,
    cpf_cnpj,
    telefone,
    email,
    endereco
  };

  let resultado;

  if (editandoId) {
    resultado = await supabase
      .from("clientes")
      .update(dados)
      .eq("id", editandoId);
  } else {
    resultado = await supabase
      .from("clientes")
      .insert(dados);
  }

  if (resultado.error) {
    alert("Erro ao salvar: " + resultado.error.message);
  } else {
    alert("Salvo com sucesso!");
    limparFormulario();
    carregarClientes();
  }
}

/* ========================================
      LISTAR CLIENTES
======================================== */
async function carregarClientes() {
  const tabela = document.querySelector("#tabelaClientes tbody");
  tabela.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  data.forEach(cli => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${cli.razao_social}</td>
      <td>${formatCpfCnpj(cli.cpf_cnpj)}</td>
      <td>${cli.telefone || ""}</td>
      <td>${cli.email || ""}</td>
      <td>
        <button onclick="editarCliente(${cli.id})">Editar</button>
        <button onclick="excluirCliente(${cli.id})">Excluir</button>
      </td>
    `;

    tabela.appendChild(linha);
  });
}

/* ========================================
      FORMATAR EXIBIÇÃO CPF/CNPJ
======================================== */
function formatCpfCnpj(v) {
  if (!v) return "";

  if (v.length === 11) {
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/* ========================================
      EDITAR
======================================== */
window.editarCliente = async function (id) {
  editandoId = id;

  const { data } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("razao_social").value = data.razao_social;
  document.getElementById("cpf_cnpj").value = formatCpfCnpj(data.cpf_cnpj);
  document.getElementById("telefone").value = data.telefone;
  document.getElementById("email").value = data.email;
  document.getElementById("endereco").value = data.endereco;
};

/* ========================================
      EXCLUIR
======================================== */
window.excluirCliente = async function (id) {
  if (!confirm("Excluir cliente?")) return;

  await supabase.from("clientes").delete().eq("id", id);
  carregarClientes();
};

/* ========================================
      LIMPAR FORM
======================================== */
function limparFormulario() {
  editandoId = null;
  document.getElementById("formCliente").reset();
}
