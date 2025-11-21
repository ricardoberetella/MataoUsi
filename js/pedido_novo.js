import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaProdutos = [];
let itensDoPedido = [];

/* =============== CARREGAR CLIENTES =============== */
async function carregarClientes() {
    const { data, error } = await supabase.from("clientes").select("*").order("razao_social");

    if (!error && data) {
        const sel = document.getElementById("cliente");
        sel.innerHTML = `<option value="">Selecione...</option>`;
        data.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.razao_social;
            sel.appendChild(opt);
        });
    }
}

/* =============== CARREGAR PRODUTOS =============== */
async function carregarProdutos() {
    const { data, error } = await supabase.from("produtos").select("*").order("codigo");
    if (!error && data) listaProdutos = data;
}

/* =============== ABRIR MODAL AO CLICAR NO CÓDIGO =============== */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("codigo_produto").addEventListener("click", abrirModalProdutos);
    document.querySelector(".btn-fechar-modal").addEventListener("click", fecharModal);
    document.getElementById("btnBuscarProduto").addEventListener("click", abrirModalProdutos);
    document.getElementById("btnAdicionarItem").addEventListener("click", adicionarItem);
    document.getElementById("buscaProduto").addEventListener("keyup", filtrarProdutos);
    document.getElementById("btnSalvarPedido").addEventListener("click", salvarPedido);

    carregarClientes();
    carregarProdutos();
});

/* =============== EXIBIR MODAL =============== */
function abrirModalProdutos() {
    document.getElementById("modalProdutos").style.display = "flex";
    montarTabelaProdutos(listaProdutos);
}

/* =============== FECHAR MODAL =============== */
function fecharModal() {
    document.getElementById("modalProdutos").style.display = "none";
}

/* =============== FILTRAR PRODUTOS =============== */
function filtrarProdutos() {
    const termo = document.getElementById("buscaProduto").value.toLowerCase();
    const filtrados = listaProdutos.filter(p =>
        p.codigo.toLowerCase().includes(termo) ||
        p.descricao.toLowerCase().includes(termo)
    );
    montarTabelaProdutos(filtrados);
}

/* =============== MONTAR LISTA NO MODAL =============== */
function montarTabelaProdutos(produtos) {
    const tbody = document.getElementById("tbodyModalProdutos");
    tbody.innerHTML = "";

    produtos.forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>R$ ${p.preco_venda?.toFixed(2) || "0,00"}</td>
      <td><button class="btn btn-primary btn-sm" data-id="${p.id}">Selecionar</button></td>
    `;

        tr.querySelector("button").addEventListener("click", () => selecionarProduto(p));
        tbody.appendChild(tr);
    });
}

/* =============== SELECIONAR PRODUTO =============== */
function selecionarProduto(produto) {
    document.getElementById("codigo_produto").value = produto.codigo;
    document.getElementById("descricao_produto").value = produto.descricao;
    document.getElementById("preco_unitario").value = produto.preco_venda;
    fecharModal();
}

/* =============== ADICIONAR ITEM NO PEDIDO =============== */
function adicionarItem() {
    const codigo = document.getElementById("codigo_produto").value;
    const desc = document.getElementById("descricao_produto").value;
    const preco = parseFloat(document.getElementById("preco_unitario").value || 0);
    const qtd = parseFloat(document.getElementById("quantidade").value || 0);

    if (!codigo || !desc || !preco || !qtd) {
        alert("Preencha todos os campos do item!");
        return;
    }

    const total = preco * qtd;

    itensDoPedido.push({
        codigo, descricao: desc, preco, qtd, total,
        produto_id: listaProdutos.find(p => p.codigo === codigo)?.id
    });

    atualizarTabelaItens();
    calcularTotal();

    document.getElementById("codigo_produto").value = "";
    document.getElementById("descricao_produto").value = "";
    document.getElementById("preco_unitario").value = "";
    document.getElementById("quantidade").value = "";
}

/* =============== ATUALIZAR TABELA DE ITENS =============== */
function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItens");
    tbody.innerHTML = "";

    itensDoPedido.forEach((item, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>${item.codigo}</td>
      <td>${item.descricao}</td>
      <td>${item.qtd}</td>
      <td>R$ ${item.preco.toFixed(2)}</td>
      <td>R$ ${item.total.toFixed(2)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removerItem(${index})">Remover</button></td>
    `;

        tbody.appendChild(tr);
    });
}

window.removerItem = (index) => {
    itensDoPedido.splice(index, 1);
    atualizarTabelaItens();
    calcularTotal();
}

/* =============== SOMAR TOTAL DO PEDIDO =============== */
function calcularTotal() {
    const total = itensDoPedido.reduce((acc, item) => acc + item.total, 0);
    document.getElementById("totalPedido").textContent = "R$ " + total.toFixed(2);
}

/* =============== SALVAR PEDIDO =============== */
async function salvarPedido() {

    if (itensDoPedido.length === 0) {
        alert("Adicione pelo menos um item!");
        return;
    }

    const pedido = {
        cliente_id: document.getElementById("cliente").value,
        data_pedido: document.getElementById("data_pedido").value,
        tipo_documento: document.getElementById("tipo_documento").value,
        numero_documento: document.getElementById("numero_documento").value,
        total: itensDoPedido.reduce((acc, item) => acc + item.total, 0)
    };

    const { data, error } = await supabase.from("pedidos").insert([pedido]).select().single();

    if (error) {
        alert("Erro ao salvar pedido: " + error.message);
        console.error(error);
        return;
    }

    const pedidoId = data.id;

    // salvar itens
    for (let item of itensDoPedido) {
        await supabase.from("pedidos_itens").insert([{
            pedido_id: pedidoId,
            produto_id: item.produto_id,
            quantidade: item.qtd,
            valor_unitario: item.preco
        }]);
    }

    alert("Pedido salvo com sucesso!");
    window.location.href = "pedidos.html";
}
