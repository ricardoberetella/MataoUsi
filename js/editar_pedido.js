// ===============================================
// EDITAR PEDIDO – VERSÃO FINAL CORRIGIDA
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let role = "viewer";
let pedidoId = null;
let itens = [];
let listaProdutos = [];

/* ===============================================
      INICIAR
=============================================== */
document.addEventListener("DOMContentLoaded", async () => {

    const user = await verificarLogin();
    if (!user) return;

    role = user.user_metadata?.role || "viewer";

    pedidoId = obterIdURL();

    if (!pedidoId) {
        alert("Pedido não encontrado!");
        window.location.href = "pedidos_lista.html";
        return;
    }

    // Verificar se item voltou da edição
    const itemEditado = localStorage.getItem("itemEditado");

    if (itemEditado) {
        const item = JSON.parse(itemEditado);

        // Substitui o item correto
        const idx = itens.findIndex(i => i.id === item.id);
        if (idx !== -1) itens[idx] = item;

        localStorage.removeItem("itemEditado");
    }

    await carregarClientes();
    await carregarProdutos();
    await carregarPedido();
    atualizarTabela();
});

/* PEGAR ID DA URL */
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

    const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, descricao, valor_unitario")
        .order("codigo");

    if (!error) listaProdutos = data;
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
    document.getElementById("data_pedido").value = pedido.data_pedido;
    document.getElementById("numero_pedido").value = pedido.numero_pedido;

    const { data: itensBD } = await supabase
        .from("pedidos_itens")
        .select("id, produto_id, quantidade, valor_unitario, data_entrega, produtos(codigo, descricao)")
        .eq("pedido_id", pedidoId);

    itens = itensBD.map(i => ({
        id: i.id,
        produto_id: i.produto_id,
        codigo: i.produtos?.codigo,
        descricao: i.produtos?.descricao,
        quantidade: Number(i.quantidade),
        valor_unitario: Number(i.valor_unitario),
        data_entrega: i.data_entrega
    }));
}

/* ===============================================
      FORMATADORES
=============================================== */
function formatarValor(v) {
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function formatarData(d) {
    if (!d) return "";
    const [a, m, dia] = d.split("-");
    return `${dia}/${m}/${a}`;
}

/* ===============================================
      ATUALIZAR TABELA DE ITENS
=============================================== */
function atualizarTabela() {
    const tbody = document.getElementById("tabelaItens");
    tbody.innerHTML = "";

    let total = 0;

    itens.forEach((item, index) => {
        const valor = Number(item.valor_unitario);
        const qtd = Number(item.quantidade);

        total += qtd * valor;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.descricao}</td>
            <td>${qtd}</td>
            <td>${formatarValor(valor)}</td>
            <td>${formatarData(item.data_entrega)}</td>
            <td>
                <button class="btn-azul" onclick="editarItem(${index})">Editar</button>
                <button class="btn-vermelho" onclick="excluirItem(${index})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById("total").textContent = formatarValor(total);
}

/* EXCLUIR ITEM */
window.excluirItem = (index) => {
    itens.splice(index, 1);
    atualizarTabela();
};

/* EDITAR ITEM */
window.editarItem = (index) => {

    const item = itens[index];

    localStorage.setItem("itemParaEditar", JSON.stringify(item));

    window.location.href = `item_editar.html?pedido=${pedidoId}&item=${item.id}`;
};

/* ===============================================
      SALVAR ALTERAÇÕES
=============================================== */
window.salvarAlteracoes = async () => {

    const cliente_id = document.getElementById("cliente").value;
    const data_pedido = document.getElementById("data_pedido").value;
    const numero_pedido = document.getElementById("numero_pedido").value;

    const total = itens.reduce(
        (acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario)),
        0
    );

    // Atualiza pedido
    await supabase.from("pedidos").update({
        cliente_id,
        data_pedido,
        numero_pedido,
        total
    }).eq("id", pedidoId);

    // Apaga todos os itens antigos
    await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoId);

    // Reinsere itens atualizados
    for (const item of itens) {
        await supabase.from("pedidos_itens").insert([{
            pedido_id: pedidoId,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            data_entrega: item.data_entrega
        }]);
    }

    alert("Alterações salvas!");
    window.location.href = "pedidos_lista.html";
};
