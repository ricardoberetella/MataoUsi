import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// TROCA DE ABAS
// =========================================================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// =========================================================
// CARREGAR PRODUTOS
// =========================================================
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) return console.error(error);

  const select = document.getElementById("produto_id");
  select.innerHTML = "";

  data.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.codigo} - ${p.descricao}`;
    select.appendChild(option);
  });
}

// =========================================================
// LISTAR MOVIMENTAÇÕES
// =========================================================
async function carregarMovimentacoes() {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*, produtos(codigo, descricao)")
    .order("id", { ascending: false });

  if (error) return console.error(error);

  const tabela = document.getElementById("tabelaMov");
  tabela.innerHTML = "";

  data.forEach(m => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${m.produtos.codigo} - ${m.produtos.descricao}</td>
      <td>${m.tipo}</td>
      <td>${m.quantidade}</td>
      <td>${m.motivo || ""}</td>
      <td>${m.referencia_id || ""}</td>
      <td>${new Date(m.criado_em).toLocaleString("pt-BR")}</td>
    `;

    tabela.appendChild(tr);
  });
}

// =========================================================
// SALVAR MOVIMENTAÇÃO
// =========================================================
document.getElementById("formMov").addEventListener("submit", async (e) => {
  e.preventDefault();

  const dados = {
    produto_id: document.getElementById("produto_id").value,
    tipo: document.getElementById("tipo").value,
    quantidade: Number(document.getElementById("quantidade").value),
    motivo: document.getElementById("motivo").value,
    referencia_id: document.getElementById("referencia_id").value,
  };

  const { error } = await supabase.from("movimentacoes").insert(dados);

  if (error) return alert("Erro ao salvar: " + error.message);

  alert("Movimentação registrada com sucesso!");
  limparFormulario();
  carregarMovimentacoes();
});

// =========================================================
// LIMPAR FORM
// =========================================================
function limparFormulario() {
  document.getElementById("formMov").reset();
}

document.getElementById("btnCancelar").addEventListener("click", limparFormulario);

// =========================================================
// BUSCA
// =========================================================
document.getElementById("busca").addEventListener("input", () => {
  const termo = document.getElementById("busca").value.toLowerCase();
  const linhas = document.querySelectorAll("#tabelaMov tr");

  linhas.forEach(linha => {
    const texto = linha.textContent.toLowerCase();
    linha.style.display = texto.includes(termo) ? "" : "none";
  });
});

// =========================================================
// INICIALIZAÇÃO
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
  carregarMovimentacoes();
});
