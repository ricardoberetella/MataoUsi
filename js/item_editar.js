// ======================================================
// ITEM_EDITAR.JS — DEFINITIVO / SEM INVALID DATE / SEM BUG
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const idItem = params.get("idItem");
    const idPedido = params.get("idPedido");

    if (!idItem || !idPedido) {
        alert("Parâmetros inválidos");
        return;
    }

    const inputProduto = document.getElementById("busca_produto");
    const inputQtd = document.getElementById("quantidade");
    const inputValor = document.getElementById("valor_unitario");
    const inputData = document.getElementById("data_entrega");
    const btnSalvar = document.getElementById("btnSalvarItem");
    const voltarLink = document.getElementById("voltarLink");

    voltarLink.href = `pedidos_editar.html?id=${idPedido}`;

    await carregarItem();
    btnSalvar.addEventListener("click", salvarItem);

    // ==================================================
    async function carregarItem() {
        const { data, error } = await supabase
            .from("pedidos_itens")
            .select(`
                quantidade,
                valor_unitario,
                data_entrega,
                produtos(codigo, descricao)
            `)
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

        // data_entrega vem YYYY-MM-DD ou timestamp
        if (data.data_entrega) {
            const iso = data.data_entrega.substring(0, 10); // GARANTE
            const [ano, mes, dia] = iso.split("-");
            inputData.value = `${dia}/${mes}/${ano}`;
        } else {
            inputData.value = "";
        }
    }

    // ==================================================
    async function salvarItem() {
        const quantidade = Number(inputQtd.value);
        const valor = Number(inputValor.value.replace(",", "."));
        const dataBR = inputData.value.trim();

        if (!quantidade || quantidade <= 0) {
            alert("Quantidade inválida");
            return;
        }

        if (!valor || valor <= 0) {
            alert("Valor inválido");
            return;
        }

        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataBR)) {
            alert("Data inválida. Use DD/MM/AAAA");
            return;
        }

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
});
