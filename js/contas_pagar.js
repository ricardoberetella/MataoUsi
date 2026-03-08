import { supabase, verificarLogin } from "./auth.js";

const listaPagar = document.getElementById("listaPagar");
const cardsBancos = document.getElementById("cardsBancos");
const filtroDataAte = document.getElementById("filtroDataAte");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnNovoPagar = document.getElementById("btnNovoPagar");
const btnTransferir = document.getElementById("btnTransferir");

const modalLancamento = document.getElementById("modalLancamento");
const btnSalvarModal = document.getElementById("btnSalvarModal");
const btnFecharModal = document.getElementById("btnFecharModal");

const m_descricao = document.getElementById("m_descricao");
const m_valor = document.getElementById("m_valor");
const m_data = document.getElementById("m_data");
const m_banco = document.getElementById("m_banco");

let bancosCache = [];

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    const p = dataISO.split("-");
    return `${p[2]}/${p[1]}/${p[0]}`;
}

function parseValorBR(valor) {
    if (!valor) return 0;

    return Number(
        String(valor)
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "")
    ) || 0;
}

function abrirModal() {
    modalLancamento.style.display = "flex";
}

function fecharModal() {
    modalLancamento.style.display = "none";

    m_descricao.value = "";
    m_valor.value = "";
    m_data.value = "";
    m_banco.value = "";
}

async function carregarBancos() {

    m_banco.innerHTML = `<option>Carregando bancos...</option>`;

    const { data, error } = await supabase
        .from("bancos")
        .select("*");

    if (error) {
        console.error("Erro bancos:", error);
        m_banco.innerHTML = `<option>Erro ao carregar</option>`;
        return;
    }

    const todosBancos = data || [];

    bancosCache = todosBancos.filter(banco => {

        const nome = String(banco.nome || "")
            .trim()
            .toUpperCase();

        return nome.includes("SICOOB") || nome.includes("CAIXA");
    });

    m_banco.innerHTML = `<option value="">Selecione o Banco...</option>`;

    if (!bancosCache.length) {

        m_banco.innerHTML = `<option value="">Nenhum banco encontrado</option>`;
        return;
    }

    bancosCache.forEach(banco => {

        const option = document.createElement("option");

        option.value = banco.id;
        option.textContent = banco.nome;

        m_banco.appendChild(option);
    });

    cardsBancos.innerHTML = "";

    bancosCache.forEach(banco => {

        const card = document.createElement("div");

        card.style.flex = "1";
        card.style.minWidth = "220px";
        card.style.background = "rgba(30, 41, 59, 0.75)";
        card.style.border = "1px solid rgba(56, 189, 248, 0.25)";
        card.style.borderRadius = "12px";
        card.style.padding = "16px";

        card.innerHTML = `
            <div style="color:#38bdf8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                ${banco.nome}
            </div>

            <div style="color:white;font-size:24px;font-weight:bold;">
                ${formatarMoeda(banco.saldo)}
            </div>
        `;

        cardsBancos.appendChild(card);
    });
}

async function carregarContasPagar() {

    let query = supabase
        .from("contas_pagar")
        .select("*")
        .order("vencimento", { ascending: true });

    if (filtroDataAte.value) {
        query = query.lte("vencimento", filtroDataAte.value);
    }

    const { data, error } = await query;

    if (error) {

        console.error(error);

        listaPagar.innerHTML = `
        <tr>
        <td colspan="6">Erro ao carregar contas</td>
        </tr>`;

        return;
    }

    const registros = data || [];

    if (!registros.length) {

        listaPagar.innerHTML = `
        <tr>
        <td colspan="6">Nenhum lançamento encontrado</td>
        </tr>`;

        return;
    }

    listaPagar.innerHTML = registros.map(item => {

        const banco = bancosCache.find(b => b.id === item.banco_id);

        const bancoNome = banco ? banco.nome : "—";

        return `
        <tr>
            <td>${item.descricao}</td>
            <td>${bancoNome}</td>
            <td>${formatarMoeda(item.valor)}</td>
            <td>${formatarDataBR(item.vencimento)}</td>
            <td>${item.status}</td>
            <td>-</td>
        </tr>
        `;
    }).join("");
}

async function salvarLancamento() {

    const descricao = m_descricao.value.trim();
    const valor = parseValorBR(m_valor.value);
    const vencimento = m_data.value;
    const banco_id = m_banco.value;

    if (!descricao) {
        alert("Informe a descrição");
        return;
    }

    if (!valor) {
        alert("Informe o valor");
        return;
    }

    if (!vencimento) {
        alert("Informe a data");
        return;
    }

    if (!banco_id) {
        alert("Selecione o banco");
        return;
    }

    const { error } = await supabase
        .from("contas_pagar")
        .insert([{
            descricao,
            valor,
            vencimento,
            banco_id,
            status: "ABERTO"
        }]);

    if (error) {

        console.error(error);
        alert("Erro ao salvar");

        return;
    }

    fecharModal();

    await carregarContasPagar();
}

document.addEventListener("DOMContentLoaded", async () => {

    await verificarLogin();

    await carregarBancos();

    await carregarContasPagar();
});

btnNovoPagar?.addEventListener("click", abrirModal);
btnFecharModal?.addEventListener("click", fecharModal);
btnSalvarModal?.addEventListener("click", salvarLancamento);
btnFiltrar?.addEventListener("click", carregarContasPagar);

modalLancamento?.addEventListener("click", e => {
    if (e.target === modalLancamento) {
        fecharModal();
    }
});
