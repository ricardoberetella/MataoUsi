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

/* ===========================================
   CARREGAR LISTA NA TELA
===========================================*/
if (document.getElementById("listaProdutos")) {
    carregarLista();
    carregarCodigosFiltro();
}

/* ===== Carrega lista principal ===== */
async function carregarLista(filtros = {}) {
    let query = supabase.from("produtos").select("*").order("codigo");

    if (filtros.codigo && filtros.codigo !== "todos") {
        query = query.eq("codigo", filtros.codigo);
    }
    if (filtros.acabamento && filtros.acabamento !== "todos") {
        query = query.eq("acabamento", filtros.acabamento);
    }

    const { data } = await query;

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

/* ========== EXCLUIR PRODUTO ========== */
window.excluir = async (id) => {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("produtos").delete().eq("id", id);
    carregarLista();
};

/* ===========================================
   CARREGAR CÓDIGOS NO FILTRO
===========================================*/
async function carregarCodigosFiltro() {
    const { data } = await supabase.from("produtos").select("codigo").order("codigo");

    const select = document.getElementById("filtroCodigo");
    if (!select) return;

    select.innerHTML = `<option value="todos">Todos</option>`;

    const usados = new Set();

    data.forEach(p => {
        if (!usados.has(p.codigo)) {
            usados.add(p.codigo);

            const opt = document.createElement("option");
            opt.value = p.codigo;
            opt.textContent = p.codigo;

            select.appendChild(opt);
        }
    });
}

/* ===========================================
   BOTÃO APLICAR FILTROS
===========================================*/
if (document.getElementById("btnAplicar")) {
    document.getElementById("btnAplicar").onclick = () => {
        const codigo = document.getElementById("filtroCodigo").value;
        const acabamento = document.getElementById("filtroAcabamento").value;

        carregarLista({ codigo, acabamento });

        document.getElementById("modalFiltros").style.display = "none";
    };
}

/* LIMPAR FILTROS */
if (document.getElementById("btnLimpar")) {
    document.getElementById("btnLimpar").onclick = () => {
        document.getElementById("filtroCodigo").value = "todos";
        document.getElementById("filtroAcabamento").value = "todos";
        carregarLista();
    };
}

/* ===========================================
   ABRIR / FECHAR MODAL
===========================================*/
if (document.getElementById("btnFiltros")) {
    btnFiltros.onclick = () => {
        document.getElementById("modalFiltros").style.display = "flex";
        carregarCodigosFiltro();
    };
}

if (document.getElementById("modalClose")) {
    modalClose.onclick = () => {
        document.getElementById("modalFiltros").style.display = "none";
    };
}

/* ===========================================
   TELA NOVO PRODUTO
===========================================*/
if (document.getElementById("btnSalvarNovo")) {
    document.getElementById("btnSalvarNovo").onclick = salvarNovo;
}

async function salvarNovo() {
    const produto = coletarDados();

    const resp = await supabase.from("produtos").insert([produto]);

    if (resp.error) {
        alert("Erro ao salvar");
        return;
    }

    location.href = "produtos_lista.html";
}

/* ===========================================
   TELA EDITAR PRODUTO
===========================================*/
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

/* ===========================================
   COLETAR FORMULÁRIO
===========================================*/
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
