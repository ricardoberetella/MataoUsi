import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Botão buscar
document.getElementById("btnBuscar").addEventListener("click", buscar);

// Carregar lista completa ao abrir a página
buscar();

/* ==========================================================
   BUSCAR PRODUTOS (POR CÓDIGO OU DESCRIÇÃO)
========================================================== */
async function buscar() {
    const termo = document.getElementById("campoBusca").value.trim();

    let query = supabase.from("produtos").select("*");

    // Se o usuário digitou algo → filtra
    if (termo !== "") {
        query = query.or(
            `codigo.ilike.%${termo}%,descricao.ilike.%${termo}%`
        );
    }

    const { data, error } = await query.order("codigo", { ascending: true });

    if (error) {
        console.error("Erro ao buscar produtos:", error);
        alert("Erro ao buscar produtos.");
        return;
    }

    preencherTabela(data);
}

/* ==========================================================
   PREENCHER TABLEA DE RESULTADOS
========================================================== */
function preencherTabela(lista) {
    const tbody = document.getElementById("listaProdutos");
    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:10px;">
                    Nenhum produto encontrado.
                </td>
            </tr>
        `;
        return;
    }

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
