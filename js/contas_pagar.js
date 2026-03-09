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

const btnNovaConta = document.getElementById("btnNovaConta");
const btnNovaNF = document.getElementById("btnNovaNF");
const btnTransferencias = document.getElementById("btnTransferencias");

/* =========================
TABELA
========================= */

const tabela = document.getElementById("tabelaContas");

/* =========================
FORMATADORES
========================= */

function moeda(v) {
    return Number(v).toLocaleString("pt-BR", {
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
CARREGAR CONTAS
========================= */

async function carregarContas() {

    let query = supabase
        .from("contas_pagar")
        .select("*, bancos(nome)")
        .order("vencimento", { ascending: false });

    if (filtroBanco?.value && filtroBanco.value !== "TODOS") {
        query = query.eq("banco_id", filtroBanco.value);
    }

    if (filtroStatus?.value && filtroStatus.value !== "TODOS") {
        query = query.eq("status", filtroStatus.value);
    }

    if (filtroTipo?.value && filtroTipo.value !== "TODOS") {
        query = query.eq("tipo", filtroTipo.value);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    tabela.innerHTML = "";

    data.forEach(l => {

        const tipo = l.tipo || "SAIDA";

        let entrada = "-";
        let saida = "-";

        if (tipo === "ENTRADA") {
            entrada = `<span style="color:#16f5a3;font-weight:600">${moeda(l.valor)}</span>`;
        } else {
            saida = `<span style="color:#ff6b6b;font-weight:600">${moeda(l.valor)}</span>`;
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
            <button onclick="marcarPago(${l.id})">Pagar</button>
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

/* =========================
EVENTOS
========================= */

if (filtroBanco) filtroBanco.onchange = carregarContas;
if (filtroStatus) filtroStatus.onchange = carregarContas;
if (filtroTipo) filtroTipo.onchange = carregarContas;

/* =========================
BOTÕES
========================= */

if (btnTransferencias) {
    btnTransferencias.onclick = () => {
        window.location.href = "/transferencias";
    };
}

/* =========================
INIT
========================= */

carregarContas();
