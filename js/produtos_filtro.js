import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    carregarProdutos();

    // DATA/HORA (TELA e IMPRESSÃO)
    const agora = new Date().toLocaleString("pt-BR");
    document.getElementById("dataGeradaPrint").textContent = agora;

    document.getElementById("btnFiltrar").addEventListener("click", filtrar);
    document.getElementById("btnImprimir").addEventListener("click", () => window.print());
});

/* =====================================
   CARREGAR PRODUTOS + OPÇÃO "TODOS"
===================================== */
async function carregarProdutos() {
    const select = document.getElementById("produtoSelect");

    const { data } = await supabase
        .from("produtos")
        .select("*")
        .order("descricao");

    select.innerHTML = "";

    // 🔵 OPÇÃO TODOS
    select.innerHTML = `<option value="todos">Todos</option>`;

    data.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.codigo} — ${p.descricao}</option>`;
    });
}

/* =====================================
   FILTRAR
===================================== */
async function filtrar() {
    const produtoID = document.getElementById("produtoSelect").value;
    const tbody = document.querySelector("#tabelaResultados tbody");
    tbody.innerHTML = "";

    // Nome para impressão
    document.getElementById("nomeProdutoPrint").textContent =
        produtoID === "todos"
            ? "Todos os Produtos"
            : document.getElementById("produtoSelect").selectedOptions[0].textContent;

    let query = supabase.from("produtos").select("*").order("descricao");

    if (produtoID !== "todos") query.eq("id", produtoID);

    const { data } = await query;

    data.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.codigo}</td>
                <td>${p.descricao}</td>
                <td>${format1(p.comprimento_mm)}</td>
                <td>${format3(p.peso_liquido)}</td>
                <td>${format3(p.peso_bruto)}</td>
                <td>${format2(p.valor_unitario)}</td>
                <td>${p.acabamento}</td>
            </tr>
        `;
    });
}

/* Formatadores */
function format1(v) { return Number(v).toFixed(1).replace(".", ","); }
function format3(v) { return Number(v).toFixed(3).replace(".", ","); }
function format2(v) { return "R$ " + Number(v).toFixed(2).replace(".", ","); }
