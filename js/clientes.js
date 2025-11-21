import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
});

/* ============================================
   LISTAR CLIENTES
============================================ */
async function carregarClientes() {
  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "<p style='color:#00eaff;'>Carregando...</p>";

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("razao_social", { ascending: true });

  if (error) {
    lista.innerHTML = "<p style='color:red;'>Erro ao carregar clientes.</p>";
    console.error(error);
    return;
  }

  lista.innerHTML = "";

  data.forEach(cliente => {
    const item = document.createElement("div");
    item.classList.add("item-cliente");

    const cnpjFormatado = formataCNPJ(cliente.cpf_cnpj);
    const telefoneFormatado = formataTelefone(cliente.telefone);

    item.innerHTML = `
      <strong>${cliente.razao_social}</strong><br>
      <span>CNPJ: ${cnpjFormatado || "-"}</span><br>
      <span>Telefone: ${telefoneFormatado || "-"}</span>
    `;

    item.addEventListener("click", () => abrirDetalhes(cliente));

    lista.appendChild(item);
  });
}

/* ============================================
   EXIBIR DETALHES
============================================ */
function abrirDetalhes(cliente) {
  const det = document.getElementById("detalhesCliente");
  det.classList.remove("hidden");

  const cnpjFormatado = formataCNPJ(cliente.cpf_cnpj);
  const telefoneFormatado = formataTelefone(cliente.telefone);

  det.innerHTML = `
    <h2 style="color:#00eaff;">${cliente.razao_social}</h2>

    <p><strong>CNPJ:</strong> ${cnpjFormatado || "-"}</p>
    <p><strong>Telefone:</strong> ${telefoneFormatado || "-"}</p>
    <p><strong>Email:</strong> ${cliente.email || "-"}</p>
    <p><strong>Endereço:</strong> ${cliente.endereco || "-"}</p>

    <button class="btn-editar" onclick="editarCliente(${cliente.id})">Editar</button>
    <button class="btn-excluir" onclick="excluirCliente(${cliente.id})">Excluir</button>
  `;
}

/* ============================================
   EDITAR CLIENTE
============================================ */
window.editarCliente = function (id) {
  window.location.href = `clientes_editar.html?id=${id}`;
};

/* ============================================
   EXCLUIR CLIENTE
============================================ */
window.excluirCliente = async function (id) {
  if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir cliente.");
    console.error(error);
    return;
  }

  alert("Cliente excluído!");
  carregarClientes();
  document.getElementById("detalhesCliente").classList.add("hidden");
};

/* ============================================
   FORMATADORES
============================================ */
function formataCNPJ(cnpj) {
  if (!cnpj) return "";
  const c = cnpj.replace(/\D/g, "");
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formataTelefone(tel) {
  if (!tel) return "";
  const t = tel.replace(/\D/g, "");
  return t.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");
}
