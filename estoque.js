import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarEstoque();
});

/* LISTAR ESTOQUE */
async function carregarEstoque() {
  const tabela = document.querySelector("#estoque tbody");
  tabela.innerHTML = "<tr><td colspan='5'>Carregando estoque...</td></tr>";

  const { data: estoque, error } = await supabase
    .from("estoque")
    .select(`
      id,
      quantidade,
      local,
      ultima_atualizacao,
      produtos (
        sku,
        nome
      )
    `)
    .order("id", { ascending: false });

  if (error) {
    tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar estoque.</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  estoque.forEach(item => {
    tabela.innerHTML += `
      <tr>
        <td>${item.produtos?.nome || "Produto removido"}</td>
        <td>${item.produtos?.sku || "-"}</td>
        <td>${item.quantidade}</td>
        <td>${item.local || "-"}</td>
        <td>${item.ultima_atualizacao ? new Date(item.ultima_atualizacao).toLocaleString() : "-"}</td>
      </tr>
    `;
  });
}
