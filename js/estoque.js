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
// Carregar estoque ao abrir
// ============================
document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
  carregarEstoque();
});

// ============================
// Listar produtos no select
// ============================
async function carregarProdutos() {
  const { data } = await supabase.from("produtos").select("id, descricao, codigo").order("descricao");

  const select = document.getElementById("produto_id");
  select.innerHTML = "";

  data.forEach(p => {
    const op = document.createElement("option");
    op.value = p.id;
    op.textContent = `${p.codigo} - ${p.descricao}`;
    select.appendChild(op);
  });
}

// ============================
// Listar Estoque
// ============================
async function carregarEstoque() {
  const { data, error } = await supabase
    .from("estoque")
    .select("*, produtos(codigo, descricao)")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const tabela = document.getElementById("tabelaEstoque");
  tabela.innerHTML = "";

  data.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.produtos?.codigo ?? "-"}</td>
      <td>${e.produtos?.descricao ?? "-"}</td>
      <td>${e.quantidade ?? 0}</td>
      <td>${e.local ?? "-"}</td>
      <td>
        <span class="action-btn" onclick="editarEstoque(${e.id})">Editar</span>
        <span class="action-btn" onclick="excluirEstoque(${e.id})">Excluir</span>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

// ============================
// SALVAR
// ============================
document.getElementById("formEstoque").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("estoqueId").value;
  const dados = {
    produto_id: document.getElementById("produto_id").value,
    quantidade: Number(document.getElementById("quantidade").value),
    local: document.getElementById("local").value
  };

  let result;

  if (id) {
    result = await supabase.from("estoque").update(dados).eq("id", id);
  } else {
    result = await supabase.from("estoque").insert(dados);
  }

  if (result.error) {
    alert("Erro: " + result.error.message);
    return;
  }

  alert("Salvo com sucesso!");
  limparFormulario();
  carregarEstoque();
});

// ============================
// EDITAR
// ============================
window.editarEstoque = async function (id) {
  const { data } = await supabase.from("estoque").select("*").eq("id", id).single();

  document.getElementById("estoqueId").value = data.id;
  document.getElementById("produto_id").value = data.produto_id;
  document.getElementById("quantidade").value = data.quantidade;
  document.getElementById("local").value = data.local;

  document.querySelector('.tab[data-tab="cadastro"]').click();
};

// ============================
// EXCLUIR
// ============================
window.excluirEstoque = async function (id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;
  await supabase.from("estoque").delete().eq("id", id);
  carregarEstoque();
};

// ============================
// LIMPAR
// ============================
function limparFormulario() {
  document.getElementById("estoqueId").value = "";
  document.getElementById("formEstoque").reset();
}
