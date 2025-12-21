import { supabase, verificarLogin } from "./auth.js";

let role = "viewer";        // 🔥 controle de permissões
let editandoId = null;
let listaEstoque = [];
let listaProdutos = [];

/* =====================================================================
   INICIAR + VERIFICAR LOGIN
===================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  role = user.user_metadata?.role || "viewer";

  aplicarPermissoes();
  carregarProdutos();
  carregarEstoque();
});

/* =====================================================================
   PERMISSÕES — BLOQUEIA VIEWER
===================================================================== */
function aplicarPermissoes() {

  if (role !== "admin") {
    // Oculta aba de cadastro
    const abaCadastro = document.querySelector('.tab[data-tab="cadastro"]');
    if (abaCadastro) abaCadastro.style.display = "none";

    // Oculta formulário
    const form = document.getElementById("formEstoque");
    if (form) form.style.display = "none";

    // Oculta ações na tabela
    document.querySelectorAll(".action-btn").forEach(btn => {
      btn.style.display = "none";
    });
  }
}

/* =====================================================================
   ALERTA FUTURISTA
===================================================================== */
function alerta(msg, tipo = "info") {
  const div = document.createElement("div");
  div.className = `alert ${tipo}`;
  div.textContent = msg;

  document.body.appendChild(div);
  setTimeout(() => div.classList.add("show"), 20);

  setTimeout(() => {
    div.classList.remove("show");
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

/* =====================================================================
   TROCA DE ABAS
===================================================================== */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

/* =====================================================================
   CARREGAR PRODUTOS
===================================================================== */
async function carregarProdutos() {

  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao")
    .order("descricao");

  if (error) {
    alerta("Erro ao carregar produtos!", "erro");
    return;
  }

  listaProdutos = data;

  const seletor = document.getElementById("produto_id");
  if (!seletor) return;

  seletor.innerHTML = "";

  listaProdutos.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.codigo} - ${p.descricao}`;
    seletor.appendChild(opt);
  });
}

/* =====================================================================
   CARREGAR ESTOQUE
===================================================================== */
async function carregarEstoque() {

  const { data, error } = await supabase
    .from("estoque")
    .select("*, produtos(codigo, descricao)")
    .order("id", { ascending: false });

  if (error) {
    alerta("Erro ao carregar estoque!", "erro");
    return;
  }

  listaEstoque = data;
  renderTabela();
}

/* =====================================================================
   RENDERIZAR TABELA
===================================================================== */
function renderTabela() {
  const tbody = document.getElementById("tabelaEstoque");
  tbody.innerHTML = "";

  if (listaEstoque.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum item encontrado.</td></tr>`;
    return;
  }

  listaEstoque.forEach(e => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${e.produtos?.codigo ?? "-"}</td>
      <td>${e.produtos?.descricao ?? "-"}</td>
      <td>${e.quantidade}</td>
      <td>${e.local ?? "-"}</td>
      <td>
        ${role === "admin" ? `
          <span class="action-btn" onclick="editarEstoque(${e.id})">Editar</span>
          <span class="action-btn" onclick="excluirEstoque(${e.id})">Excluir</span>
        ` : "-"}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =====================================================================
   SALVAR / ATUALIZAR (somente admin)
===================================================================== */
document.getElementById("formEstoque")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (role !== "admin") {
    alerta("Ação não permitida!", "erro");
    return;
  }

  const dados = {
    produto_id: Number(document.getElementById("produto_id").value),
    quantidade: Number(document.getElementById("quantidade").value),
    local: document.getElementById("local").value.trim()
  };

  let retorno;

  if (editandoId) {
    retorno = await supabase.from("estoque").update(dados).eq("id", editandoId);
  } else {
    retorno = await supabase.from("estoque").insert([dados]);
  }

  if (retorno.error) {
    alerta("Erro ao salvar!", "erro");
    return;
  }

  alerta(editandoId ? "Estoque atualizado!" : "Entrada registrada!", "sucesso");

  limparFormulario();
  carregarEstoque();
});

/* =====================================================================
   EDITAR (somente admin)
===================================================================== */
window.editarEstoque = async function (id) {

  if (role !== "admin") {
    alerta("Ação não permitida!", "erro");
    return;
  }

  const { data, error } = await supabase
    .from("estoque")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alerta("Erro ao carregar item!", "erro");
    return;
  }

  editandoId = id;

  document.getElementById("estoqueId").value = id;
  document.getElementById("produto_id").value = data.produto_id;
  document.getElementById("quantidade").value = data.quantidade;
  document.getElementById("local").value = data.local ?? "";

  document.querySelector('.tab[data-tab="cadastro"]').click();
  alerta("Editando item...", "info");
};

/* =====================================================================
   EXCLUIR (somente admin)
===================================================================== */
window.excluirEstoque = async function (id) {

  if (role !== "admin") {
    alerta("Ação não permitida!", "erro");
    return;
  }

  if (!confirm("Tem certeza que deseja excluir este registro?")) return;

  const { error } = await supabase
    .from("estoque")
    .delete()
    .eq("id", id);

  if (error) {
    alerta("Erro ao excluir!", "erro");
    return;
  }

  alerta("Item removido!", "sucesso");
  carregarEstoque();
};

/* =====================================================================
   LIMPAR FORMULÁRIO
===================================================================== */
function limparFormulario() {
  editandoId = null;
  document.getElementById("formEstoque")?.reset();
}

/* =====================================================================
   BUSCA (search bar)
===================================================================== */
document.getElementById("busca")?.addEventListener("keyup", () => {

  const termo = document.getElementById("busca").value.toLowerCase();

  const filtrados = listaEstoque.filter((e) => {
    const cod = e.produtos?.codigo?.toLowerCase() ?? "";
    const desc = e.produtos?.descricao?.toLowerCase() ?? "";
    const local = e.local?.toLowerCase() ?? "";
    return cod.includes(termo) || desc.includes(termo) || local.includes(termo);
  });

  const tbody = document.getElementById("tabelaEstoque");
  tbody.innerHTML = "";

  filtrados.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.produtos?.codigo ?? "-"}</td>
      <td>${e.produtos?.descricao ?? "-"}</td>
      <td>${e.quantidade}</td>
      <td>${e.local ?? "-"}</td>
      <td>
        ${role === "admin" ? `
        <span class="action-btn" onclick="editarEstoque(${e.id})">Editar</span>
        <span class="action-btn" onclick="excluirEstoque(${e.id})">Excluir</span>` : "-"}
      </td>
    `;
    tbody.appendChild(tr);
  });
});
