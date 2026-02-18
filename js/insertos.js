import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // LISTA
  if (document.getElementById("corpoTabelaInsertos")) {
    carregarInsertos();
  }

  // NOVO CADASTRO
  const btnSalvar = document.getElementById("btnSalvarInserto");
  if (btnSalvar) btnSalvar.addEventListener("click", salvarNovoInserto);

  // Delegação de eventos na tabela
  const tbody = document.getElementById("corpoTabelaInsertos");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-acao]");
      if (!btn) return;

      const acao = btn.dataset.acao;
      const id = btn.dataset.id;
      const descricao = btn.dataset.descricao || "";

      if (!id) return;

      if (acao === "editar") window.editarInserto(id);
      if (acao === "entrada") window.abrirModal(id, "entrada", descricao);
      if (acao === "saida") window.abrirModal(id, "saida", descricao);
      if (acao === "excluir") window.excluirInserto(id);
    });
  }
});

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

    tbody.innerHTML = data
      .map((ins) => {
        const descricao = escapeHtml(ins.descricao);
        const marca = escapeHtml(ins.marca || "-");
        const qtd = Number(ins.quantidade ?? 0);
        const qtdClass = qtd <= 2 ? "qtd-baixa" : "";

        return `
          <tr>
            <td style="font-weight: bold;">${descricao}</td>
            <td>${marca}</td>
            <td><span class="badge-qtd ${qtdClass}">${qtd}</span></td>
            <td style="text-align: center;">
              <!-- ✅ NOVO: EDITAR -->
              <button class="btn-tabela btn-editar"
                      data-acao="editar"
                      data-id="${ins.id}">✏ Editar</button>

              <button class="btn-tabela btn-entrada"
                      data-acao="entrada"
                      data-id="${ins.id}"
                      data-descricao="${descricao}">↑ Entrada</button>

              <button class="btn-tabela btn-saida"
                      data-acao="saida"
                      data-id="${ins.id}"
                      data-descricao="${descricao}">↓ Saída</button>

              <button class="btn-tabela btn-excluir"
                      data-acao="excluir"
                      data-id="${ins.id}">Excluir</button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Erro ao carregar:", err?.message || err);
    tbody.innerHTML = `<tr><td colspan="4">Erro ao carregar insertos.</td></tr>`;
  }
}

// =========================
// NOVO CADASTRO
// =========================
async function salvarNovoInserto() {
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
// MODAL
// =========================
window.abrirModal = (id, tipo, descricao) => {
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

    const { error: e3 } = await supabase.from("insertos_movimentacoes").insert([
      {
        inserto_id: id,
        tipo,
        quantidade: qtdMov,
        data: new Date().toISOString(),
        observacao: null,
      },
    ]);

    if (e3) throw e3;

    window.fecharModalMov();
    await carregarInsertos();
  } catch (err) {
    console.error(err);
    alert("Erro na movimentação: " + (err?.message || "Falha."));
  }
};

// =========================
// EXCLUIR
// =========================
window.excluirInserto = async (id) => {
  if (!confirm("Excluir inserto?")) return;

  try {
    const { error } = await supabase.from("insertos").delete().eq("id", id);
    if (error) throw error;
    await carregarInsertos();
  } catch (err) {
    alert("Erro ao excluir: " + (err?.message || "Falha."));
  }
};

// =========================
// ✅ NOVO: EDITAR
// =========================
window.editarInserto = (id) => {
  window.location.href = `insertos_editar.html?id=${encodeURIComponent(id)}`;
};
