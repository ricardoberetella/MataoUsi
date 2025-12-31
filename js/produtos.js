// ===============================================
// PRODUTOS — VERSÃO FINAL COM AUTH.JS (PROTEGIDO)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let editandoId = null;
let role = "admin";

/* ================================
      VERIFICAR TIPO DE USUÁRIO
================================ */
async function verificarUsuario() {
  const user = await verificarLogin(); // 🔒 Bloqueia quem não está logado
  if (!user) return;

  if (user.user_metadata?.role) {
    role = user.user_metadata.role; // admin ou viewer
  }

  aplicarPermissoes();
}

function aplicarPermissoes() {
  const btnNovo = document.querySelector(".btn-primario");
  const thAcoes = document.querySelector("th.col-acoes");

  if (role !== "admin") {
    if (btnNovo) btnNovo.style.display = "none";
    if (thAcoes) thAcoes.style.display = "none";

    // Remover botões de ação nas linhas
    document.querySelectorAll(".acoes-col").forEach(col => {
      col.style.display = "none";
    });
  }
}

/* ================================
      FORMATADORES
================================ */
function fmt1(v) {
  return Number(v).toFixed(1).replace(".", ",");
}
function fmt3(v) {
  return Number(v).toFixed(3).replace(".", ",");
}
function fmt2(v) {
  return "R$ " + Number(v).toFixed(2).replace(".", ",");
}
function parseBR(v) {
  return Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
}

/* ===========================================
   TELA DE LISTA — LISTAR PRODUTOS
===========================================*/
if (document.getElementById("listaProdutos")) {
  (async () => {
    await verificarUsuario();
    await carregarLista();
  })();
}

async function carregarLista() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo");

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    return;
  }

  const tbody = document.getElementById("listaProdutos");
  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    let html = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>${fmt1(p.comprimento_mm)}</td>
      <td>${fmt3(p.peso_liquido)}</td>
      <td>${fmt3(p.peso_bruto)}</td>
      <td>${fmt2(p.valor_unitario)}</td>
      <td>${p.acabamento}</td>
    `;

    if (role === "admin") {
      html += `
        <td class="acoes-col">
          <a href="produtos_editar.html?id=${p.id}">
            <button class="btn-editar">Editar</button>
          </a>
          <button class="btn-excluir" onclick="excluir(${p.id})">Excluir</button>
        </td>
      `;
    }

    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
}

/* ===========================================
   EXCLUIR PRODUTO
===========================================*/
window.excluir = async (id) => {
  if (role !== "admin") {
    alert("Ação não permitida.");
    return;
  }

  if (!confirm("Excluir produto?")) return;

  await supabase.from("produtos").delete().eq("id", id);
  carregarLista();
};

/* ===========================================
   TELA NOVO PRODUTO
===========================================*/
if (document.getElementById("btnSalvarNovo")) {
  document.getElementById("btnSalvarNovo").onclick = salvarNovo;
}

async function salvarNovo() {
  if (role !== "admin") {
    alert("Ação não permitida.");
    return;
  }

  const produto = coletarDados();
  const resp = await supabase.from("produtos").insert([produto]);

  if (resp.error) {
    alert("Erro ao salvar");
    console.log(resp.error);
    return;
  }

  location.href = "produtos_lista.html";
}

/* ===========================================
   TELA EDITAR PRODUTO
===========================================*/
if (location.search.includes("id=")) {
  (async () => {
    await verificarUsuario();

    if (role !== "admin") {
      alert("Acesso não permitido.");
      location.href = "produtos_lista.html";
      return;
    }

    await carregarProduto();
  })();
}

async function carregarProduto() {
  const id = new URLSearchParams(location.search).get("id");
  editandoId = id;

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar produto.");
    console.error(error);
    return;
  }

  descricao.value = data.descricao;
  codigo.value = data.codigo;
  comprimento.value = fmt1(data.comprimento_mm);
  peso_liquido.value = fmt3(data.peso_liquido);
  peso_bruto.value = fmt3(data.peso_bruto);
  valor_unitario.value = data.valor_unitario.toString().replace(".", ",");
  acabamento.value = data.acabamento;
}

if (document.getElementById("btnSalvarEdicao")) {
  document.getElementById("btnSalvarEdicao").onclick = salvarEdicao;
}

async function salvarEdicao() {
  if (role !== "admin") {
    alert("Ação não permitida.");
    return;
  }

  const produto = coletarDados();

  const resp = await supabase
    .from("produtos")
    .update(produto)
    .eq("id", editandoId);

  if (resp.error) {
    alert("Erro ao salvar alterações");
    console.error(resp.error);
    return;
  }

  location.href = "produtos_lista.html";
}

/* ===========================================
   FUNÇÃO COLETAR FORMULÁRIO
===========================================*/
function coletarDados() {
  return {
    descricao: descricao.value.trim(),
    codigo: codigo.value.trim(),
    comprimento_mm: parseBR(comprimento.value),
    peso_liquido: parseBR(peso_liquido.value),
    peso_bruto: parseBR(peso_bruto.value),
    valor_unitario: parseBR(valor_unitario.value),
    acabamento: acabamento.value,
  };
}
