import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let pedidoId = null;
let itens = [];
let produtos = [];
let editandoIndex = null;

/* =====================================================
   INICIALIZAÇÃO
===================================================== */
document.addEventListener("DOMContentLoaded", async () => {
    pedidoId = getParam("id");

    await carregarClientes();
    await carregarProdutos();
    await carregarPedido();
    await carregarItens();

    document.getElementById("selectProduto").addEventListener("change", preencherValorDoProduto);
    document.getElementById("btnConfirmarItem").addEventListener("click", confirmarItem);
    document.getElementById("btnSalvar").addEventListener("click", salvarPedido);
});

/* =====================================================
   PEGAR PARAM DA URL
===================================================== */
function getParam(name) {
    return new URL(window.location.href).searchParams.get(name);
}

/* =====================================================
   CARREGAR CLIENTES
===================================================== */
async function carregarClientes() {
    const { data } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social");

    document.getElementById("cliente").innerHTML =
        data.map(c => `<option value="${c.id}">${c.razao_social}</option>`).join("");
}

/* =====================================================
   CARREGAR PRODUTOS
===================================================== */
async function carregarProdutos() {
    const { data } = await supabase
        .from("produtos")
        .select("*")
        .order("codigo");

    produtos = data;

    const select = document.getElementById("selectProduto");
    select.innerHTML = `<option value="">Selecione...</option>`;

    produtos.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.codigo} — ${p.descricao}</option>`;
    });
}

/* =====================================================
   AO MUDAR PRODUTO → PREENCHER VALOR UNITÁRIO
===================================================== */
function preencherValorDoProduto() {
    const idProduto = Number(document.getElementById("selectProduto").value);
    const produto = produtos.find(p => p.id === idProduto);

    if (!produto) return;

    // Campo correto vindo do Supabase
    let valor = parseFloat(produto.valor_unitario);

    if (isNaN(valor)) valor = 0;

    // Sempre formato numérico válido
    document.getElementById("inputValor").value = valor.toFixed(2);
}

/* =====================================================
   CARREGAR CABEÇALHO DO PEDIDO
===================================================== */
async function carregarPedido() {
    const { data } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedidoId)
        .single();

    document.getElementById("cliente").value = data.cliente_id;
    document.getElementById("data_pedido").value = data.data_pedido;
    document.getElementById("numero_pedido").value = data.numero_pedido;
}

/* =====================================================
   CARREGAR ITENS DO PEDIDO
===================================================== */
async function carregarItens() {
    const { data } = await supabase
        .from("pedidos_itens")
        .select("*, produtos(codigo, descricao)")
        .eq("pedido_id", pedidoId);

    itens = data || [];
    renderizarItens();
}

/* =====================================================
   ADICIONAR OU EDITAR ITEM
===================================================== */
async function confirmarItem() {
    const produto_id = Number(document.getElementById("selectProduto").value);
    const qtd = Number(document.getElementById("inputQtd").value);
    const valor = Number(document.getElementById("inputValor").value.replace(",", "."));
    const entrega = document.getElementById("inputEntrega").value;

    if (!produto_id || !qtd || !valor || !entrega) {
        alert("Preencha todos os campos.");
        return;
    }

    if (editandoIndex !== null) {
        // Atualizar item existente
        const item = itens[editandoIndex];

        await supabase
            .from("pedidos_itens")
            .update({
                produto_id,
                quantidade: qtd,
                valor_unitario: valor,
                data_entrega: entrega
            })
            .eq("id", item.id);

        editandoIndex = null;
    } else {
        // Inserir novo item
        await supabase
            .from("pedidos_itens")
            .insert({
                pedido_id: pedidoId,
                produto_id,
                quantidade: qtd,
                valor_unitario: valor,
                data_entrega: entrega
            });
    }

    await carregarItens();
    limparCampos();
}

/* =====================================================
   EDITAR ITEM EM LINHA
===================================================== */
window.editarItem = index => {
    editandoIndex = index;
    const item = itens[index];

    document.getElementById("selectProduto").value = item.produto_id;
    document.getElementById("inputQtd").value = item.quantidade;
    document.getElementById("inputValor").value = item.valor_unitario.toFixed(2);
    document.getElementById("inputEntrega").value = item.data_entrega;
};

/* =====================================================
   EXCLUIR ITEM
===================================================== */
window.excluirItem = async index => {
    if (!confirm("Excluir este item?")) return;

    await supabase
        .from("pedidos_itens")
        .delete()
        .eq("id", itens[index].id);

    await carregarItens();
};

/* =====================================================
   LIMPAR CAMPOS
===================================================== */
function limparCampos() {
    document.getElementById("selectProduto").value = "";
    document.getElementById("inputQtd").value = 1;
    document.getElementById("inputValor").value = "";
    document.getElementById("inputEntrega").value = "";
}

/* =====================================================
   RENDERIZAR ITENS NA TABELA
===================================================== */
function renderizarItens() {
    const tbody = document.getElementById("listaItens");
    tbody.innerHTML = "";

    let total = 0;

    itens.forEach((item, index) => {
        const subtotal = item.quantidade * item.valor_unitario;
        total += subtotal;

        const dataBR = item.data_entrega.split("-").reverse().join("/");

        tbody.innerHTML += `
            <tr>
                <td>${item.produtos.codigo}</td>
                <td>${item.produtos.descricao}</td>
                <td>${item.quantidade}</td>
                <td>${item.valor_unitario.toFixed(2).replace(".", ",")}</td>
                <td>${dataBR}</td>
                <td>
                    <button class="btn-editar" onclick="editarItem(${index})">Editar</button>
                    <button class="btn-excluir" onclick="excluirItem(${index})">Excluir</button>
                </td>
            </tr>
        `;
    });

    document.getElementById("totalPedido").innerText =
        total.toFixed(2).replace(".", ",");
}

/* =====================================================
   SALVAR ALTERAÇÕES DO CABEÇALHO
===================================================== */
async function salvarPedido() {
    await supabase
        .from("pedidos")
        .update({
            cliente_id: document.getElementById("cliente").value,
            data_pedido: document.getElementById("data_pedido").value,
            numero_pedido: document.getElementById("numero_pedido").value
        })
        .eq("id", pedidoId);

    alert("Pedido atualizado com sucesso!");
    window.location.href = "pedidos_lista.html";
}
