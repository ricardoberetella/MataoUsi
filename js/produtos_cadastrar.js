import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("formProduto").addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigo = document.getElementById("codigo").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const unidade = document.getElementById("unidade").value.trim();
    const peso = parseFloat(document.getElementById("peso").value);
    const preco_custo = parseFloat(document.getElementById("preco_custo").value);
    const preco_venda = parseFloat(document.getElementById("preco_venda").value);
    const acabamento = document.getElementById("acabamento").value.trim();
    const comprimento = parseFloat(document.getElementById("comprimento").value);

    const { data, error } = await supabase.from("produtos").insert([
        {
            codigo,
            descricao,
            unidade,
            peso,
            preco_custo,
            preco_venda,
            acabamento,
            comprimento,
        }
    ]);

    if (error) {
        alert("Erro ao cadastrar: " + error.message);
        return;
    }

    alert("Produto cadastrado com sucesso!");
    window.location.href = "produtos.html";
});
