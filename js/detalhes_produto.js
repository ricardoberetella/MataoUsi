import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (!id) {
  alert("ID do produto não informado.");
  window.location.href = "produtos.html";
}

const titulo = document.getElementById("tituloProduto");
const detalhes = document.getElementById("detalhesProduto");

/* FORMATADOR */
function formatarNumero(val) {
  if (val == null) return "0,000";
  return Number(val).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

/* CARREGAR PRODUTO */
async function carregarProduto() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    alert("Erro ao carregar produto.");
    window.location.href = "produtos.html";
    return;
  }

  titulo.textContent = `${data.codigo} — ${data.descricao}`;

  detalhes.innerHTML = `
    <p><strong>Código:</strong> ${data.codigo}</p>
    <p><strong>Descrição:</strong> ${data.descricao}</p>
    <p><strong>Unidade:</strong> ${data.unidade}</p>
    <p><strong>Comprimento (mm):</strong> ${data.comprimento_mm ?? ""}</p>
    <p><strong>Peso Líquido:</strong> ${formatarNumero(data.peso_liquido)}</p>
    <p><strong>Peso Bruto:</strong> ${formatarNumero(data.peso_bruto)}</p>
    <p><strong>Acabamento:</strong> ${data.acabamento ?? ""}</p>
  `;
}

/* EDITAR */
document.getElementById("btnEditar").addEventListener("click", () => {
  window.location.href = `produtos.html?editar=${id}`;
});

/* EXCLUIR */
document.getElementById("btnExcluir").addEventListener("click", async () => {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao excluir produto.");
    return;
  }

  alert("Produto excluído com sucesso!");
  window.location.href = "produtos.html";
});

/* INICIAR */
carregarProduto();
