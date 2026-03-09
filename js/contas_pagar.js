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

    const somenteData = String(data).split("T")[0];
    const partes = somenteData.split("-");

    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    const d = new Date(data);
    if (isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("pt-BR");
}

function formatarMesReferencia(valorMes) {
    if (!valorMes) return null;

    const [ano, mes] = valorMes.split("-");
    if (!ano || !mes) return null;

    const inicio = `${ano}-${mes}-01`;

    const proximoMes = new Date(Number(ano), Number(mes), 1);
    const anoFim = proximoMes.getFullYear();
    const mesFim = String(proximoMes.getMonth() + 1).padStart(2, "0");
    const diaFim = "01";
    const fim = `${anoFim}-${mesFim}-${diaFim}`;

    return { inicio, fim };
}

/* =========================
CARREGAR BANCOS
========================= */

async function carregarBancos() {
    if (!supabase || !filtroBanco) {
        console.error("Supabase não encontrado ou filtroBanco inexistente.");
        return;
    }

    const valorAtual = filtroBanco.value;

    const { data, error } = await supabase
        .from("bancos")
        .select("id, nome")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao carregar bancos:", error);
        return;
    }

    filtroBanco.innerHTML = `<option value="">Todos</option>`;

    (data || []).forEach((banco) => {
        const option = document.createElement("option");
        option.value = banco.id;
        option.textContent = banco.nome;
        filtroBanco.appendChild(option);
    });

    if (valorAtual) {
        filtroBanco.value = valorAtual;
    }
}

/* =========================
CARREGAR CONTAS
========================= */

async function carregarContas() {
    if (!supabase) {
        console.error("window.supabaseClient não está definido.");
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;color:#f87171;padding:20px;">
                        Erro: Supabase não carregado.
                    </td>
                </tr>
            `;
        }
        return;
    }

    if (!tabela) {
        console.error('Elemento tbody com id "listaPagar" não encontrado.');
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
        const periodo = formatarMesReferencia(filtroMes.value);
        if (periodo) {
            query = query
                .gte("vencimento", periodo.inicio)
                .lt("vencimento", periodo.fim);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erro ao carregar contas:", error);
        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;color:#f87171;padding:20px;">
                    Erro ao carregar contas.
                </td>
            </tr>
        `;
        return;
    }

    tabela.innerHTML = "";

    if (!data || data.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">
                    Nenhum lançamento encontrado.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((l) => {
        const tipo = l.tipo || "SAIDA";

        let entrada = "-";
        let saida = "-";

        if (tipo === "ENTRADA") {
            entrada = `<span class="valor-entrada">${moeda(l.valor)}</span>`;
        } else {
            saida = `<span class="valor-saida">${moeda(l.valor)}</span>`;
        }

        const banco = l.bancos?.nome || "-";
        const status = l.status || "-";

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatarDataBR(l.vencimento)}</td>
            <td>${banco}</td>
            <td>${l.descricao || "-"}</td>
            <td>${entrada}</td>
            <td>${saida}</td>
            <td>${status}</td>
            <td>
                ${
                    status !== "PAGO"
                        ? `<button onclick="marcarPago(${l.id})" style="background:#22c55e;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:700;">Pagar</button>`
                        : `<span style="color:#22c55e;font-weight:700;">Pago</span>`
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
    if (!supabase) {
        console.error("window.supabaseClient não está definido.");
        return;
    }

    const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (error) {
        console.error("Erro ao marcar como pago:", error);
        alert("Erro ao marcar conta como paga.");
        return;
    }

    await carregarContas();
}

window.marcarPago = marcarPago;

/* =========================
LIMPAR FILTROS
========================= */

function limparFiltros() {
    if (filtroBanco) filtroBanco.value = "";
    if (filtroData) filtroData.value = "";
    if (filtroMes) filtroMes.value = "";
    if (filtroStatus) filtroStatus.value = "ABERTO";
    if (filtroTipo) filtroTipo.value = "TODOS";

    carregarContas();
}

/* =========================
EVENTOS
========================= */

if (filtroBanco) filtroBanco.onchange = carregarContas;
if (filtroStatus) filtroStatus.onchange = carregarContas;
if (filtroTipo) filtroTipo.onchange = carregarContas;

if (btnFiltrar) {
    btnFiltrar.onclick = carregarContas;
}

if (btnLimparFiltros) {
    btnLimparFiltros.onclick = limparFiltros;
}

if (btnTransferir) {
    btnTransferir.onclick = () => {
        window.location.href = "/transferencias";
    };
}

if (btnNovoPagar) {
    btnNovoPagar.onclick = () => {
        window.location.href = "/contas_pagar_novo";
    };
}

if (btnNfEntrada) {
    btnNfEntrada.onclick = () => {
        window.location.href = "/nf_entrada";
    };
}

/* =========================
INIT
========================= */

async function init() {
    if (!supabase) {
        console.error("window.supabaseClient não encontrado.");
        if (tabela) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;color:#f87171;padding:20px;">
                        Supabase não inicializado.
                    </td>
                </tr>
            `;
        }
        return;
    }

    await carregarBancos();
    await carregarContas();
}

init();
