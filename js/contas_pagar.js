import { supabase, verificarLogin } from "./auth.js";

const listaPagar = document.getElementById("listaPagar");
const cardsBancos = document.getElementById("cardsBancos");

const filtroBanco = document.getElementById("filtroBanco");
const filtroData = document.getElementById("filtroData");
const filtroMes = document.getElementById("filtroMes");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpar = document.getElementById("btnLimparFiltros");

const btnNovo = document.getElementById("btnNovoPagar");
const btnTransferir = document.getElementById("btnTransferir");

const modalLancamento = document.getElementById("modalLancamento");
const btnSalvarModal = document.getElementById("btnSalvarModal");
const btnFecharModal = document.getElementById("btnFecharModal");

const modalTransferencia = document.getElementById("modalTransferencia");
const btnSalvarTransferencia = document.getElementById("btnSalvarTransferencia");
const btnFecharTransferencia = document.getElementById("btnFecharTransferencia");

const m_descricao = document.getElementById("m_descricao");
const m_valor = document.getElementById("m_valor");
const m_data = document.getElementById("m_data");
const m_banco = document.getElementById("m_banco");

const t_origem = document.getElementById("t_origem");
const t_destino = document.getElementById("t_destino");
const t_valor = document.getElementById("t_valor");
const t_data = document.getElementById("t_data");
const t_obs = document.getElementById("t_obs");

const listaTransferencias = document.getElementById("listaTransferencias");
const tfFiltroData = document.getElementById("tfFiltroData");
const tfFiltroMes = document.getElementById("tfFiltroMes");
const btnFiltrarTransferencias = document.getElementById("btnFiltrarTransferencias");
const btnLimparTransferencias = document.getElementById("btnLimparTransferencias");

let bancos = [];
let bancosLancamento = [];
let bancosTransferencia = [];

function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function parseValor(v) {
    return Number(
        String(v || "")
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "")
    ) || 0;
}

function formatarDataBR(d) {
    if (!d) return "-";
    const partes = String(d).split("-");
    if (partes.length !== 3) return d;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function getFaixaMes(valorMes) {
    if (!valorMes) return null;
    const [ano, mes] = valorMes.split("-");
    if (!ano || !mes) return null;

    const inicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    const fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

    return { inicio, fim };
}

function normalizarNomeBanco(nome) {
    return String(nome || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function preencherSelect(select, itens, placeholder) {
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;

    itens.forEach((banco) => {
        const option = document.createElement("option");
        option.value = banco.id;
        option.textContent = banco.nome;
        select.appendChild(option);
    });
}

function renderCards() {
    cardsBancos.innerHTML = "";

    bancos.forEach((b) => {
        const card = document.createElement("div");
        card.style.flex = "1";
        card.style.minWidth = "220px";
        card.style.background = "rgba(30,41,59,.7)";
        card.style.padding = "15px";
        card.style.borderRadius = "12px";
        card.style.border = "1px solid rgba(56,189,248,.25)";

        card.innerHTML = `
            <div style="color:#38bdf8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                ${b.nome}
            </div>
            <div style="font-size:24px;font-weight:bold;color:#fff;">
                ${moeda(b.saldo)}
            </div>
        `;

        cardsBancos.appendChild(card);
    });
}

async function carregarBancos() {
    const { data, error } = await supabase
        .from("bancos")
        .select("*")
        .order("nome");

    if (error) {
        console.error("Erro ao carregar bancos:", error);
        return;
    }

    bancos = data || [];

    bancosLancamento = bancos.filter((b) => {
        const nome = normalizarNomeBanco(b.nome);
        return nome === "SICOOB" || nome === "CAIXA FEDERAL";
    });

    bancosTransferencia = bancos.filter((b) => {
        const nome = normalizarNomeBanco(b.nome);
        return nome === "SICOOB" || nome === "CAIXA FEDERAL" || nome === "APLICACAO";
    });

    filtroBanco.innerHTML = `<option value="">Todos</option>`;
    bancosLancamento.forEach((b) => {
        const option = document.createElement("option");
        option.value = b.id;
        option.textContent = b.nome;
        filtroBanco.appendChild(option);
    });

    preencherSelect(m_banco, bancosLancamento, "Selecione o Banco...");
    preencherSelect(t_origem, bancosTransferencia, "Origem...");
    preencherSelect(t_destino, bancosTransferencia, "Destino...");

    renderCards();
}

async function carregarContas() {
    let query = supabase
        .from("contas_pagar")
        .select("*")
        .order("vencimento", { ascending: true });

    if (filtroBanco.value) {
        query = query.eq("banco_id", filtroBanco.value);
    }

    if (filtroData.value) {
        query = query.eq("vencimento", filtroData.value);
    }

    if (filtroMes.value) {
        const faixa = getFaixaMes(filtroMes.value);
        if (faixa) {
            query = query.gte("vencimento", faixa.inicio).lte("vencimento", faixa.fim);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erro ao carregar contas:", error);
        listaPagar.innerHTML = `<tr><td colspan="6">Erro ao carregar contas</td></tr>`;
        return;
    }

    if (!data || !data.length) {
        listaPagar.innerHTML = `<tr><td colspan="6">Nenhum lançamento encontrado</td></tr>`;
        return;
    }

    listaPagar.innerHTML = data.map((l) => {
        const banco = bancos.find((b) => b.id === l.banco_id);

        let botao = "-";
        if (String(l.status || "").toUpperCase() !== "PAGO") {
            botao = `<button onclick="pagar('${l.id}')" style="background:#10b981;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:bold;">Pagar</button>`;
        }

        return `
            <tr>
                <td>${l.descricao || "-"}</td>
                <td>${banco?.nome || "-"}</td>
                <td>${moeda(l.valor)}</td>
                <td>${formatarDataBR(l.vencimento)}</td>
                <td>${l.status || "ABERTO"}</td>
                <td>${botao}</td>
            </tr>
        `;
    }).join("");
}

window.pagar = async (id) => {
    const { data: conta, error: erroConta } = await supabase
        .from("contas_pagar")
        .select("*")
        .eq("id", id)
        .single();

    if (erroConta || !conta) {
        console.error("Erro ao buscar conta:", erroConta);
        alert("Erro ao localizar conta.");
        return;
    }

    const banco = bancos.find((b) => b.id === conta.banco_id);
    if (!banco) {
        alert("Banco da conta não encontrado.");
        return;
    }

    const novoSaldo = Number(banco.saldo || 0) - Number(conta.valor || 0);

    const { error: erroBanco } = await supabase
        .from("bancos")
        .update({ saldo: novoSaldo })
        .eq("id", banco.id);

    if (erroBanco) {
        console.error("Erro ao atualizar banco:", erroBanco);
        alert("Erro ao baixar saldo do banco.");
        return;
    }

    const { error: erroContaUpdate } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (erroContaUpdate) {
        console.error("Erro ao atualizar conta:", erroContaUpdate);
        alert("Erro ao marcar conta como paga.");
        return;
    }

    await carregarBancos();
    await carregarContas();
};

async function salvarConta() {
    const descricao = m_descricao.value.trim();
    const valor = parseValor(m_valor.value);
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
        alert("Informe a data.");
        return;
    }

    if (!banco_id) {
        alert("Selecione o banco.");
        return;
    }

    const { error } = await supabase
        .from("contas_pagar")
        .insert({
            descricao,
            valor,
            vencimento,
            banco_id,
            status: "ABERTO"
        });

    if (error) {
        console.error("Erro ao salvar conta:", error);
        alert("Erro ao salvar lançamento.");
        return;
    }

    modalLancamento.style.display = "none";
    m_descricao.value = "";
    m_valor.value = "";
    m_data.value = "";
    m_banco.value = "";

    await carregarContas();
}

async function transferir() {
    const origemId = t_origem.value;
    const destinoId = t_destino.value;
    const valor = parseValor(t_valor.value);
    const dataTransferencia = t_data.value;
    const observacao = t_obs.value.trim();

    if (!origemId) {
        alert("Selecione a origem.");
        return;
    }

    if (!destinoId) {
        alert("Selecione o destino.");
        return;
    }

    if (origemId === destinoId) {
        alert("Origem e destino não podem ser iguais.");
        return;
    }

    if (!valor || valor <= 0) {
        alert("Informe um valor válido.");
        return;
    }

    if (!dataTransferencia) {
        alert("Informe a data da transferência.");
        return;
    }

    const origem = bancos.find((b) => b.id === origemId);
    const destino = bancos.find((b) => b.id === destinoId);

    if (!origem || !destino) {
        alert("Banco de origem ou destino não encontrado.");
        return;
    }

    const saldoOrigemAtual = Number(origem.saldo || 0);
    const saldoDestinoAtual = Number(destino.saldo || 0);

    const { error: erroOrigem } = await supabase
        .from("bancos")
        .update({ saldo: saldoOrigemAtual - valor })
        .eq("id", origem.id);

    if (erroOrigem) {
        console.error("Erro ao baixar origem:", erroOrigem);
        alert("Erro ao debitar banco de origem.");
        return;
    }

    const { error: erroDestino } = await supabase
        .from("bancos")
        .update({ saldo: saldoDestinoAtual + valor })
        .eq("id", destino.id);

    if (erroDestino) {
        console.error("Erro ao creditar destino:", erroDestino);
        alert("Erro ao creditar banco de destino.");
        return;
    }

    const { error: erroHistorico } = await supabase
        .from("transferencias_bancarias")
        .insert({
            origem_id: origem.id,
            destino_id: destino.id,
            valor,
            data_transferencia: dataTransferencia,
            observacao
        });

    if (erroHistorico) {
        console.error("Erro ao salvar transferência:", erroHistorico);
        alert("Erro ao gravar histórico da transferência.");
        return;
    }

    modalTransferencia.style.display = "none";
    t_origem.value = "";
    t_destino.value = "";
    t_valor.value = "";
    t_data.value = "";
    t_obs.value = "";

    await carregarBancos();
    await carregarContas();
    await carregarTransferencias();
}

async function carregarTransferencias() {
    if (!listaTransferencias) return;

    let query = supabase
        .from("transferencias_bancarias")
        .select("*")
        .order("data_transferencia", { ascending: false });

    if (tfFiltroData?.value) {
        query = query.eq("data_transferencia", tfFiltroData.value);
    }

    if (tfFiltroMes?.value) {
        const faixa = getFaixaMes(tfFiltroMes.value);
        if (faixa) {
            query = query.gte("data_transferencia", faixa.inicio).lte("data_transferencia", faixa.fim);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erro ao carregar transferências:", error);
        listaTransferencias.innerHTML = `<tr><td colspan="5">Erro ao carregar histórico</td></tr>`;
        return;
    }

    if (!data || !data.length) {
        listaTransferencias.innerHTML = `<tr><td colspan="5">Nenhuma transferência encontrada</td></tr>`;
        return;
    }

    listaTransferencias.innerHTML = data.map((item) => {
        const origem = bancos.find((b) => b.id === item.origem_id);
        const destino = bancos.find((b) => b.id === item.destino_id);

        return `
            <tr>
                <td>${formatarDataBR(item.data_transferencia)}</td>
                <td>${origem?.nome || "-"}</td>
                <td>${destino?.nome || "-"}</td>
                <td>${moeda(item.valor)}</td>
                <td>${item.observacao || "-"}</td>
            </tr>
        `;
    }).join("");
}

btnFiltrar.onclick = carregarContas;

btnLimpar.onclick = () => {
    filtroBanco.value = "";
    filtroData.value = "";
    filtroMes.value = "";
    carregarContas();
};

btnNovo.onclick = () => {
    modalLancamento.style.display = "flex";
};

btnFecharModal.onclick = () => {
    modalLancamento.style.display = "none";
};

btnSalvarModal.onclick = salvarConta;

btnTransferir.onclick = async () => {
    modalTransferencia.style.display = "flex";
    t_data.value = new Date().toISOString().slice(0, 10);
    await carregarTransferencias();
};

btnFecharTransferencia.onclick = () => {
    modalTransferencia.style.display = "none";
};

btnSalvarTransferencia.onclick = transferir;

btnFiltrarTransferencias?.addEventListener("click", carregarTransferencias);

btnLimparTransferencias?.addEventListener("click", () => {
    if (tfFiltroData) tfFiltroData.value = "";
    if (tfFiltroMes) tfFiltroMes.value = "";
    carregarTransferencias();
});

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    await carregarBancos();
    await carregarContas();
});
