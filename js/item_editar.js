// ======================================================
// ITEM_EDITAR.JS — VERSÃO ESTÁVEL
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

let idItem = null;

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    idItem = params.get("idItem");

    if (!idItem) {
        alert("Item não encontrado");
        return;
    }

    await carregarItem();

    document.getElementById("btnSalvar")
        ?.addEventListener("click", salvarAlteracoes);
});

// ======================================================
// CARREGAR ITEM
// ======================================================
async function carregarItem() {
    const { data, error } = await supabase
        .from("pedidos_itens")
        .select("quantidade, valor_unitario, data_entrega")
        .eq("id", idItem)
        .single();

    if (error || !data) {
        console.error("Erro ao carregar item:", error);
        alert("Erro ao carregar item");
        return;
    }

    document.getElementById("quantidade").value = data.quantidade;
    document.getElementById("valor_unitario").value =
        Number(data.valor_unitario).toFixed(2).replace(".", ",");

    document.getElementById("data_entrega").value =
        data.data_entrega ? data.data_entrega.split("T")[0] : "";
}

// ======================================================
// SALVAR
// ======================================================
async function salvarAlteracoes() {
    const quantidade = Number(document.getElementById("quantidade").value);
    const valorUnitario = Number(
        document.getElementById("valor_unitario").value.replace(",", ".")
    );
    const dataEntrega = document.getElementById("data_entrega").value;

    if (!quantidade || !valorUnitario || !dataEntrega) {
        alert("Preencha todos os campos");
        return;
    }

    const { error } = await supabase
        .from("pedidos_itens")
        .update({
            quantidade,
            valor_unitario: valorUnitario,
            data_entrega: dataEntrega
        })
        .eq("id", idItem);

    if (error) {
        console.error("Erro ao atualizar item:", error);
        alert("Erro ao atualizar item");
        return;
    }

    alert("Item atualizado com sucesso");
    history.back();
}
