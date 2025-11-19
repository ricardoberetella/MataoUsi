import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaProdutos = [];
let produtoEditandoId = null;

// ==========================
// Helpers para decimal BR
// ==========================
function parseDecimalBR(valor) {
    if (!valor) return null;
    valor = valor.toString().trim().replace(/\./g, "").replace(",", ".");
    const num = parseFloat(valor);
    return isNaN(num) ? null : num;
}

function formatDecimalBR(valor, casas = 2) {
    if (valor === null || valor === undefined || isNaN(valor)) return "";
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function mostrarMensagem(elemento, texto, tipo) {
    if (!elemento) return;
    elemento.style.color = tipo === "erro" ? "#ff6b6b" : "#22c55e";
    elemento.textContent = texto;
    elemento.style.display = "block";
    setTimeout(() => elemento.style.display = "none", 3000);
}

// ==========================
// Carregar Produtos
// ==========================
async function carregarProdutos() {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("codigo", { ascending: true });

    const tbody = document.getElementById("listaProdutos");
    tbody.innerHTML = "";

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        return;
    }

    listaProdutos = data;

    data.forEach(produto => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${produto.codigo}</td>
            <td>${produto.descricao}</td>
            <td>${produto.unidade}</td>
            <td>${formatDecimalBR(produto.comprimento_mm, 2)}</td>
            <td>${produto.acabamento}</td>
            <td>${formatDecimalBR(produto.peso_liquido, 3)}</td>
            <td>${formatDecimalBR(produto.peso_bruto, 3)}</td>
            <td>${formatDecimalBR(produto.preco_custo, 2)}</td>
            <td>${formatDecimalBR(produto.preco_venda, 2)}</td>

            <td>
                <button class="edit-btn" onclick="editarProduto('${produto.id}')">Editar</button>
                <button class="delete-btn" onclick="excluirProduto('${produto.id}')">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// ==========================
// Salvar Produto
// ==========================
async function salvarProduto() {
    const msg = document.getElementById("mensagem");

    const produto = {
        codigo: document.getElementById("codigo").value.trim(),
        descricao: document.getElementById("descricao").value.trim(),
        unidade: document.getElementById("unidade").value.trim(),
        comprimento_mm: parseDecimalBR(document.getElementById("comprimento_mm").value),
        acabamento: document.getElementById("acabamento").value.trim(),
        peso_liquido: parseDecimalBR(document.getElementById("peso_liquido").value),
        peso_bruto: parseDecimalBR(document.getElementById("peso_bruto").value),
        preco_custo: parseDecimalBR(document.getElementById("preco_custo").value),
        preco_venda: parseDecimalBR(document.getElementById("preco_venda").value)
    };

    const { error } = await supabase.from("produtos").insert([produto]);

    if (error) {
        mostrarMensagem(msg, "Erro ao salvar o produto.", "erro");
        console.error("Erro ao salvar produto:", error);
    } else {
        mostrarMensagem(msg, "Produto salvo com sucesso!", "sucesso");
        carregarProdutos();
    }
}

// ==========================
// Editar Produto
// ==========================
function editarProduto(id) {
    const modal = document.getElementById("editModal");
    const produto = listaProdutos.find(p => p.id === id);
    produtoEditandoId = id;

    document.getElementById("editFields").innerHTML = `
        <label>Código</label>
        <input id="edit_codigo" value="${produto.codigo}">

        <label>Descrição</label>
        <input id="edit_descricao" value="${produto.descricao}">

        <label>Unidade</label>
        <input id="edit_unidade" value="${produto.unidade}">

        <label>Comprimento (mm)</label>
        <input id="edit_comprimento_mm" value="${formatDecimalBR(produto.comprimento_mm, 2)}">

        <label>Acabamento</label>
        <input id="edit_acabamento" value="${produto.acabamento}">

        <label>Peso Líquido (kg)</label>
        <input id="edit_peso_liquido" value="${formatDecimalBR(produto.peso_liquido, 3)}">

        <label>Peso Bruto (kg)</label>
        <input id="edit_peso_bruto" value="${formatDecimalBR(produto.peso_bruto, 3)}">

        <label>Preço de Custo</label>
        <input id="edit_preco_custo" value="${formatDecimalBR(produto.preco_custo, 2)}">

        <label>Preço de Venda</label>
        <input id="edit_preco_venda" value="${formatDecimalBR(produto.preco_venda, 2)}">
    `;

    modal.style.display = "block";
}

async function salvarEdicao() {
    const modal = document.getElementById("editModal");

    const produto = {
        codigo: document.getElementById("edit_codigo").value.trim(),
        descricao: document.getElementById("edit_descricao").value.trim(),
        unidade: document.getElementById("edit_unidade").value.trim(),
        comprimento_mm: parseDecimalBR(document.getElementById("edit_comprimento_mm").value),
        acabamento: document.getElementById("edit_acabamento").value.trim(),
        peso_liquido: parseDecimalBR(document.getElementById("edit_peso_liquido").value),
        peso_bruto: parseDecimalBR(document.getElementById("edit_peso_bruto").value),
        preco_custo: parseDecimalBR(document.getElementById("edit_preco_custo").value),
        preco_venda: parseDecimalBR(document.getElementById("edit_preco_venda").value)
    };

    const { error } = await supabase
        .from("produtos")
        .update(produto)
        .eq("id", produtoEditandoId);

    if (error) {
        alert("Erro ao atualizar produto.");
        console.error(error);
    } else {
        modal.style.display = "none";
        carregarProdutos();
    }
}

function fecharEdicao() {
    document.getElementById("editModal").style.display = "none";
}

// ==========================
// Excluir Produto
// ==========================
async function excluirProduto(id) {
    if (!confirm("Excluir este produto?")) return;

    await supabase.from("produtos").delete().eq("id", id);
    carregarProdutos();
}

// ==========================
// Filtro por código
// ==========================
document.getElementById("buscarCodigo").addEventListener("input", function () {
    const filtro = this.value.toLowerCase();
    document.querySelectorAll("#listaProdutos tr").forEach(tr => {
        const codigo = tr.children[0].textContent.toLowerCase();
        tr.style.display = codigo.includes(filtro) ? "" : "none";
    });
});

// ==========================
// Eventos
// ==========================
document.getElementById("btnSalvar").addEventListener("click", salvarProduto);
window.onload = carregarProdutos;
