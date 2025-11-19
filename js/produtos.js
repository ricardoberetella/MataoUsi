import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let produtoEditandoId = null;

// Converter string BR para número
function parseDecimalBR(val) {
  if (!val) return null;
  return parseFloat(val.replace(/\./g, "").replace(",", "."));
}

// Formatar número BR
function formatDecimal(val, casas = 2) {
  if (val == null) return "";
  return Number(val).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();

  document.getElementById("formProduto").addEventListener("submit", async (e) => {
    e.preventDefault();
    salvarProduto();
  });

  document.getElementById("btnCancelar").addEventListener("click", () => {
    limparFormulario();
  });
});

// ---------------------------------------------------------
// CARREGAR LISTAGEM
// ---------------------------------------------------------
async function carregarProdutos() {
  const tabela = document.getElementById("listaProdutos");
  tabela.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    tabela.innerHTML = "<tr><td colspan='6'>Erro ao carregar</td></tr>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    tabela.innerHTML = "<tr><td colspan='6'>Nenhum produto encontrado.</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.sku}</td>
      <td>${p.nome}</td>
      <td>${p.unidade}</td>
      <td>R$ ${formatDecimal(p.preco_venda)}</td>
      <td>
        <button onclick="editarProduto(${p.id})">Editar</button>
        <button onclick="excluirProduto(${p.id})">Excluir</button>
      </td>
    `;

    tabela.appendChild(tr);
  });
}

window.editarProduto = async function (id) {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar produto");
    return;
  }

  produtoEditandoId = id;

  document.getElementById("sku").value = data.sku;
  document.getElementById("nome").value = data.nome;
  document.getElementById("descricao").value = data.descricao || "";
  document.getElementById("unidade").value = data.unidade || "";
  document.getElementById("preco_custo").value = formatDecimal(data.preco_custo);
  document.getElementById("preco_venda").value = formatDecimal(data.preco_venda);

  document.getElementById("btnSalvar").textContent = "Salvar Alterações";
  document.getElementById("btnCancelar").style.display = "inline-block";
};

window.excluirProduto = async function (id) {
  if (!confirm("Deseja excluir este produto?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    alert("Erro ao excluir");
    return;
  }

  carregarProdutos();
};

async function salvarProduto() {
  const dados = {
    sku: document.getElementById("sku").value,
    nome: document.getElementById("nome").value,
    descricao: document.getElementById("descricao").value,
    unidade: document.getElementById("unidade").value,
    preco_custo: parseDecimalBR(document.getElementById("preco_custo").value),
    preco_venda: parseDecimalBR(document.getElementById("preco_venda").value),
  };

  if (produtoEditandoId) {
    const { error } = await supabase
      .from("produtos")
      .update(dados)
      .eq("id", produtoEditandoId);

    if (error) {
      alert("Erro ao salvar alterações");
      return;
    }
  } else {
    const { error } = await supabase.from("produtos").insert(dados);

    if (error) {
      alert("Erro ao criar produto");
      return;
    }
  }

  limparFormulario();
  carregarProdutos();
}

function limparFormulario() {
  produtoEditandoId = null;

  document.getElementById("formProduto").reset();
  document.getElementById("btnSalvar").textContent = "Cadastrar Produto";
  document.getElementById("btnCancelar").style.display = "none";
}
