import { supabase } from "./supabase.js";

/* BOTÃO SALVAR PRODUTO */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#produtos .btn-primary");

  if (btn) {
    btn.addEventListener("click", async () => {
      const sku = document.getElementById("produto-sku").value;
      const nome = document.getElementById("produto-nome").value;
      const desc = document.getElementById("produto-desc").value;
      const unidade = document.getElementById("produto-unidade").value;
      const custo = document.getElementById("produto-custo").value;
      const venda = document.getElementById("produto-venda").value;

      if (!sku || !nome) {
        alert("Preencha ao menos o SKU e o Nome do produto.");
        return;
      }

      const { data, error } = await supabase
        .from("produtos")
        .insert([
          {
            sku,
            nome,
            descricao: desc,
            unidade,
            preco_custo: custo ? Number(custo) : null,
            preco_venda: venda ? Number(venda) : null,
          }
        ]);

      if (error) {
        alert("Erro ao salvar: " + error.message);
      } else {
        alert("Produto cadastrado com sucesso!");
        carregarProdutos();
      }
    });
  }

  carregarProdutos();
});

/* LISTAR PRODUTOS */
async function carregarProdutos() {
  const tabela = document.querySelector("#produtos tbody");
  tabela.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados.</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  produtos.forEach(prod => {
    tabela.innerHTML += `
      <tr>
        <td>${prod.sku}</td>
        <td>${prod.nome}</td>
        <td>${prod.unidade || ""}</td>
        <td>${prod.preco_custo || "-"}</td>
        <td>${prod.preco_venda || "-"}</td>
      </tr>
    `;
  });
}
