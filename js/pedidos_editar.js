// ===============================================
// EDITAR PEDIDO – VERSÃO FINAL CORRIGIDA + LOGIN PROTEGIDO
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let role = "viewer";
let pedidoId = null;
let itens = [];
let listaProdutos = [];

/* ===============================================
      INICIAR (AGORA COM PROTEÇÃO TOTAL)
=============================================== */
document.addEventListener("DOMContentLoaded", async () => {

    // 🔐 BLOQUEIA acesso se não estiver logado
    const user = await verificarLogin();
    if (!user) return;

    role = user.user_metadata?.role || "viewer";

    pedidoId = obterIdURL();
    if (!pedidoId) {
        alert("Pedido não encontrado!");
        window.location.href = "pedidos_lista.html";
        return;
    }

    await carregarClientes();
    await carregarProdutos();
    await carregarPedido();
    atualizarTabela();
});

/* ===============================================
      PEGAR ID DA URL
=============================================== */
function obterIdURL() {
    const url = new URL(window.location.href);
    return url.searchParams.get("id");
}

/* ===============================================
      CARREGAR CLIENTES
=============================================== */
async function carregarClientes() {

    const { data, error } = await supabase
        .from("clientes")
        .select("id, razao_social")
        .order("razao_social");

    if (error) return;

    const select = document.getElementById("cliente");
    select.innerHTML = "";

    data.forEach(cli => {
        const opt = document.createElement("option");
        opt.value = cli.id;
        opt.textContent = cli.razao_social;
        select.appendChild(opt);
    });
}

/* ===============================================
      CARREGAR PRODUTOS
=============================================== */
async function carregarProdutos() {
    const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao, valor_unitario")
        .order("codigo");

    listaProdutos = data || [];
}

/* ===============================================
      CARREGAR DADOS DO PEDIDO
=============================================== */
async function carregarPedido() {

    const { data: pedido } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedidoId)
        .single();

    document.getElementById("cliente").value = pedido.cliente_id;
    // input[type=date] precisa YYYY-MM-DD; Supabase pode retornar timestamp
    document.getElementById("data_pedido").value = String(pedido.data_pedido || "").slice(0, 10);
    document.getElementById("numero_pedido").value = pedido.numero_pedido;

    const { data: itensBD } = await supabase
        .from("pedidos_itens")
        .select("id, produto_id, quantidade, valor_unitario, data_entrega, produtos(codigo, descricao)")
        .eq("pedido_id", pedidoId);

    itens = (itensBD || []).map(i => ({
        id: i.id,
        produto_id: i.produto_id,
        codigo: i.produtos?.codigo,
        descricao: i.produtos?.descricao,
        quantidade: Number(i.quantidade),
        valor_unitario: Number(i.valor_unitario),
        // pode vir "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss" -> sempre mantém só a data
        data_entrega: String(i.data_entrega || "").slice(0, 10)
    }));
}

/* ===============================================
      FORMATADORES
=============================================== */
function formatarValor(num) {
    return Number(num).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarData(d) {
    if (!d) return "";
    const s = String(d).split("T")[0];
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    return `${m[3]}/${m[2]}/${m[1]}`;
}

/* ===============================================
      ATUALIZAR TABELA
=============================================== */
function atualizarTabela() {
    const tbody = document.getElementById("tabelaItens");
    tbody.innerHTML = "";

    let total = 0;

    itens.forEach((item, index) => {

        total += item.quantidade * item.valor_unitario;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.descricao}</td>
            <td>${item.quantidade.toLocaleString("pt-BR")}</td>
            <td>${formatarValor(item.valor_unitario)}</td>
            <td>${formatarData(item.data_entrega)}</td>
            <td>
                <button class="btn-azul" onclick="editarItemPedido(${item.id})">Editar</button>
                <button class="btn-vermelho" onclick="excluirItem(${index})">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("total").textContent = formatarValor(total);
}

/* ===============================================
      EDITAR ITEM (CORRIGIDO)
=============================================== */
window.editarItemPedido = (itemId) => {
    window.location.href = `item_editar.html?idPedido=${pedidoId}&idItem=${itemId}`;
};

/* ===============================================
      EXCLUIR ITEM DO ARRAY
=============================================== */
window.excluirItem = (index) => {
    itens.splice(index, 1);
    atualizarTabela();
};

/* ===============================================
      SALVAR ALTERAÇÕES (TOTAL CORRIGIDO)
=============================================== */
window.salvarAlteracoes = async () => {

    const cliente_id = document.getElementById("cliente").value;
    const data_pedido = (document.getElementById("data_pedido").value || "").slice(0, 10);
    const numero_pedido = document.getElementById("numero_pedido").value;

    const total = itens.reduce(
        (acc, item) => acc + (item.quantidade * item.valor_unitario),
        0
    );

    await supabase
        .from("pedidos")
        .update({
            cliente_id,
            data_pedido,
            numero_pedido,
            total
        })
        .eq("id", pedidoId);

    await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoId);

    for (const item of itens) {
        await supabase.from("pedidos_itens").insert({
            pedido_id: pedidoId,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            data_entrega: String(item.data_entrega || "").slice(0, 10)
        });
    }

    alert("Alterações salvas com sucesso!");
    window.location.href = "pedidos_lista.html";
};
