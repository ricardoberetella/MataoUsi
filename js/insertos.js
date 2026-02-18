import * as auth from "./auth.js";

const supabase = auth.supabase;
const verificarLogin = typeof auth.verificarLogin === "function" ? auth.verificarLogin : null;

let ROLE_ATUAL = "viewer"; // padrão seguro

document.addEventListener("DOMContentLoaded", async () => {
  // garante que não fica preso como viewer por cache/exec anterior
  document.body.classList.remove("role-viewer");

  ROLE_ATUAL = await descobrirRole();
  aplicarPermissaoNoLayout();

  // LISTA
  if (document.getElementById("corpoTabelaInsertos")) {
    carregarInsertos();
  }

  // NOVO CADASTRO (viewer não pode)
  const btnSalvar = document.getElementById("btnSalvarInserto");
  if (btnSalvar) {
    if (ROLE_ATUAL === "viewer") {
      btnSalvar.style.display = "none";
    } else {
      btnSalvar.addEventListener("click", salvarNovoInserto);
    }
  }

  // Delegação de eventos (só admin)
  const tbody = document.getElementById("corpoTabelaInsertos");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-acao]");
      if (!btn) return;

      const acao = btn.dataset.acao;
      const id = btn.dataset.id;
      const descricao = btn.dataset.descricao || "";

      if (!id) return;

      // ✅ bloqueio total para viewer
      if (ROLE_ATUAL === "viewer") {
        alert("Visualizador não tem permissão para alterar estoque.");
        return;
      }

      if (acao === "editar") window.editarInserto(id);
      if (acao === "entrada") window.abrirModal(id, "entrada", descricao);
      if (acao === "saida") window.abrirModal(id, "saida", descricao);
      if (acao === "excluir") window.excluirInserto(id);
    });
  }
});

// =========================
// ROLE (MUITO MAIS FORTE)
// =========================
async function descobrirRole() {
  // 1) variáveis globais
  try {
    if (window.roleUsuario) return normalizarRole(window.roleUsuario);
    if (window.tipoUsuario) return normalizarRole(window.tipoUsuario);
  } catch (_) {}

  // 2) chaves comuns
  const storageKeys = [
    "roleUsuario", "tipoUsuario", "userRole", "role", "tipo", "perfil",
    "perfilUsuario", "usuario_role", "usuario", "usuarioLogado", "user", "auth",
    "session", "login", "currentUser"
  ];

  for (const k of storageKeys) {
    const vLS = safeGet(localStorage, k);
    const roleLS = extrairRoleDeQualquerCoisa(vLS);
    if (roleLS) return roleLS;

    const vSS = safeGet(sessionStorage, k);
    const roleSS = extrairRoleDeQualquerCoisa(vSS);
    if (roleSS) return roleSS;
  }

  // 3) varrer TODO localStorage/sessionStorage (pega JSON escondido em qualquer chave)
  const roleVarreduraLS = varrerStorage(localStorage);
  if (roleVarreduraLS) return roleVarreduraLS;

  const roleVarreduraSS = varrerStorage(sessionStorage);
  if (roleVarreduraSS) return roleVarreduraSS;

  // 4) verificarLogin (se existir)
  try {
    if (verificarLogin) {
      const u = await verificarLogin();
      const role = u?.role || u?.tipo || u?.perfil ||
        u?.user_metadata?.role || u?.user_metadata?.tipo || u?.user_metadata?.perfil;
      const r = extrairRoleDeQualquerCoisa(role);
      if (r) return r;
    }
  } catch (_) {}

  // 5) supabase metadata
  try {
    const { data } = await supabase.auth.getUser();
    const role =
      data?.user?.user_metadata?.role ||
      data?.user?.user_metadata?.tipo ||
      data?.user?.user_metadata?.perfil ||
      data?.user?.app_metadata?.role;

    const r = extrairRoleDeQualquerCoisa(role);
    if (r) return r;
  } catch (_) {}

  // fallback seguro
  return "viewer";
}

function safeGet(storage, key) {
  try { return storage.getItem(key); } catch (_) { return null; }
}

function varrerStorage(storage) {
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      const v = storage.getItem(k);

      // procura no nome da chave também
      const rk = extrairRoleDeQualquerCoisa(k);
      if (rk) return rk;

      const rv = extrairRoleDeQualquerCoisa(v);
      if (rv) return rv;
    }
  } catch (_) {}
  return null;
}

function extrairRoleDeQualquerCoisa(valor) {
  if (!valor) return null;

  // se já vier como role simples
  const direto = normalizarRole(valor);
  if (direto) return direto;

  // se vier JSON
  const txt = String(valor);

  // tenta JSON.parse
  if (txt.trim().startsWith("{") || txt.trim().startsWith("[")) {
    try {
      const obj = JSON.parse(txt);
      const possiveis = [
        obj?.role, obj?.tipo, obj?.perfil,
        obj?.user?.role, obj?.user?.tipo, obj?.user?.perfil,
        obj?.user_metadata?.role, obj?.user_metadata?.tipo, obj?.user_metadata?.perfil,
        obj?.app_metadata?.role,
        obj?.data?.role, obj?.data?.tipo, obj?.data?.perfil
      ];

      for (const p of possiveis) {
        const r = normalizarRole(p);
        if (r) return r;
      }
    } catch (_) {}
  }

  // procura por substring em qualquer texto (pega JSON/string)
  const lower = txt.toLowerCase();
  if (lower.includes("admin")) return "admin";
  if (lower.includes("viewer") || lower.includes("visualizador") || lower.includes("visual")) return "viewer";
  if (lower.includes("operador") || lower.includes("oper")) return "operador";

  return null;
}

function normalizarRole(role) {
  if (!role) return null;
  const r = String(role).toLowerCase().trim();

  if (r === "admin" || r.includes("admin")) return "admin";
  if (r === "viewer" || r.includes("viewer") || r.includes("visual")) return "viewer";
  if (r.includes("oper")) return "operador";

  return null;
}

function aplicarPermissaoNoLayout() {
  if (ROLE_ATUAL === "viewer") document.body.classList.add("role-viewer");
  else document.body.classList.remove("role-viewer");
}

// =========================
// Helpers
// =========================
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toInt(value) {
  const n = parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : NaN;
}

// =========================
// LISTAGEM
// =========================
async function carregarInsertos() {
  const tbody = document.getElementById("corpoTabelaInsertos");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4">Carregando...</td></tr>`;

  try {
    const { data, error } = await supabase
      .from("insertos")
      .select("id, descricao, marca, quantidade")
      .order("descricao", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">Nenhum inserto cadastrado.</td></tr>`;
      return;
    }

    const isViewer = ROLE_ATUAL === "viewer";

    tbody.innerHTML = data.map((ins) => {
      const descricao = escapeHtml(ins.descricao);
      const marca = escapeHtml(ins.marca || "-");
      const qtd = Number(ins.quantidade ?? 0);
      const qtdClass = qtd <= 2 ? "qtd-baixa" : "";

      const acoesHtml = isViewer
        ? `<td class="col-acoes" style="text-align:center;">—</td>`
        : `
          <td class="col-acoes" style="text-align:center;">
            <button class="btn-tabela btn-editar" data-acao="editar" data-id="${ins.id}">✏ Editar</button>
            <button class="btn-tabela btn-entrada" data-acao="entrada" data-id="${ins.id}" data-descricao="${descricao}">↑ Entrada</button>
            <button class="btn-tabela btn-saida" data-acao="saida" data-id="${ins.id}" data-descricao="${descricao}">↓ Saída</button>
            <button class="btn-tabela btn-excluir" data-acao="excluir" data-id="${ins.id}">Excluir</button>
          </td>
        `;

      return `
        <tr>
          <td style="font-weight:bold;">${descricao}</td>
          <td>${marca}</td>
          <td><span class="badge-qtd ${qtdClass}">${qtd}</span></td>
          ${acoesHtml}
        </tr>
      `;
    }).join("");

    aplicarPermissaoNoLayout();
  } catch (err) {
    console.error("Erro ao carregar:", err?.message || err);
    tbody.innerHTML = `<tr><td colspan="4">Erro ao carregar insertos.</td></tr>`;
  }
}

// =========================
// NOVO CADASTRO (admin)
// =========================
async function salvarNovoInserto() {
  if (ROLE_ATUAL === "viewer") return alert("Visualizador não tem permissão.");

  const descricao = String(document.getElementById("ins_descricao")?.value || "").trim();
  const marca = String(document.getElementById("ins_marca")?.value || "").trim();
  const qtdRaw = toInt(document.getElementById("ins_quantidade")?.value);

  const quantidade = Number.isFinite(qtdRaw) ? qtdRaw : 0;

  if (!descricao) return alert("A descrição é obrigatória!");
  if (quantidade < 0) return alert("Quantidade não pode ser negativa.");

  try {
    const { error } = await supabase
      .from("insertos")
      .insert([{ descricao, marca: marca || null, quantidade }]);

    if (error) throw error;

    alert("Inserto cadastrado!");
    window.location.href = "insertos_lista.html";
  } catch (err) {
    alert("Erro: " + (err?.message || "Falha ao salvar."));
  }
}

// =========================
// MODAL (admin)
// =========================
window.abrirModal = (id, tipo, descricao) => {
  if (ROLE_ATUAL === "viewer") return alert("Visualizador não tem permissão.");

  const modal = document.getElementById("modalMovimentacao");
  if (!modal) return alert("Modal não encontrado (id=modalMovimentacao).");

  document.getElementById("modalId").value = id;
  document.getElementById("modalTipo").value = tipo;

  const desc = String(descricao || "").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
  document.getElementById("modalTitulo").innerText =
    tipo === "entrada" ? `Entrada: ${desc}` : `Saída: ${desc}`;

  const movQtd = document.getElementById("mov_qtd");
  if (movQtd) movQtd.value = "1";

  modal.style.display = "flex";
};

window.fecharModalMov = () => {
  const modal = document.getElementById("modalMovimentacao");
  if (modal) modal.style.display = "none";
};

window.confirmarMovimento = async () => {
  if (ROLE_ATUAL === "viewer") return alert("Visualizador não tem permissão.");

  const id = document.getElementById("modalId")?.value;
  const tipo = document.getElementById("modalTipo")?.value;
  const qtdMov = toInt(document.getElementById("mov_qtd")?.value);

  if (!id) return alert("ID inválido.");
  if (tipo !== "entrada" && tipo !== "saida") return alert("Tipo inválido.");
  if (!Number.isFinite(qtdMov) || qtdMov <= 0) return alert("Quantidade inválida.");

  try {
    const { data: ins, error: e1 } = await supabase
      .from("insertos")
      .select("quantidade")
      .eq("id", id)
      .single();

    if (e1) throw e1;

    const atual = Number(ins?.quantidade ?? 0);
    const novaQtd = tipo === "entrada" ? atual + qtdMov : atual - qtdMov;
    if (novaQtd < 0) return alert("Estoque insuficiente!");

    const { error: e2 } = await supabase
      .from("insertos")
      .update({ quantidade: novaQtd })
      .eq("id", id);
    if (e2) throw e2;

    const { error: e3 } = await supabase.from("insertos_movimentacoes").insert([{
      inserto_id: id,
      tipo,
      quantidade: qtdMov,
      data: new Date().toISOString(),
      observacao: null
    }]);
    if (e3) throw e3;

    window.fecharModalMov();
    await carregarInsertos();
  } catch (err) {
    console.error(err);
    alert("Erro na movimentação: " + (err?.message || "Falha."));
  }
};

// =========================
// EXCLUIR / EDITAR (admin)
// =========================
window.excluirInserto = async (id) => {
  if (ROLE_ATUAL === "viewer") return alert("Visualizador não tem permissão.");
  if (!confirm("Excluir inserto?")) return;

  try {
    const { error } = await supabase.from("insertos").delete().eq("id", id);
    if (error) throw error;
    await carregarInsertos();
  } catch (err) {
    alert("Erro ao excluir: " + (err?.message || "Falha."));
  }
};

window.editarInserto = (id) => {
  if (ROLE_ATUAL === "viewer") return alert("Visualizador não tem permissão.");
  window.location.href = `insertos_editar.html?id=${encodeURIComponent(id)}`;
};
