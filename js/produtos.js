import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editandoId = null;

/* -------------------------------------------------------
   Funções de conversão
------------------------------------------------------- */

// Converte "1,50" → 1.50
function toNumberBR(valor) {
  if (!valor) return 0;
  return Number(String(valor).replace(".", "").replace(",", "."));
}

// Formata número para vírgula
function formatNumero(valor) {
  if (valor == null || valor === "") return "";
  return String(valor).replace(".", ",");
}

// Formata preço em R$
function formatPreco(valor) {
  if (valor == null || valor === "") return "";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* -------------------------------------------------------
   Alertas
------------------------------------------------------- */
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

/* -------------------------------------------------------
   Loading
------------------------------------------------------- */
function setLoading(btn, estado) {
  if (estado) {
    btn.disabled = true;
    btn.innerHTML = "⏳ Salvando...";
  } else {
    btn.disabled = false;
    btn.innerHTML = "Salvar";
  }
}

/* -------------------------------------------------------
   Carregar produtos
------------------------------------------------------- */
async function carregarProdutos() {
  const tbody = document.getElementById("listaProdutos");
  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Carregando...</td></tr>`;

  const { data, error } = await supabase.from("produtos").select("*").order("id", { ascending: false });

  if (error) {
    alerta("Erro ao carregar produtos", "erro");
    return;
  }

  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.codigo || ""}</td>
      <td>${p.descricao || ""}</td>
      <td>${p.unidade || ""}</td>

      <td>${formatNumero(p.comprimento_mm)}</td>
      <td>${p.acabamento || ""}</td>
      <td>${formatNumero(p.peso_bruto)}</td>
      <td>${formatNumero(p.peso_liquido)}</td>

      <td>${formatPreco(p.preco_custo)}</td>
      <td>${formatPreco(p.preco_venda)}</td>

      <td>
        <button class="btn-editar" onclick="editarProduto(${p.id})">Editar</button>
        <button class="btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* -------------------------------------------------------
   Salvar produto
------------------------------------------------------- */
document.getElementById("formProduto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnSalvar");
  setLoading(btn, true);

  const produto = {
    codigo: document.getElementById("codigo").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    unidade: document.getElementById("unidade").value.trim(),

    comprimento_mm: toNumberBR(document.getElementById("comprimento_mm").value.trim()),
    acabamento: document.getElementById("acabamento").value.trim(),

    peso_bruto: toNumberBR(document.getElementById("peso_bruto").value.trim()),
    peso_liquido: toNumberBR(document.getElementById("peso_liquido").value.trim()),

    preco_custo: toNumberBR(document.getElementById("preco_custo").value.trim()),
    preco_venda: toNumberBR(document.getElementById("preco_venda").value.trim()),
  };

  if (!produto.descricao) {
    alerta("Descrição obrigatória!", "erro");
    setLoading(btn, false);
    return;
  }

  let retorno;
  if (editandoId) {
    retorno = await supabase.from("produtos").update(produto).eq("id", editandoId);
  } else {
    retorno = await supabase.from("produtos").insert([produto]);
  }

  const { error } = retorno;
  setLoading(btn, false);

  if (error) {
    console.error(error);
    alerta("Erro ao salvar!", "erro");
    return;
  }

  alerta(editandoId ? "Produto atualizado!" : "Produto cadastrado!", "sucesso");

  limparFormulario();
  carregarProdutos();
});

/* -------------------------------------------------------
   Editar
------------------------------------------------------- */
window.editarProduto = async function (id) {
  editandoId = id;

  const { data } = await supabase.from("produtos").select("*").eq("id", id).single();

  document.getElementById("codigo").value = data.codigo || "";
  document.getElementById("descricao").value = data.descricao || "";
  document.getElementById("unidade").value = data.unidade || "";

  document.getElementById("comprimento_mm").value = formatNumero(data.comprimento_mm);
  document.getElementById("acabamento").value = data.acabamento || "";

  document.getElementById("peso_bruto").value = formatNumero(data.peso_bruto);
  document.getElementById("peso_liquido").value = formatNumero(data.peso_liquido);

  document.getElementById("preco_custo").value = formatNumero(data.preco_custo);
  document.getElementById("preco_venda").value = formatNumero(data.preco_venda);

  document.getElementById("btnCancelar").style.display = "inline-block";

  alerta("Editando produto...", "info");
};

/* -------------------------------------------------------
   Cancelar edição
------------------------------------------------------- */
document.getElementById("btnCancelar").addEventListener("click", () => {
  limparFormulario();
  alerta("Edição cancelada", "info");
});

/* -------------------------------------------------------
   Excluir
------------------------------------------------------- */
window.excluirProduto = async function (id) {
  if (!confirm("Excluir este produto?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    alerta("Erro ao excluir!", "erro");
    return;
  }

  alerta("Produto excluído!", "sucesso");
  carregarProdutos();
};

/* -------------------------------------------------------
   Limpar formulário
------------------------------------------------------- */
function limparFormulario() {
  document.getElementById("formProduto").reset();
  document.getElementById("btnCancelar").style.display = "none";
  editandoId = null;
}

/* -------------------------------------------------------
   Inicializar
------------------------------------------------------- */
carregarProdutos();
