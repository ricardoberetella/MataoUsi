import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let itens = [];
let editandoIndex = null;
let pedidoId = null;

/* ============================================================
   AO ABRIR A PÁGINA
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    pedidoId = getParam("id");

    await carregarClientes();
    await carregarProdutos();
    await carregarPedido();
    await carregarItens();
});

/* ============================================================
   GET PARAM
============================================================ */
function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

/* ============================================================
   CARREGAR CLIENTES
============================================================ */
async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("*").order("razao_social");

    const select = document.getElementById("cliente");
    select.innerHTML = "";

    data.forEach(cli => {
        const opt = document.createElement("option");
        opt.value = cli.id;
        opt.textContent = cli.razao_social;
        select.appendChild(opt);
    });
}

/* ============================================================
   CARREGAR PRODUTOS
============================================================ */
async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("*").order("codigo");

    const select = document.getElementById("produto");
    select.innerHTML = `<option value="">Selecione...</option>`;

    data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.codigo} - ${p.descricao}`;
        opt.dataset.codigo = p.codigo;
        opt.dataset.descricao = p.descricao;
        opt.dataset.valor = p.valor_unitario;
        select.appendChild(opt);
    });

    // Preencher dados ao selecionar
    select.addEventListener("change", () => {
        const opt = select.selectedOptions[0];
        if (!opt.value) return;

        document.getElementById("descricao").value = opt.dataset.descricao;
        document.getElementById("valor_unit").value = Number(opt.dataset.valor).toFixed(2);
    });
}

/* ============================================================
   CARREGAR PEDIDO
============================================================ */
async function carregarPedido() {
    const { data } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedidoId)
        .single();

    if (data) {
        document.getElementById("cliente").value = data.cliente_id;
        document.getElementById("data_pedido").value = data.data_pedido;
        document.getElementById("numero_pedido").value = data.numero_pedido;
    }
}

/* ============================================================
   CARREGAR ITENS
============================================================ */
async function carregarItens() {
    const { data } = await supabase
        .from("pedidos_itens")
        .select("*, produtos (codigo, descricao)")
        .eq("pedido_id", pedidoId);

    itens = data.map(i => ({
        produto_id: i.produto_id,
        codigo: i.produtos.codigo,
        descricao: i.produtos.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        data_entrega: i.data_entrega
    }));

    atualizarTabelaItens();
}

/* ============================================================
   ADICIONAR / EDITAR ITEM
============================================================ */
document.getElementById("btnAdicionarItem").addEventListener("click", () => {
    const produto = document.getElementById("produto").value;
    const descricao = document.getElementById("descricao").value;
    const quantidade = Number(document.getElementById("quantidade").value);
    const unit = Number(document.getElementById("valor_unit").value);
    const dataEntrega = document.getElementById("data_entrega_item").value;

    if (!produto || quantidade <= 0 || !dataEntrega) {
        alert("Preencha todos os campos do item!");
        return;
    }

    const codigoTexto = document.getElementById("produto").selectedOptions[0].textContent.split(" - ")[0];

    const novoItem = {
        produto_id: Number(produto),
        codigo: codigoTexto,
        descricao,
        quantidade,
        valor_unitario: unit,
        data_entrega: dataEntrega
    };

    if (editandoIndex !== null) {
        itens[editandoIndex] = novoItem;
        editandoIndex = null;
    } else {
        itens.push(novoItem);
    }

    atualizarTabelaItens();
    limparCamposItem();
});

/* ============================================================
   TABELA DE ITENS
============================================================ */
function atualizarTabelaItens() {
    const tbody = document.querySelector("#tabelaItens tbody");
    tbody.innerHTML = "";

    itens.forEach((item, index) => {
        const subtotal = (item.quantidade * item.valor_unitario).toFixed(2);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.descricao}</td>
            <td>${item.quantidade}</td>
            <td>${item.valor_unitario.toFixed(2)}</td>
            <td>${formatarData(item.data_entrega)}</td>
            <td>R$ ${subtotal}</td>
            <td>
                <button class="btn-editar" onclick="editarItem(${index})">Editar</button>
                <button class="btn-excluir" onclick="excluirItem(${index})">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    atualizarTotal();
}

/* ============================================================
   EDITAR ITEM
============================================================ */
window.editarItem = (index) => {
    editandoIndex = index;
    const item = itens[index];

    document.getElementById("produto").value = item.produto_id;
    document.getElementById("descricao").value = item.descricao;
    document.getElementById("quantidade").value = item.quantidade;
    document.getElementById("valor_unit").value = item.valor_unitario.toFixed(2);
    document.getElementById("data_entrega_item").value = item.data_entrega;
};

/* ============================================================
   EXCLUIR ITEM
============================================================ */
window.excluirItem = (index) => {
    itens.splice(index, 1);
    atualizarTabelaItens();
};

/* ============================================================
   ATUALIZAR TOTAL
============================================================ */
function atualizarTotal() {
    let total = itens.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
    document.getElementById("totalGeral").innerText = total.toFixed(2);
}

/* ============================================================
   SALVAR ALTERAÇÕES
============================================================ */
document.getElementById("btnSalvar").addEventListener("click", async () => {
    const cliente = document.getElementById("cliente").value;
    const dataPedido = document.getElementById("data_pedido").value;
    const numero = document.getElementById("numero_pedido").value;

    const total = itens.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);

    const { error: erroUpdate } = await supabase
        .from("pedidos")
        .update({
            cliente_id: cliente,
            data_pedido: dataPedido,
            numero_pedido: numero,
            total: total
        })
        .eq("id", pedidoId);

    if (erroUpdate) {
        console.log(erroUpdate);
        alert("Erro ao atualizar pedido!");
        return;
    }

    // Apaga itens antigos
    await supabase.from("pedidos_itens").delete().eq("pedido_id", pedidoId);

    // Reinsere itens novos
    for (let item of itens) {
        await supabase.from("pedidos_itens").insert({
            pedido_id: pedidoId,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            data_entrega: item.data_entrega
        });
    }

    alert("Pedido atualizado com sucesso!");
    window.location.href = "pedidos_lista.html";
});

/* ============================================================
   INPUTS
============================================================ */
function limparCamposItem() {
    document.getElementById("produto").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("valor_unit").value = "";
    document.getElementById("quantidade").value = 1;
    document.getElementById("data_entrega_item").value = "";
}

function formatarData(data) {
    if (!data) return "";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
}
