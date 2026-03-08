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
    const [ano, mes, dia] = String(dataISO).split("-");
    if (!ano || !mes || !dia) return dataISO;
    return `${dia}/${mes}/${ano}`;
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
    m_banco.innerHTML = `<option value="">Carregando bancos...</option>`;
    cardsBancos.innerHTML = "";

    const { data, error } = await supabase
        .from("bancos")
        .select("id, nome, saldo")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao carregar bancos:", error);
        m_banco.innerHTML = `<option value="">Erro ao carregar bancos</option>`;
        return;
    }

    bancosCache = (data || []).filter((banco) => {
        const nome = String(banco.nome || "").trim().toUpperCase();
        return nome === "SICOOB" || nome === "CAIXA FEDERAL";
    });

    if (!bancosCache.length) {
        m_banco.innerHTML = `<option value="">Nenhum banco encontrado</option>`;
        return;
    }

    m_banco.innerHTML = `<option value="">Selecione o Banco...</option>`;

    bancosCache.forEach((banco) => {
        const option = document.createElement("option");
        option.value = banco.id;
        option.textContent = banco.nome;
        m_banco.appendChild(option);
    });

    bancosCache.forEach((banco) => {
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
        .select("id, descricao, valor, vencimento, status, banco_id")
        .order("vencimento", { ascending: true });

    if (filtroDataAte.value) {
        query = query.lte("vencimento", filtroDataAte.value);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erro ao carregar contas:", error);
        listaPagar.innerHTML = `
            <tr>
                <td colspan="6" style="padding:12px;">Erro ao carregar contas</td>
            </tr>
        `;
        return;
    }

    const registros = data || [];

    if (!registros.length) {
        listaPagar.innerHTML = `
            <tr>
                <td colspan="6" style="padding:12px;">Nenhum lançamento encontrado</td>
            </tr>
        `;
        return;
    }

    listaPagar.innerHTML = registros.map((item) => {
        const banco = bancosCache.find((b) => b.id === item.banco_id);
        const bancoNome = banco ? banco.nome : "—";
        const status = item.status || "ABERTO";
        const statusUpper = String(status).toUpperCase();

        let acoesHtml = "-";

        if (statusUpper !== "PAGO") {
            acoesHtml = `
                <button
                    class="btn-pagar-conta"
                    data-id="${item.id}"
                    style="
                        background:#10b981;
                        color:#fff;
                        border:none;
                        border-radius:8px;
                        padding:8px 14px;
                        cursor:pointer;
                        font-weight:bold;
                    "
                >
                    Pagar
                </button>
            `;
        }

        return `
            <tr>
                <td style="padding:12px;">${item.descricao || "—"}</td>
                <td style="padding:12px;">${bancoNome}</td>
                <td style="padding:12px;">${formatarMoeda(item.valor)}</td>
                <td style="padding:12px;">${formatarDataBR(item.vencimento)}</td>
                <td style="padding:12px;">${statusUpper}</td>
                <td style="padding:12px;">${acoesHtml}</td>
            </tr>
        `;
    }).join("");

    document.querySelectorAll(".btn-pagar-conta").forEach((botao) => {
        botao.addEventListener("click", async () => {
            const contaId = botao.dataset.id;
            await pagarConta(contaId);
        });
    });
}

async function salvarLancamento() {
    const descricao = m_descricao.value.trim();
    const valor = parseValorBR(m_valor.value);
    const vencimento = m_data.value;
    const banco_id = m_banco.value;

    if (!descricao) {
        alert("Informe a descrição.");
        return;
    }

    if (!valor || valor <= 0) {
        alert("Informe um valor válido.");
        return;
    }

    if (!vencimento) {
        alert("Informe a data de vencimento.");
        return;
    }

    if (!banco_id) {
        alert("Selecione o banco.");
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
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar lançamento.");
        return;
    }

    fecharModal();
    await carregarContasPagar();
}

async function pagarConta(contaId) {
    const confirmar = window.confirm("Confirmar pagamento desta conta?");
    if (!confirmar) return;

    const { data: conta, error: erroConta } = await supabase
        .from("contas_pagar")
        .select("id, valor, status, banco_id, descricao")
        .eq("id", contaId)
        .single();

    if (erroConta || !conta) {
        console.error("Erro ao buscar conta:", erroConta);
        alert("Erro ao localizar a conta.");
        return;
    }

    const statusAtual = String(conta.status || "").toUpperCase();
    if (statusAtual === "PAGO") {
        alert("Esta conta já está paga.");
        return;
    }

    const valorConta = Number(conta.valor || 0);
    const bancoId = conta.banco_id;

    if (!bancoId) {
        alert("Esta conta não possui banco vinculado.");
        return;
    }

    const { data: banco, error: erroBanco } = await supabase
        .from("bancos")
        .select("id, nome, saldo")
        .eq("id", bancoId)
        .single();

    if (erroBanco || !banco) {
        console.error("Erro ao buscar banco:", erroBanco);
        alert("Erro ao localizar o banco da conta.");
        return;
    }

    const saldoAtual = Number(banco.saldo || 0);
    const novoSaldo = saldoAtual - valorConta;

    const { error: erroUpdateBanco } = await supabase
        .from("bancos")
        .update({ saldo: novoSaldo })
        .eq("id", bancoId);

    if (erroUpdateBanco) {
        console.error("Erro ao atualizar banco:", erroUpdateBanco);
        alert("Erro ao baixar valor do banco.");
        return;
    }

    const { error: erroUpdateConta } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", contaId);

    if (erroUpdateConta) {
        console.error("Erro ao atualizar conta:", erroUpdateConta);

        await supabase
            .from("bancos")
            .update({ saldo: saldoAtual })
            .eq("id", bancoId);

        alert("Erro ao marcar conta como paga.");
        return;
    }

    await carregarBancos();
    await carregarContasPagar();

    alert(`Conta paga com sucesso.\nBanco: ${banco.nome}\nValor: ${formatarMoeda(valorConta)}`);
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

btnTransferir?.addEventListener("click", () => {
    alert("Tela de transferências ainda será implementada.");
});

modalLancamento?.addEventListener("click", (e) => {
    if (e.target === modalLancamento) {
        fecharModal();
    }
});
