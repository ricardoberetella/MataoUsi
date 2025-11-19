import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editandoId = null;

/* ===========================
   Conversão BR → Número
=========================== */
function toNumber(valor) {
  if (!valor || valor.trim() === "") return null;

  // Remove pontos de milhar
  valor = valor.replace(/\./g, "");

  // Troca vírgula por ponto
  valor = valor.replace(",", ".");

  return Number(valor);
}

/* ===========================
   Alertas
=========================== */
function alerta(msg, tipo = "info") {
  const box = document.createElement("div");
  box.className = "alert " + tipo;
  box.innerText = msg;

  document.body.appendChild(box);

  setTimeout(() => box.classList.add("show"), 50);

  setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.remove(), 300);
  }, 3000);
}

/* ===========================
   Loading no botão
=========================== */
function setLoading(btn, estado) {
  btn.disabled = estado;
  btn.innerHTML = estado ? "⏳ Salvando..." : "Salvar";
}

/* ===========================
   Carregar lista de produtos
=========================== */
async function carregarProdutos() {
  const tbody = document.getElementById("listaProdutos");

  tbody.innerHTML = `
    <tr><td colspan="10" style="text-align:center;">Carregando...</td></tr>
  `;

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    alerta("Erro ao carregar produtos!", "erro");
    console.error(error);
    return;
  }

  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.codigo ?? ""}</td>
      <td>${p.descricao ?? ""}</td>
      <td>${p.unidade ?? ""}</td>
      <td>${p.comprimento_mm ?? ""}</td>
      <td>${p.acabamento ?? ""}</td>
      <td>${p.peso_bruto ?? ""}</td>
      <td>${p.peso_liquido ?? ""}</td>
      <td>${p.preco_custo ?? ""}</td>
      <td>${p.preco_venda ?? ""}</td>
      <td>
        <button class="btn-editar" onclick="editarProduto(${p.id})">Editar</button>
        <button class="btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ===========================
   Salvar (Cadastrar ou Editar)
=========================== */
document.getElementById("formProduto").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("btnSalvar");
  setLoading(btn, true);

  const produto = {
    codigo: document.getElementById("codigo").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    unidade: document.getElementById("unidade").value.trim(),
    comprimento_mm: toNumber(document.getElementById("comprimento_mm").value),
    acabamento: document.getElementById("acabamento").value,
    peso_bruto: toNumber(document.getElementById("peso_bruto").value),
    peso_liquido: toNumber(document.getElementById("peso_liquido").value),
    preco_custo: toNumber(document.getElementById("preco_custo").value),
    preco_venda: toNumber(document.getElementById("preco_venda").value),
  };

  if (!produto.descricao) {
    alerta("A descrição é obrigatória!", "erro");
    setLoading(btn, false);
    return;
  }

  let resposta;

  if (editandoId) {
    resposta = await supabase
      .from("produtos")
      .update(produto)
      .eq("id", editandoId);
  } else {
    resposta = await supabase.from("produtos").insert([produto]);
  }

  const { error } = resposta;

  setLoading(btn, false);

  if (error) {
    alerta("Erro ao salvar produto!", "erro");
    console.error(error);
    return;
  }

  alerta(editandoId ? "Produto atualizado!" : "Produto cadastrado!", "sucesso");

  limparFormulario();
  carregarProdutos();
});

/* ===========================
   Editar produto
=========================== */
window.editarProduto = async function (id) {
  editandoId = id;

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alerta("Erro ao carregar produto!", "erro");
    console.error(error);
    return;
  }

  document.getElementById("codigo").value = data.codigo ?? "";
  document.getElementById("descricao").value = data.descricao ?? "";
  document.getElementById("unidade").value = data.unidade ?? "";
  document.getElementById("comprimento_mm").value = data.comprimento_mm ?? "";
  document.getElementById("acabamento").value = data.acabamento ?? "";
  document.getElementById("peso_bruto").value = data.peso_bruto ?? "";
  document.getElementById("peso_liquido").value = data.peso_liquido ?? "";
  document.getElementById("preco_custo").value = data.preco_custo ?? "";
  document.getElementById("preco_venda").value = data.preco_venda ?? "";

  document.getElementById("btnCancelar").style.display = "inline-block";

  alerta("Editando produto...", "info");
};

/* ===========================
   Cancelar
=========================== */
document.getElementById("btnCancelar").addEventListener("click", () => {
  limparFormulario();
  alerta("Edição cancelada", "info");
});

/* ===========================
   Excluir
=========================== */
window.excluirProduto = async function (id) {
  if (!confirm("Excluir este produto?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    alerta("Erro ao excluir produto!", "erro");
    console.error(error);
    return;
  }

  alerta("Produto removido!", "sucesso");
  carregarProdutos();
};

/* ===========================
   Limpar formulário
=========================== */
function limparFormulario() {
  document.getElementById("formProduto").reset();
  editandoId = null;
  document.getElementById("btnCancelar").style.display = "none";
}

/* ===========================
   Inicializar
=========================== */
carregarProdutos();
