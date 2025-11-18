import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function carregarProdutos() {
    const buscar = document.getElementById("buscar").value.trim();

    let query = supabase.from("produtos").select("*").order("descricao");

    if (buscar !== "") {
        query = query.ilike("descricao", `%${buscar}%`);
    }

    const { data, error } = await query;

    if (error) {
        alert("Erro ao carregar produtos: " + error.message);
        return;
    }

    const tbody = document.getElementById("lista-produtos");
    tbody.innerHTML = "";

    data.forEach(prod => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${prod.codigo}</td>
            <td>${prod.descricao}</td>
            <td>${prod.unidade}</td>
            <td>${prod.peso?.toFixed(3)}</td>
            <td>${prod.preco_venda?.toFixed(2)}</td>
            <td>${prod.acabamento}</td>
            <td>${prod.comprimento}</td>

            <td>
                <button onclick="editarProduto('${prod.id}')">Editar</button>
                <button class="btn-red" onclick="excluirProduto('${prod.id}')">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

window.editarProduto = (id) => {
    window.location.href = `produtos_editar.html?id=${id}`;
};

window.excluirProduto = async (id) => {
    if (!confirm("❗ Deseja excluir este produto?")) return;

    const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
    } else {
        alert("Produto excluído!");
        carregarProdutos();
    }
};

// Buscar automaticamente ao digitar
document.getElementById("buscar").addEventListener("input", carregarProdutos);

// Carregar lista ao abrir página
carregarProdutos();
