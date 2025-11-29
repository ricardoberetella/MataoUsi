import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;

/* FORMATADORES */
function fmt1(v) {
    return Number(v).toFixed(1).replace(".", ",");
}
function fmt3(v) {
    return Number(v).toFixed(3).replace(".", ",");
}
function fmt2(v) {
    return "R$ " + Number(v).toFixed(2).replace(".", ",");
}
function parseBR(v) {
    return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
}

/* ==================================================================
   LISTA DE PRODUTOS
===================================================================*/
if (document.body.contains(document.getElementById("listaProdutos"))) {
    carregarLista();

    // Eventos do modal de filtros
    document.getElementById("btnFiltros").onclick = abrirModalFiltros;
    document.getElementById("btnAplicar").onclick = aplicarFiltros;
    document.getElementById("btnLimpar").onclick = limparFiltros;
    document.getElementById("modalClose").onclick = fecharModalFiltros;
}

async function carregarLista(filtros = {}) {
    let query = supabase.from("produtos").select("*");

    if (filtros.codigo && filtros.codigo !== "todos") {
        query = query.eq("codigo", filtros.codigo);
    }
    if (filtros.descricao && filtros.descricao.trim() !== "") {
        query = query.ilike("descricao", `%${filtros.descricao}%`);
    }
    if (filtros.acabamento && filtros.acabamento !== "todos") {
        query = query.eq("acabamento", filtros.acabamento);
    }

    const { data } = await query.order("codigo");

    const tbody = document.getElementById("listaProdutos");
    tbody.innerHTML = "";

    data.forEach(p => {
        let tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${p.codigo}</td>
            <td>${p.descricao}</td>
            <td>${fmt1(p.comprimento_mm)}</td>
            <td>${fmt3(p.peso_liquido)}</td>
            <td>${fmt3(p.peso_bruto)}</td>
            <td>${fmt2(p.valor_unitario)}</td>
            <td>${p.acabamento}</td>
            <td>
                <a href="produtos_editar.html?id=${p.id}">
                    <button class="btn-editar">Editar</button>
                </a>
                <button class="btn-excluir" onclick="excluir(${p.id})">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.excluir = async (id) => {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("produtos").delete().eq("id", id);
    carregarLista();
};

/* ==================================================================
   SISTEMA DE FILTROS
===================================================================*/
function abrirModalFiltros() {
    document.getElementById("modalFiltros").style.display = "flex";
}

function fecharModalFiltros() {
    document.getElementById("modalFiltros").style.display = "none";
}

function limparFiltros() {
    document.getElementById("filtroCodigo").value = "todos";
    document.getElementById("filtroDescricao").value = "";
    document.getElementById("filtroAcabamento").value = "todos";

    carregarLista();
    fecharModalFiltros();
}

function aplicarFiltros() {
    const filtros = {
        codigo: document.getElementById("filtroCodigo").value,
        descricao: document.getElementById("filtroDescricao").value,
        acabamento: document.getElementById("filtroAcabamento").value
    };

    carregarLista(filtros);
    fecharModalFiltros();
}

/* ==================================================================
   CADASTRAR PRODUTO
===================================================================*/
if (document.getElementById("btnSalvarNovo")) {
    document.getElementById("btnSalvarNovo").onclick = salvarNovo;
}

async function salvarNovo() {
    const produto = coletarDados();

    const resp = await supabase.from("produtos").insert([produto]);

    if (resp.error) {
        alert("Erro ao salvar");
        console.log(resp.error);
        return;
    }

    location.href = "produtos_lista.html";
}

/* ==================================================================
   EDITAR PRODUTO
===================================================================*/
if (location.search.includes("id=")) {
    carregarProduto();
}

async function carregarProduto() {
    const id = new URLSearchParams(location.search).get("id");
    editandoId = id;

    const { data } = await supabase.from("produtos").select("*").eq("id", id).single();

    descricao.value = data.descricao;
    codigo.value = data.codigo;
    comprimento.value = fmt1(data.comprimento_mm);
    peso_liquido.value = fmt3(data.peso_liquido);
    peso_bruto.value = fmt3(data.peso_bruto);
    valor_unitario.value = data.valor_unitario.toString().replace(".", ",");
    acabamento.value = data.acabamento;
}

if (document.getElementById("btnSalvarEdicao")) {
    document.getElementById("btnSalvarEdicao").onclick = salvarEdicao;
}

async function salvarEdicao() {
    const produto = coletarDados();

    const resp = await supabase.from("produtos").update(produto).eq("id", editandoId);

    if (resp.error) {
        alert("Erro ao salvar alterações");
        return;
    }

    location.href = "produtos_lista.html";
}

/* ==================================================================
   FUNÇÃO COLETAR DADOS
===================================================================*/
function coletarDados() {
    return {
        descricao: descricao.value.trim(),
        codigo: codigo.value.trim(),
        comprimento_mm: parseBR(comprimento.value),
        peso_liquido: parseBR(peso_liquido.value),
        peso_bruto: parseBR(peso_bruto.value),
        valor_unitario: parseBR(valor_unitario.value),
        acabamento: acabamento.value
    };
}
