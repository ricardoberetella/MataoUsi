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
   ABRIR
============================================ */
window.abrir = function (id) {
  window.location.href = `clientes_editar.html?id=${id}`;
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
