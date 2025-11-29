import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {

    carregarProdutos();

    document.getElementById("btnFiltrar")
        .addEventListener("click", filtrarPedidos);

    document.getElementById("btnImprimir")
        .addEventListener("click", () => window.print());

    document.getElementById("dataGerada")
        .textContent = new Date().toLocaleString("pt-BR");
});


async function carregarProdutos() {
    const select = document.getElementById("produtoSelect");
    select.innerHTML = "<option>Carregando...</option>";

    const { data } = await supabase
        .from("produtos")
        .select("*")
        .order("descricao");

    select.innerHTML = "";
    data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.codigo} — ${p.descricao}`;
        select.appendChild(opt);
    });
}


async function filtrarPedidos() {
    const produtoID = document.getElementById("produtoSelect").value;
    const tbody = document.querySelector("#tabelaResultados tbody");

    tbody.innerHTML = "";
    document.getElementById("totalGeral").textContent = "";

    const { data } = await supabase
        .from("pedidos_itens")
        .select(`
            quantidade,
            data_entrega,
            produtos(codigo),
            pedidos(numero_pedido, clientes(razao_social))
        `)
        .eq("produto_id", produtoID)
        .order("data_entrega");

    if (!data || data.length === 0) return;

    document.getElementById("clienteNome").textContent =
        data[0].pedidos.clientes.razao_social;

    let soma = 0;

    data.forEach(item => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${item.pedidos.numero_pedido}</td>
            <td>${formatarData(item.data_entrega)}</td>
            <td>${item.produtos.codigo}</td>
            <td>${formatarNumero(item.quantidade)}</td>
        `;

        soma += Number(item.quantidade);
        tbody.appendChild(tr);
    });

    document.getElementById("totalGeral").textContent =
        formatarNumero(soma);
}


function formatarData(d) {
    const p = d.split("-");
    return `${p[2]}/${p[1]}/${p[0]}`;
}

function formatarNumero(n) {
    return Number(n).toLocaleString("pt-BR", {
        minimumFractionDigits: 3
    });
}
