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
MODAIS
========================= */

const modalNovoPagar = document.getElementById("modalNovoPagar");
const modalNfEntrada = document.getElementById("modalNfEntrada");

const btnCancelarNovoPagar = document.getElementById("btnCancelarNovoPagar");
const btnSalvarNovoPagar = document.getElementById("btnSalvarNovoPagar");

const btnCancelarNfEntrada = document.getElementById("btnCancelarNfEntrada");
const btnSalvarNfEntrada = document.getElementById("btnSalvarNfEntrada");

const novoBanco = document.getElementById("novoBanco");
const novoDescricao = document.getElementById("novoDescricao");
const novoValor = document.getElementById("novoValor");
const novoVencimento = document.getElementById("novoVencimento");
const novoStatus = document.getElementById("novoStatus");
const novoTipo = document.getElementById("novoTipo");
const msgNovoPagar = document.getElementById("msgNovoPagar");

const nfBanco = document.getElementById("nfBanco");
const nfDescricao = document.getElementById("nfDescricao");
const nfValor = document.getElementById("nfValor");
const nfVencimento = document.getElementById("nfVencimento");
const nfStatus = document.getElementById("nfStatus");
const msgNfEntrada = document.getElementById("msgNfEntrada");

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
    const d = new Date(data + "T00:00:00");
    return d.toLocaleDateString("pt-BR");
}

function moedaParaNumero(valor) {
    if (!valor) return 0;
    return Number(String(valor).replace(/\./g, "").replace(",", "."));
}

function hojeISO() {
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    const d = String(hoje.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/* =========================
MODAIS
========================= */

function abrirModal(modal) {
    if (modal) modal.classList.add("ativo");
}

function fecharModal(modal) {
    if (modal) modal.classList.remove("ativo");
}

function limparModalNovoPagar() {
    if (novoBanco) novoBanco.value = "";
    if (novoDescricao) novoDescricao.value = "";
    if (novoValor) novoValor.value = "";
    if (novoVencimento) novoVencimento.value = hojeISO();
    if (novoStatus) novoStatus.value = "ABERTO";
    if (novoTipo) novoTipo.value = "SAIDA";
    if (msgNovoPagar) msgNovoPagar.textContent = "";
}

function limparModalNfEntrada() {
    if (nfBanco) nfBanco.value = "";
    if (nfDescricao) nfDescricao.value = "NF Entrada";
    if (nfValor) nfValor.value = "";
    if (nfVencimento) nfVencimento.value = hojeISO();
    if (nfStatus) nfStatus.value = "ABERTO";
    if (msgNfEntrada) msgNfEntrada.textContent = "";
}

/* =========================
CARREGAR BANCOS
========================= */

async function carregarBancos() {
    const { data, error } = await supabase
        .from("bancos")
        .select("id, nome")
        .order("nome", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    if (filtroBanco) filtroBanco.innerHTML = `<option value="">Todos</option>`;
    if (novoBanco) novoBanco.innerHTML = `<option value="">Selecione</option>`;
    if (nfBanco) nfBanco.innerHTML = `<option value="">Selecione</option>`;

    (data || []).forEach((b) => {
        if (filtroBanco) {
            const opt1 = document.createElement("option");
            opt1.value = b.id;
            opt1.textContent = b.nome;
            filtroBanco.appendChild(opt1);
        }

        if (novoBanco) {
            const opt2 = document.createElement("option");
            opt2.value = b.id;
            opt2.textContent = b.nome;
            novoBanco.appendChild(opt2);
        }

        if (nfBanco) {
            const opt3 = document.createElement("option");
            opt3.value = b.id;
            opt3.textContent = b.nome;
            nfBanco.appendChild(opt3);
        }
    });
}

/* =========================
CARREGAR CONTAS
========================= */

async function carregarContas() {
    if (!supabase) {
        console.error("window.supabaseClient não encontrado");
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
        const inicio = `${filtroMes.value}-01`;
        const dataFim = new Date(`${filtroMes.value}-01T00:00:00`);
        dataFim.setMonth(dataFim.getMonth() + 1);
        const fim = dataFim.toISOString().slice(0, 10);

        query = query.gte("vencimento", inicio).lt("vencimento", fim);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    tabela.innerHTML = "";

    if (!data || data.length === 0) {
        tabela.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;">Nenhum lançamento encontrado</td></tr>`;
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

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatarDataBR(l.vencimento)}</td>
            <td>${banco}</td>
            <td>${l.descricao || "-"}</td>
            <td>${entrada}</td>
            <td>${saida}</td>
            <td>${l.status || "-"}</td>
            <td>
                ${
                    l.status !== "PAGO"
                    ? `<button onclick="marcarPago(${l.id})" style="background:#22c55e;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:700;">Pagar</button>`
                    : `<span style="color:#22c55e;font-weight:700;">Pago</span>`
                }
            </td>
        `;

        tabela.appendChild(tr);
    });
}

/* =========================
SALVAR LANÇAMENTO
========================= */

async function salvarNovoPagar() {
    const banco_id = novoBanco?.value || null;
    const descricao = novoDescricao?.value?.trim() || "";
    const valor = moedaParaNumero(novoValor?.value);
    const vencimento = novoVencimento?.value || "";
    const status = novoStatus?.value || "ABERTO";
    const tipo = novoTipo?.value || "SAIDA";

    if (!banco_id || !descricao || !valor || !vencimento) {
        if (msgNovoPagar) msgNovoPagar.textContent = "Preencha banco, descrição, valor e vencimento.";
        return;
    }

    if (msgNovoPagar) msgNovoPagar.textContent = "Salvando...";

    const { error } = await supabase
        .from("contas_pagar")
        .insert([{
            banco_id,
            descricao,
            valor,
            vencimento,
            status,
            tipo
        }]);

    if (error) {
        console.error(error);
        if (msgNovoPagar) msgNovoPagar.textContent = "Erro ao salvar lançamento.";
        return;
    }

    fecharModal(modalNovoPagar);
    limparModalNovoPagar();
    await carregarContas();
}

/* =========================
SALVAR NF ENTRADA
========================= */

async function salvarNfEntrada() {
    const banco_id = nfBanco?.value || null;
    const descricao = nfDescricao?.value?.trim() || "NF Entrada";
    const valor = moedaParaNumero(nfValor?.value);
    const vencimento = nfVencimento?.value || "";
    const status = nfStatus?.value || "ABERTO";

    if (!banco_id || !descricao || !valor || !vencimento) {
        if (msgNfEntrada) msgNfEntrada.textContent = "Preencha banco, descrição, valor e data.";
        return;
    }

    if (msgNfEntrada) msgNfEntrada.textContent = "Salvando...";

    const { error } = await supabase
        .from("contas_pagar")
        .insert([{
            banco_id,
            descricao,
            valor,
            vencimento,
            status,
            tipo: "ENTRADA"
        }]);

    if (error) {
        console.error(error);
        if (msgNfEntrada) msgNfEntrada.textContent = "Erro ao salvar NF Entrada.";
        return;
    }

    fecharModal(modalNfEntrada);
    limparModalNfEntrada();
    await carregarContas();
}

/* =========================
MARCAR COMO PAGO
========================= */

async function marcarPago(id) {
    const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (error) {
        console.error(error);
        return;
    }

    await carregarContas();
}

window.marcarPago = marcarPago;

/* =========================
LIMPAR FILTROS
========================= */

function limparFiltros(){
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

if (btnFiltrar) btnFiltrar.onclick = carregarContas;
if (btnLimparFiltros) btnLimparFiltros.onclick = limparFiltros;

if (btnTransferir) {
    btnTransferir.onclick = () => {
        alert("Tela de transferências ainda não foi criada.");
    };
}

if (btnNovoPagar) {
    btnNovoPagar.onclick = () => {
        limparModalNovoPagar();
        abrirModal(modalNovoPagar);
    };
}

if (btnNfEntrada) {
    btnNfEntrada.onclick = () => {
        limparModalNfEntrada();
        abrirModal(modalNfEntrada);
    };
}

if (btnCancelarNovoPagar) {
    btnCancelarNovoPagar.onclick = () => {
        fecharModal(modalNovoPagar);
    };
}

if (btnCancelarNfEntrada) {
    btnCancelarNfEntrada.onclick = () => {
        fecharModal(modalNfEntrada);
    };
}

if (btnSalvarNovoPagar) {
    btnSalvarNovoPagar.onclick = salvarNovoPagar;
}

if (btnSalvarNfEntrada) {
    btnSalvarNfEntrada.onclick = salvarNfEntrada;
}

if (modalNovoPagar) {
    modalNovoPagar.addEventListener("click", (e) => {
        if (e.target === modalNovoPagar) fecharModal(modalNovoPagar);
    });
}

if (modalNfEntrada) {
    modalNfEntrada.addEventListener("click", (e) => {
        if (e.target === modalNfEntrada) fecharModal(modalNfEntrada);
    });
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        fecharModal(modalNovoPagar);
        fecharModal(modalNfEntrada);
    }
});

/* =========================
INIT
========================= */

async function init(){
    if(!supabase){
        console.error("window.supabaseClient não encontrado");
        return;
    }

    await carregarBancos();
    limparModalNovoPagar();
    limparModalNfEntrada();
    await carregarContas();
}

init();
