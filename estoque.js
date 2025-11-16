import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarListaProdutos();
  carregarEstoque();

  document.getElementById("btnSalvarEstoque").addEventListener("click", salvarEstoque);
});

async function carregarListaProdutos() {
  const select = document.getElementById("est-produto");
  const { data } = await supabase.from("produtos").select("*").order("nome", { ascending: true });

  select.innerHTML = "";

  data.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.sku} - ${p.nome}</option>`;
  });
}

async function salvarEstoque() {
  const produto_id = document.getElementById("est-produto").value;
  const quantidade = Number(document.getElementById("est-quantidade").value);
  const local = document.getElementById("est-local").value;

  const { error } = await supabase.from("estoque").upsert({
    produto_id,
    quantidade,
    local,
    ultima_atualizacao: new Date()
  });

  if (error) alert("Erro ao atualizar o estoque!");
  else {
    alert("Estoque atualizado!");
    carregarEstoque();
  }
}

async function carregarEstoque() {
  const tabela = document.querySelector("#tabela-estoque tbody");
  tabela.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";

  const { data } = await supabase
    .from("estoque")
    .select("*, produtos(nome, sku)");

  tabela.innerHTML = "";

  data.forEach(i => {
    tabela.innerHTML += `
      <tr>
        <td>${i.produtos?.nome}</td>
        <td>${i.produtos?.sku}</td>
        <td>${i.quantidade}</td>
        <td>${i.local}</td>
      </tr>
    `;
  });
}
