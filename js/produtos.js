import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.cadastrarProduto = async function () {
  const codigo = document.getElementById("codigo").value.trim();
  const descricao = document.getElementById("descricao").value.trim();
  const unidade = document.getElementById("unidade").value.trim();
  const peso = document.getElementById("peso").value.trim();
  const preco_custo = document.getElementById("preco_custo").value.trim();
  const preco_venda = document.getElementById("preco_venda").value.trim();
  const acabamento = document.getElementById("acabamento").value.trim();
  const comprimento = document.getElementById("comprimento").value.trim();

  // Validação básica
  if (!codigo || !descricao || !unidade || !preco_custo || !preco_venda) {
    alert("Preencha todos os campos obrigatórios!");
    return;
  }

  const { data, error } = await supabase.from("produtos").insert([
    {
      codigo,
      descricao,
      unidade,
      peso: peso ? Number(peso) : null,
      preco_custo: Number(preco_custo),
      preco_venda: Number(preco_venda),
      acabamento,
      comprimento: comprimento ? Number(comprimento) : null,
      criado_em: new Date().toISOString()
    }
  ]);

  if (error) {
    alert("Erro ao cadastrar: " + error.message);
    console.error(error);
  } else {
    alert("Produto cadastrado com sucesso!");

    // Limpar campos após salvar
    document.getElementById("codigo").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("unidade").value = "";
    document.getElementById("peso").value = "";
    document.getElementById("preco_custo").value = "";
    document.getElementById("preco_venda").value = "";
    document.getElementById("acabamento").value = "Zincado";
    document.getElementById("comprimento").value = "";
  }
};
