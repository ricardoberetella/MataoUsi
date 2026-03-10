const supabase = window.supabaseClient;

/* =========================
FILTROS
========================= */

const filtroBanco = document.getElementById("filtroBanco");
const filtroData = document.getElementById("filtroData");
const filtroMes = document.getElementById("filtroMes");
const filtroStatus = document.getElementById("filtroStatus");
const filtroTipo = document.getElementById("filtroTipo");

/* =========================
BOTÕES
========================= */

const btnNovoPagar = document.getElementById("btnNovoPagar");
const btnNfEntrada = document.getElementById("btnNfEntrada");
const btnTransferir = document.getElementById("btnTransferir");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");

/* =========================
TABELA
========================= */

const tabela = document.getElementById("listaPagar");

/* =========================
FORMATADORES
========================= */

function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarDataBR(data) {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
}

/* =========================
CARREGAR BANCOS
========================= */

async function carregarBancos() {

    const { data, error } = await supabase
        .from("bancos")
        .select("*")
        .order("nome", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    filtroBanco.innerHTML = `<option value="">Todos</option>`;

    data.forEach(b => {

        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.nome;

        filtroBanco.appendChild(opt);

    });

}

/* =========================
CARREGAR CONTAS
========================= */

async function carregarContas() {

    if (!supabase) {
        console.error("Supabase não carregado");
        return;
    }

    let query = supabase
        .from("contas_pagar")
        .select("*, bancos(nome)")
        .order("vencimento", { ascending: false });

    if (filtroBanco?.value) {
        query = query.eq("banco_id", filtroBanco.value);
    }

    if (filtroStatus?.value && filtroStatus.value !== "TODOS") {
        query = query.eq("status", filtroStatus.value);
    }

    if (filtroTipo?.value && filtroTipo.value !== "TODOS") {
        query = query.eq("tipo", filtroTipo.value);
    }

    if (filtroData?.value) {
        query = query.eq("vencimento", filtroData.value);
    }

    if (filtroMes?.value) {

        const mes = filtroMes.value;

        const inicio = mes + "-01";

        const dataFim = new Date(mes + "-01");
        dataFim.setMonth(dataFim.getMonth() + 1);

        const fim = dataFim.toISOString().slice(0,10);

        query = query.gte("vencimento", inicio)
                     .lt("vencimento", fim);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    tabela.innerHTML = "";

    if (!data || data.length === 0) {
        tabela.innerHTML = `<tr><td colspan="7">Nenhum lançamento encontrado</td></tr>`;
        return;
    }

    data.forEach(l => {

        const tipo = l.tipo || "SAIDA";

        let entrada = "-";
        let saida = "-";

        if (tipo === "ENTRADA") {
            entrada = `<span style="color:#22c55e;font-weight:bold">${moeda(l.valor)}</span>`;
        } else {
            saida = `<span style="color:#ef4444;font-weight:bold">${moeda(l.valor)}</span>`;
        }

        const banco = l.bancos?.nome || "-";

        const tr = document.createElement("tr");

        tr.innerHTML = `
        <td>${formatarDataBR(l.vencimento)}</td>
        <td>${banco}</td>
        <td>${l.descricao || "-"}</td>
        <td>${entrada}</td>
        <td>${saida}</td>
        <td>${l.status}</td>
        <td>
            ${
                l.status !== "PAGO"
                ? `<button onclick="marcarPago(${l.id})">Pagar</button>`
                : `<span style="color:#22c55e">Pago</span>`
            }
        </td>
        `;

        tabela.appendChild(tr);

    });

}

/* =========================
MARCAR COMO PAGO
========================= */

async function marcarPago(id) {

    await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", id);

    carregarContas();

}

window.marcarPago = marcarPago;

/* =========================
LIMPAR FILTROS
========================= */

function limparFiltros(){

    filtroBanco.value = "";
    filtroData.value = "";
    filtroMes.value = "";
    filtroStatus.value = "ABERTO";
    filtroTipo.value = "TODOS";

    carregarContas();

}

/* =========================
EVENTOS
========================= */

if (filtroBanco) filtroBanco.onchange = carregarContas;
if (filtroStatus) filtroStatus.onchange = carregarContas;
if (filtroTipo) filtroTipo.onchange = carregarContas;

if (btnFiltrar) btnFiltrar.onclick = carregarContas;

if (btnLimparFiltros) btnLimparFiltros.onclick = limparFiltros;

/* =========================
BOTÕES
========================= */

if (btnTransferir) {
    btnTransferir.onclick = () => {
        window.location.href = "transferencias.html";
    };
}

if (btnNovoPagar) {
    btnNovoPagar.onclick = () => {
        window.location.href = "contas_pagar_novo.html";
    };
}

if (btnNfEntrada) {
    btnNfEntrada.onclick = () => {
        window.location.href = "nf_entrada.html";
    };
}

/* =========================
INIT
========================= */

async function init(){

    if(!supabase){
        console.error("window.supabaseClient não encontrado");
        return;
    }

    await carregarBancos();
    await carregarContas();

}

init();
