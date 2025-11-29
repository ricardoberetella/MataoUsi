import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;

/* FORMATADORES */
function fmt1(v){ return Number(v).toFixed(1).replace(".", ","); }
function fmt3(v){ return Number(v).toFixed(3).replace(".", ","); }
function fmt2(v){ return "R$ " + Number(v).toFixed(2).replace(".", ","); }
function parseBR(v){ return Number(v.replace(/\./g,"").replace(",",".")) || 0; }

/* ===========================================
   LISTAR PRODUTOS
===========================================*/
if (document.getElementById("listaProdutos")) carregarLista();

async function carregarLista() {
    const { data } = await supabase
        .from("produtos")
        .select("*")
        .order("codigo");

    montarTabela(data);
}

function montarTabela(data) {
    const tbody = document.getElementById("listaProdutos");
    tbody.innerHTML = "";

    data.forEach(p => {
        tbody.innerHTML += `
            <tr>
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

                    <button class="btn-excluir" onclick="excluir(${p.id})">
                        Excluir
                    </button>
                </td>
            </tr>
        `;
    });
}

window.excluir = async (id) => {
    if (!confirm("Excluir produto?")) return;

    await supabase.from("produtos").delete().eq("id", id);
    carregarLista();
};

/* ===========================================
   FILTROS – MODAL
===========================================*/

const modal = document.getElementById("modalFiltros");
const btnFiltros = document.getElementById("btnFiltros");
const btnFecharFiltros = document.getElementById("btnFecharFiltros");
const filtroCodigo = document.getElementById("filtroCodigo");
const filtroAcabamento = document.getElementById("filtroAcabamento");
const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");

btnFiltros.onclick = () => {
    modal.style.display = "flex";
    carregarCodigosFiltro();
};

btnFecharFiltros.onclick = () => {
    modal.style.display = "none";
};

window.onclick = (ev) => {
    if (ev.target === modal) modal.style.display = "none";
};

async function carregarCodigosFiltro() {

    const { data } = await supabase
        .from("produtos")
        .select("codigo")
        .order("codigo");

    filtroCodigo.innerHTML = `<option value="todos">Todos</option>`;

    data.forEach(p => {
        filtroCodigo.innerHTML += `
          <option value="${p.codigo}">${p.codigo}</option>
        `;
    });
}

btnAplicarFiltros.onclick = async () => {

    let query = supabase.from("produtos").select("*").order("codigo");

    if (filtroCodigo.value !== "todos")
        query = query.eq("codigo", filtroCodigo.value);

    if (filtroAcabamento.value !== "todos")
        query = query.eq("acabamento", filtroAcabamento.value);

    const { data } = await query;
    montarTabela(data);

    modal.style.display = "none";
};

btnLimparFiltros.onclick = () => {
    filtroCodigo.value = "todos";
    filtroAcabamento.value = "todos";
    carregarLista();
    modal.style.display = "none";
};

/* ===========================================
   IMPRESSÃO — FORMATO IGUAL AOS PEDIDOS
===========================================*/

document.getElementById("btnImprimir").onclick = async () => {

    const { data } = await supabase
        .from("produtos")
        .select("*")
        .order("codigo");

    document.getElementById("printDataHora").innerText =
        new Date().toLocaleString("pt-BR");

    const tabela = document.getElementById("printTable");

    tabela.innerHTML = `
        <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Comp. (mm)</th>
            <th>Peso Líq.</th>
            <th>Peso Bruto</th>
            <th>Valor Unit.</th>
            <th>Acabamento</th>
        </tr>
    `;

    data.forEach(p => {
        tabela.innerHTML += `
            <tr>
                <td>${p.codigo}</td>
                <td>${p.descricao}</td>
                <td>${fmt1(p.comprimento_mm)}</td>
                <td>${fmt3(p.peso_liquido)}</td>
                <td>${fmt3(p.peso_bruto)}</td>
                <td>${fmt2(p.valor_unitario)}</td>
                <td>${p.acabamento}</td>
            </tr>
        `;
    });

    document.getElementById("printArea").style.display = "block";
    window.print();
    document.getElementById("printArea").style.display = "none";
};

/* ===========================================
   EDITAR PRODUTO
===========================================*/

if (location.search.includes("id=")) carregarProduto();

async function carregarProduto() {

    const id = new URLSearchParams(location.search).get("id");
    editandoId = id;

    const { data } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

    descricao.value = data.descricao;
    codigo.value = data.codigo;
    comprimento.value = fmt1(data.comprimento_mm);
    peso_liquido.value = fmt3(data.peso_liquido);
    peso_bruto.value = fmt3(data.peso_bruto);
    valor_unitario.value = data.valor_unitario.toString().replace(".", ",");
    acabamento.value = data.acabamento;
}

if (document.getElementById("btnSalvarEdicao"))
{
    document.getElementById("btnSalvarEdicao").onclick = salvarEdicao;
}

async function salvarEdicao() {

    const produto = coletarDados();

    await supabase
        .from("produtos")
        .update(produto)
        .eq("id", editandoId);

    location.href = "produtos_lista.html";
}

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
