// ======================================================
// ITEM_EDITAR.JS — VERSÃO DEFINITIVA / ESTÁVEL
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

// ------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const idItem = params.get("idItem");
const idPedido = params.get("idPedido");

const inputProduto = document.getElementById("busca_produto");
const inputQtd = document.getElementById("quantidade");
const inputValor = document.getElementById("valor_unitario");
const inputData = document.getElementById("data_entrega");
const btnSalvar = document.getElementById("btnSalvarItem");
const voltarLink = document.getElementById("voltarLink");

// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    if (!idItem || !idPedido) {
        alert("Parâmetros inválidos");
        return;
    }

    voltarLink.href = `pedidos_editar.html?id=${idPedido}`;

    await carregarItem();

    btnSalvar.addEventListener("click", salvarItem);
});

// ======================================================
// CARREGAR ITEM
// ======================================================
async function carregarItem() {
    const { data, error } = await supabase
        .from("pedidos_itens")
        .select("quantidade, valor_unitario, data_entrega, produtos(codigo, descricao)")
        .eq("id", idItem)
        .single();

    if (error || !data) {
        console.error("Erro ao carregar item:", error);
        alert("Erro ao carregar item");
        return;
    }

    inputProduto.value = `${data.produtos.codigo} — ${data.produtos.descricao}`;
    inputQtd.value = data.quantidade;
    inputValor.value = Number(data.valor_unitario).toFixed(2).replace(".", ",");

    if (data.data_entrega) {
        const d = new Date(data.data_entrega + "T12:00:00");
        inputData.value = d.toLocaleDateString("pt-BR");
    }
}

// ======================================================
// SALVAR ITEM
// ======================================================
async function salvarItem() {
    const quantidade = Number(inputQtd.value);
    const valor = Number(inputValor.value.replace(",", "."));
    const dataBR = inputData.value;

    if (!quantidade || !valor || !dataBR) {
        alert("Preencha todos os campos corretamente");
        return;
    }

    // DD/MM/AAAA → YYYY-MM-DD (SEM FUSO)
    const [dia, mes, ano] = dataBR.split("/");
    const dataISO = `${ano}-${mes}-${dia}`;

    const { error } = await supabase
        .from("pedidos_itens")
        .update({
            quantidade,
            valor_unitario: valor,
            data_entrega: dataISO
        })
        .eq("id", idItem);

    if (error) {
        console.error("Erro ao atualizar item:", error);
        alert("Erro ao atualizar item");
        return;
    }

    alert("Item atualizado com sucesso");
    window.location.href = `pedidos_editar.html?id=${idPedido}`;
}
