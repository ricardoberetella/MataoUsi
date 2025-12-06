import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("btnBuscar").addEventListener("click", buscar);

async function buscar() {
    const termo = document.getElementById("campoBusca").value.trim();

    let query = supabase.from("produtos").select("*");

    if (termo !== "") {
        query = query.or(`codigo.ilike.%${termo}%,descricao.ilike.%${termo}%`);
    }

    const { data, error } = await query.order("codigo");

    if (error) {
        console.error(error);
        alert("Erro ao buscar.");
        return;
    }

    preencherTabela(data);
}

function preencherTabela(lista) {
    const tbody = document.getElementById("listaProdutos");
    tbody.innerHTML = "";

    lista.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.codigo}</td>
            <td>${p.descricao}</td>
            <td>${p.comprimento_mm}</td>
            <td>${p.peso_liquido}</td>
            <td>${p.peso_bruto}</td>
            <td>${p.valor_unitario}</td>
            <td>${p.acabamento}</td>
        `;
        tbody.appendChild(tr);
    });
}
