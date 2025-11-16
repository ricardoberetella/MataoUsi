import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
  document.getElementById("btnSalvarProduto").addEventListener("click", salvarProduto);
});

async function salvarProduto() {
  const produto = {
    sku: document.getElementById("prod-sku").value,
    nome: document.getElementById("prod-nome").value,
    descricao: document.getElementById("prod-desc").value,
    unidade: document.getElementById("prod-unidade").value,
    preco_custo: document.getElementById("prod-custo").value,
    preco_venda: document.getElementById("prod-venda").value,
  };

  const { error } = await supabase.from("produtos").insert([produto]);

  if (error) alert("Erro ao salvar produto!");
  else {
    alert("Produto cadastrado!");
    carregarProdutos();
  }
}

async function carregarProdutos() {
  const tabela = document.querySelector("#tabela-produtos tbody");
  tabela.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";

  const { data } = await supabase.from("produtos").select("*").order("id", { ascending: false });

  tabela.innerHTML = "";

  data.forEach(prod => {
    tabela.innerHTML += `
      <tr>
        <td>${prod.id}</td>
        <td>${prod.sku}</td>
        <td>${prod.nome}</td>
        <td>R$ ${prod.preco_venda}</td>
      </tr>
    `;
  });
}
