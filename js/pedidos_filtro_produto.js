import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {

    // Exibir data e hora
    document.getElementById("dataGerada").textContent =
        new Date().toLocaleString("pt-BR");

    // 🔐 Impedir acesso sem login (proteção principal)
    const user = await verificarLogin();
    if (!user) return;

    await carregarProdutos();

    document.getElementById("btnFiltrar").onclick = filtrarPedidos;
    document.getElementById("btnImprimir").onclick = () => window.print();
});

/* ============================================================
   CARREGAR PRODUTOS
============================================================ */
async function carregarProdutos() {

    await verificarLogin(); // 🔐 proteção extra

    const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao")
        .order("descricao");

    const select = document.getElementById("produtoSelect");
    select.innerHTML = `<option value="">Selecione...</option>`;

    data.forEach(p => {
        const op = document.createElement("option");
        op.value = p.id;
        op.textContent = `${p.codigo} — ${p.descricao}`;
        op.dataset.descricao = p.descricao;
        select.appendChild(op);
    });
}

/* ============================================================
   FORMATADORES E AJUSTE DE DATAS
============================================================ */

// Converte YYYY-MM-DD → Date()
function parseISO(dataISO) {
    if (!dataISO) return null;
    const [ano, mes, dia] = dataISO.split("-");
    return new Date(`${ano}-${mes}-${dia}`);
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatarNumeroBR(n) {
    return Number(n).toLocaleString("pt-BR");
}

/* ============================================================
   FILTRAR PEDIDOS POR PRODUTO
============================================================ */
async function filtrarPedidos() {

    await verificarLogin(); // 🔐 proteção extra

    const produtoId = document.getElementById("produtoSelect").value;
    const produtoNomeEl = document.getElementById("produtoNome");

    if (!produtoId) {
        alert("Selecione um produto.");
        return;
    }

    const produtoTexto = document.querySelector(
        `#produtoSelect option[value="${produtoId}"]`
    ).dataset.descricao;

    // Nome do produto no cabeçalho da impressão
    produtoNomeEl.textContent = produtoTexto;

    const tbody = document.querySelector("#tabelaResultados tbody");
    const totalGeralEl = document.getElementById("totalGeral");

    // 🔐 proteção antes da consulta
    await verificarLogin();

    const { data: itens } = await supabase
        .from("pedidos_itens")
        .select(`
            quantidade,
            data_entrega,
            pedido_id,
            produtos(codigo)
        `)
        .eq("produto_id", produtoId);

    if (!itens?.length) {
        tbody.innerHTML = `<tr><td colspan="4">Nenhum pedido encontrado.</td></tr>`;
        totalGeralEl.textContent = "0";
        return;
    }

    // Ordenar pela data mais antiga → mais nova
    itens.sort((a, b) => {
        const dtA = parseISO(a.data_entrega);
        const dtB = parseISO(b.data_entrega);
        return dtA - dtB;
    });

    // 🔐 proteção antes da segunda consulta
    await verificarLogin();

    const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, numero_pedido");

    tbody.innerHTML = "";
    let total = 0;

    const hoje = new Date();

    itens.forEach(item => {
        const pedido = pedidos.find(p => p.id === item.pedido_id);
        const dataEntrega = parseISO(item.data_entrega);

        // Linha vermelha se estiver atrasado
        const classeAtrasado = dataEntrega < hoje ? "linha-atrasada" : "";

        tbody.innerHTML += `
            <tr class="${classeAtrasado}">
                <td>${pedido?.numero_pedido || ""}</td>
                <td>${formatarDataBR(item.data_entrega)}</td>
                <td>${item.produtos?.codigo || ""}</td>
                <td>${formatarNumeroBR(item.quantidade)}</td>
            </tr>
        `;

        total += Number(item.quantidade);
    });

    totalGeralEl.textContent = formatarNumeroBR(total);
}
