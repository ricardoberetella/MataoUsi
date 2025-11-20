import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;
let listaOriginal = [];     // <- AQUI! Lista oficial
let listaClientes = [];     // <- lista filtrada
let paginaAtual = 1;
const itensPorPagina = 20;

/* ==========================
      TOAST FUTURISTA
========================== */
function toast(msg, tipo = "info") {
  const div = document.createElement("div");
  div.className = `toast toast-${tipo}`;
  div.innerText = msg;

  document.getElementById("toastContainer").appendChild(div);

  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 300);
  }, 2500);
}

/* ==========================
      MÁSCARA CPF/CNPJ
========================== */
export function mascararCpfCnpj(input) {
  let v = input.value.replace(/\D/g, "");

  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, "$1.$2")
         .replace(/(\d{3})(\d)/, "$1.$2")
         .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    v = v.replace(/^(\d{2})(\d)/, "$1.$2")
         .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
         .replace(/\.(\d{3})(\d)/, ".$1/$2")
         .replace(/(\d{4})(\d)/, "$1-$2");
  }

  input.value = v;
}

/* ==========================
      AO CARREGAR
========================== */
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();

  document.getElementById("btnAnterior").onclick = () => mudarPagina(-1);
  document.getElementById("btnProximo").onclick = () => mudarPagina(1);

  document.getElementById("formCliente").onsubmit = (e) => {
    e.preventDefault();
    salvarCliente();
  };

  document.getElementById("btnCancelar").onclick = () => limparFormulario();
});

/* ==========================
      SALVAR
========================== */
async function salvarCliente() {
  const razao_social = document.getElementById("razao_social").value;
  const cpf_cnpj = document.getElementById("cpf_cnpj").value.replace(/\D/g, "");
  const telefone = document.getElementById("telefone").value;
  const email = document.getElementById("email").value;
  const endereco = document.getElementById("endereco").value;

  if (!razao_social || !cpf_cnpj) {
    toast("Preencha Razão Social e CPF/CNPJ!", "error");
    return;
  }

  const dados = { razao_social, cpf_cnpj, telefone, email, endereco };

  let r;
  if (editandoId) {
    r = await supabase.from("clientes").update(dados).eq("id", editandoId);
  } else {
    r = await supabase.from("clientes").insert(dados);
  }

  if (r.error) {
    toast("Erro: " + r.error.message, "error");
  } else {
    toast("Cliente salvo!", "success");
    limparFormulario();
    carregarClientes();
  }
}

/* ==========================
      CARREGAR CLIENTES
========================== */
async function carregarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    toast("Erro ao carregar!", "error");
    return;
  }

  listaOriginal = data;   // <-- Lista oficial
  listaClientes = [...listaOriginal]; // <-- Cópia filtrada

  paginaAtual = 1;
  renderLista();
}

/* ==========================
      RENDERIZAR LISTA
========================== */
function renderLista() {
  const tabela = document.querySelector("#tabelaClientes tbody");
  tabela.innerHTML = "";

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const pagina = listaClientes.slice(inicio, fim);

  pagina.forEach(cli => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${cli.razao_social}</td>
      <td>${formatCpfCnpj(cli.cpf_cnpj)}</td>
      <td>${cli.telefone || ""}</td>
      <td>${cli.email || ""}</td>
      <td>
        <button onclick="editarCliente(${cli.id})">Editar</button>
        <button onclick="excluirCliente(${cli.id})">Excluir</button>
      </td>
    `;

    tabela.appendChild(tr);
  });

  document.getElementById("paginacaoInfo").innerText =
    `Página ${paginaAtual} de ${Math.ceil(listaClientes.length / itensPorPagina)}`;
}

/* ==========================
      BUSCA (SEM DUPLICAR)
========================== */
window.filtrarClientes = function () {
  const termo = document.getElementById("busca").value.toLowerCase();

  listaClientes = listaOriginal.filter(c =>
    c.razao_social.toLowerCase().includes(termo) ||
    formatCpfCnpj(c.cpf_cnpj).includes(termo) ||
    (c.telefone || "").toLowerCase().includes(termo) ||
    (c.email || "").toLowerCase().includes(termo)
  );

  paginaAtual = 1;
  renderLista();
};

/* ==========================
      PAGINAÇÃO
========================== */
function mudarPagina(delta) {
  const total = Math.ceil(listaClientes.length / itensPorPagina);
  paginaAtual += delta;

  if (paginaAtual < 1) paginaAtual = 1;
  if (paginaAtual > total) paginaAtual = total;

  renderLista();
}

/* ==========================
      EDITAR
========================== */
window.editarCliente = async function (id) {
  editandoId = id;

  const { data } = await supabase.from("clientes").select("*").eq("id", id).single();

  document.getElementById("razao_social").value = data.razao_social;
  document.getElementById("cpf_cnpj").value = formatCpfCnpj(data.cpf_cnpj);
  document.getElementById("telefone").value = data.telefone;
  document.getElementById("email").value = data.email;
  document.getElementById("endereco").value = data.endereco;

  toast("Modo edição!", "info");
};

/* ==========================
      EXCLUIR
========================== */
window.excluirCliente = async function (id) {
  if (!confirm("Excluir cliente?")) return;

  await supabase.from("clientes").delete().eq("id", id);
  toast("Cliente excluído!", "success");
  carregarClientes();
};

/* ==========================
      FORMATAR CPF/CNPJ
========================== */
function formatCpfCnpj(v) {
  if (!v) return "";
  if (v.length === 11)
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/* ==========================
      LIMPAR FORM
========================== */
function limparFormulario() {
  editandoId = null;
  document.getElementById("formCliente").reset();
}
