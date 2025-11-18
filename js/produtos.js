import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  
  const btn = document.getElementById("btnCadastrar");
  btn.addEventListener("click", cadastrarProduto);

  carregarProdutos();
});

// Cadastrar Produto
async function cadastrarProduto() {
  const codigo = document.getElementById("codigo").value;
  const descricao = document.getElementById("descricao").value;
  const unidade = document.getElementById("unidade").value;
  const peso = document.getElementById("peso").value;
  const precoCusto = document.getElementById("precoCusto").value;
  const precoVenda = document.getElementById("precoVenda").value;
  const tratamento = document.getElementById("tratamento").value;
  const comprimento = document.getElementById("comprimento").value;

  const { error } = await supabase
    .from("produtos")
    .insert({
      codigo,
      descricao,
      unidade,
      peso,
      preco_custo: precoCusto,
      preco_venda: precoVenda,
      tratamento,
      comprimento
    });

  if (error) {
    alert("Erro ao cadastrar: " + error.message);
  } else {
    alert("Produto cadastrado!");
    carregarProdutos();
  }
}

// Listar produtos
async function carregarProdutos() {
  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  if (error) return;

  data.forEach(p => {
    lista.innerHTML += `
      <tr>
        <td>${p.codigo}</td>
        <td>${p.descricao}</td>
        <td>${p.unidade}</td>
        <td>${p.peso}</td>
        <td>R$ ${p.preco_custo}</td>
        <td>R$ ${p.preco_venda}</td>
        <td>${p.tratamento}</td>
        <td>${p.comprimento}</td>
        <td><button class="deleteBtn" onclick="deletarProduto(${p.id})">Excluir</button></td>
      </tr>
    `;
  });
}

// Excluir produto
window.deletarProduto = async function (id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  await supabase.from("produtos").delete().eq("id", id);

  carregarProdutos();
};
