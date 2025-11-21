import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaCompleta = [];

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  document.getElementById("campoBusca").addEventListener("input", filtrarLista);
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

  listaCompleta = data;
  exibirLista(data);
}

/* ============================================
   EXIBIR LISTA
============================================ */
function exibirLista(clientes) {
  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "";

  clientes.forEach(cliente => {
    const item = document.createElement("div");
    item.classList.add("item-cliente");

    const cnpjFormatado = formataCNPJ(cliente.cpf_cnpj);
    const telFormatado = formataTelefone(cliente.telefone);

    item.innerHTML = `
      <div class="item-info">
        <span class="icone-cliente">⚡</span>
        <strong>${cliente.razao_social}</strong> —
        CNPJ: ${cnpjFormatado} —
        Tel: ${telFormatado}
      </div>

      <button class="btn-abrir" onclick="abrir(${cliente.id})">
        Abrir →
      </button>
    `;

    lista.appendChild(item);
  });
}

/* ============================================
   BUSCAR NOME / CNPJ
============================================ */
function filtrarLista() {
  const termo = document.getElementById("campoBusca").value.toLowerCase();

  const filtrado = listaCompleta.filter(c =>
    c.razao_social.toLowerCase().includes(termo) ||
    c.cpf_cnpj.includes(termo.replace(/\D/g, ""))
  );

  exibirLista(filtrado);
}

/* ============================================
   ABRIR DETALHES
============================================ */
window.abrir = function (id) {
  const cliente = listaCompleta.find(c => c.id === id);
  abrirDetalhes(cliente);
};

function abrirDetalhes(cliente) {
  const det = document.getElementById("detalhesCliente");
  det.classList.remove("hidden");

  det.innerHTML = `
    <h2 style="color:#00eaff;">${cliente.razao_social}</h2>

    <p><strong>CNPJ:</strong> ${formataCNPJ(cliente.cpf_cnpj)}</p>
    <p><strong>Telefone:</strong> ${formataTelefone(cliente.telefone)}</p>
    <p><strong>Email:</strong> ${cliente.email || "-"}</p>
    <p><strong>Endereço:</strong> ${cliente.endereco || "-"}</p>

    <div style="margin-top:20px; display:flex; gap:14px;">
        <button class="btn-editar" onclick="editarCliente(${cliente.id})">Editar</button>
        <button class="btn-excluir" onclick="excluirCliente(${cliente.id})">Excluir</button>
    </div>
  `;
}

/* ============================================
   EDITAR
============================================ */
window.editarCliente = function (id) {
  window.location.href = `clientes_editar.html?id=${id}`;
};

/* ============================================
   EXCLUIR
============================================ */
window.excluirCliente = async function (id) {
  if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir cliente.");
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

  if (t.length === 10)
    return t.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1)$2-$3");

  if (t.length === 11)
    return t.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");

  return tel;
}
