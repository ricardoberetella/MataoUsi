// ===============================================
//   EDITAR ITEM DO PEDIDO – VERSÃO FINAL CORRIGIDA
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let itemId = null;
let pedidoId = null;
let listaProdutos = [];
let itemAtual = {};

// ===============================================
//   INICIAR
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {

    // 🔐 Proteção de login
    const user = await verificarLogin();
    if (!user) return;

    const url = new URL(window.location.href);

    // ✅ PARÂMETROS CORRETOS
    itemId = url.searchParams.get("idItem");
    pedidoId = url.searchParams.get("idPedido");

    if (!itemId || !pedidoId) {
        alert("Item inválido!");
        window.location.href = "pedidos_lista.html";
        return;
    }

    // Link voltar para pedido
    const voltar = document.getElementById("voltarLink");
    if (voltar) voltar.href = `pedidos_editar.html?id=${pedidoId}`;

    await carregarProdutos();
    await carregarItem();

    document.getElementById("busca_produto").addEventListener("input", filtrarProdutos);
    document.getElementById("btnSalvarItem").addEventListener("click", salvarAlteracoes);
});

// ===============================================
//   CARREGAR PRODUTOS
// ===============================================
async function carregarProdutos() {
    const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, descricao, valor_unitario")
        .order("codigo");

    if (error) {
        alert("Erro ao carregar produtos!");
        return;
    }

    listaProdutos = data;
}

// ===============================================
//   CARREGAR ITEM DO BANCO
// ===============================================
async function carregarItem() {

    const { data, error } = await supabase
        .from("pedidos_itens")
        .select("*, produtos(codigo, descricao, valor_unitario)")
        .eq("id", itemId)
        .single();

    if (error || !data) {
        alert("Item não encontrado!");
        return;
    }

    itemAtual = {
        produto_id: data.produto_id,
        codigo: data.produtos?.codigo ?? "",
        descricao: data.produtos?.descricao ?? "",
        valor_unitario: Number(data.valor_unitario),
        quantidade: Number(data.quantidade),
        data_entrega: data.data_entrega
    };

    // preencher campos da tela
    document.getElementById("busca_produto").value =
        `${itemAtual.codigo} — ${itemAtual.descricao}`;

    document.getElementById("quantidade").value = itemAtual.quantidade;
    document.getElementById("valor_unitario").value = itemAtual.valor_unitario.toString().replace(".", ",");
    document.getElementById("data_entrega").value = itemAtual.data_entrega || "";
}

// ===============================================
//   AUTOCOMPLETE
// ===============================================
function filtrarProdutos() {
    const termo = document.getElementById("busca_produto").value.toLowerCase();
    const lista = document.getElementById("listaProdutos");

    lista.innerHTML = "";

    if (!termo.trim()) {
        lista.style.display = "none";
        return;
    }

    const filtrados = listaProdutos.filter(
        p =>
            p.codigo.toLowerCase().includes(termo) ||
            p.descricao.toLowerCase().includes(termo)
    );

    lista.style.display = "block";

    filtrados.forEach(prod => {
        const div = document.createElement("div");
        div.classList.add("autocomplete-item");
        div.innerHTML = `${prod.codigo} — ${prod.descricao}`;

        div.onclick = () => selecionarProduto(prod);
        lista.appendChild(div);
    });
}

function selecionarProduto(prod) {
    itemAtual.produto_id = prod.id;
    itemAtual.codigo = prod.codigo;
    itemAtual.descricao = prod.descricao;
    itemAtual.valor_unitario = prod.valor_unitario;

    document.getElementById("busca_produto").value =
        `${prod.codigo} — ${prod.descricao}`;

    document.getElementById("listaProdutos").style.display = "none";

    document.getElementById("valor_unitario").value =
        prod.valor_unitario.toString().replace(".", ",");
}

// ===============================================
//   SALVAR ALTERAÇÕES NO ITEM
// ===============================================
async function salvarAlteracoes() {

    let qtd = Number(document.getElementById("quantidade").value);

    let valorUnit = document.getElementById("valor_unitario").value
        .replace(".", "")
        .replace(",", ".");
    valorUnit = Number(valorUnit);

    const dataEntrega = document.getElementById("data_entrega").value;

    if (!itemAtual.produto_id) {
        alert("Selecione um produto válido!");
        return;
    }

    // 1️⃣ Atualiza o item no banco
    const { error } = await supabase
        .from("pedidos_itens")
        .update({
            produto_id: itemAtual.produto_id,
            quantidade: qtd,
            valor_unitario: valorUnit,
            data_entrega: dataEntrega
        })
        .eq("id", itemId);

    if (error) {
        alert("Erro ao salvar item!");
        return;
    }

    // 2️⃣ Recarrega itens do pedido para recalcular total
    const { data: itens, error: errItens } = await supabase
        .from("pedidos_itens")
        .select("quantidade, valor_unitario")
        .eq("pedido_id", pedidoId);

    if (errItens) {
        alert("Erro ao recalcular total!");
        return;
    }

    // 3️⃣ Somar novos valores
    let novoTotal = 0;
    itens.forEach(i => {
        novoTotal += Number(i.quantidade) * Number(i.valor_unitario);
    });

    // 4️⃣ Atualizar total do pedido
    const { error: errPed } = await supabase
        .from("pedidos")
        .update({ total: novoTotal })
        .eq("id", pedidoId);

    if (errPed) {
        alert("Erro ao atualizar total!");
        return;
    }

    alert("Item atualizado com sucesso!");
    window.location.href = `pedidos_editar.html?id=${pedidoId}`;
}
