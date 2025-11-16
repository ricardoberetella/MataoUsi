import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarProdutosMov();
  document.getElementById("btnSalvarMov").addEventListener("click", salvarMovimentacao);
});

async function carregarProdutosMov() {
  const select = document.getElementById("mov-produto");

  const { data } = await supabase.from("produtos").select("*").order("nome", { ascending: true });

  select.innerHTML = "";

  data.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.sku} - ${p.nome}</option>`;
  });
}

async function salvarMovimentacao() {
  const mov = {
    produto_id: document.getElementById("mov-produto").value,
    tipo: document.getElementById("mov-tipo").value,
    quantidade: Number(document.getElementById("mov-qtd").value),
    motivo: document.getElementById("mov-motivo").value,
    referencia_id: document.getElementById("mov-ref").value,
  };

  const { error } = await supabase.from("movimentacoes").insert([mov]);

  if (error) {
    alert("Erro ao salvar movimentação!");
    return;
  }

  // atualizar estoque automaticamente
  const operador = mov.tipo === "entrada" ? +1 : -1;

  await supabase.rpc("atualizar_estoque", {
    p_produto: mov.produto_id,
    p_qtd: mov.quantidade * operador
  });

  alert("Movimentação salva!");
}
