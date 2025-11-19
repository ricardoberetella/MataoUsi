import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;

// Conversores
function parseNumero(val) {
  if (!val || val.trim() === "") return null;
  return Number(val.replace(",", "."));
}

function formatNumero(val) {
  if (val == null) return "";
  return Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();

  document.getElementById("formProduto").addEventListener("submit", (e) => {
    e.preventDefault();
    salvarProduto();
  });

  document.getElementById("btnCancelar").addEventListener("click", () => {
    limparFormulario();
  });
});

async function carregarProdutos() {
  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = "<tr><td colspan='10'>Carregando...</td></tr>";

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error(error);
    lista.innerHTML = "<tr><td colspan='10'>Erro ao carregar</td></tr>";
    return;
  }

  if (!data || data.length === 0) {
    lista.innerHTML = "<tr><td colspan='10'>Nenhum produto encontrado</td></tr>";
    return;
  }

  lista.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>${p.unidade}</td>
      <td>${p.comprimento_mm ?? ""}</td>
      <td>${p.acabamento ?? ""}</td>
      <td>${formatNumero(p.peso_bruto)}</td>
      <td>${formatNumero(p.peso_liquido)}</td>
      <td>${formatNumero(p.preco_custo)}</td>
      <td>${formatNumero(p.preco_venda)}</td>
      <td>
        <button onclick="editarProduto('${p.id}')">Editar</button>
        <button onclick="excluirProduto('${p.id}')">Excluir</button>
      </td>
    `;
    lista.appendChild(tr);
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

  editandoId = id;

  document.getElementById("codigo").value = data.codigo;
  document.getElementById("descricao").value = data.descricao;
  document.getElementById("unidade").value = data.unidade;
  document.getElementById("comprimento_mm").value = data.comprimento_mm ?? "";
  document.getElementById("acabamento").value = data.acabamento ?? "";
  document.getElementById("peso_bruto").value = formatNumero(data.peso_bruto);
  document.getElementById("peso_liquido").value = formatNumero(data.peso_liquido);
  document.getElementById("preco_custo").value = formatNumero(data.preco_custo);
  document.getElementById("preco_venda").value = formatNumero(data.preco_venda);

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
    codigo: document.getElementById("codigo").value,
    descricao: document.getElementById("descricao").value,
    unidade: document.getElementById("unidade").value,
    comprimento_mm: parseNumero(document.getElementById("comprimento_mm").value),
    acabamento: document.getElementById("acabamento").value,
    peso_bruto: parseNumero(document.getElementById("peso_bruto").value),
    peso_liquido: parseNumero(document.getElementById("peso_liquido").value),
    preco_custo: parseNumero(document.getElementById("preco_custo").value),
    preco_venda: parseNumero(document.getElementById("preco_venda").value),
  };

  if (editandoId) {
    await supabase.from("produtos").update(dados).eq("id", editandoId);
  } else {
    await supabase.from("produtos").insert(dados);
  }

  limparFormulario();
  carregarProdutos();
}

function limparFormulario() {
  editandoId = null;
  document.getElementById("formProduto").reset();
  document.getElementById("btnSalvar").textContent = "Cadastrar Produto";
  document.getElementById("btnCancelar").style.display = "none";
}
