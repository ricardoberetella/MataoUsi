import { supabase, verificarLogin } from "./auth.js";

const listaPagar = document.getElementById("listaPagar");
const cardsBancos = document.getElementById("cardsBancos");

const filtroBanco = document.getElementById("filtroBanco");
const filtroData = document.getElementById("filtroData");
const filtroMes = document.getElementById("filtroMes");
const filtroStatus = document.getElementById("filtroStatus");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpar = document.getElementById("btnLimparFiltros");

const btnNovo = document.getElementById("btnNovoPagar");
const btnTransferir = document.getElementById("btnTransferir");
const btnNfEntrada = document.getElementById("btnNfEntrada");

const modalLancamento = document.getElementById("modalLancamento");
const btnSalvarModal = document.getElementById("btnSalvarModal");
const btnFecharModal = document.getElementById("btnFecharModal");
const tituloModalLancamento = document.getElementById("tituloModalLancamento");

const modalNfEntrada = document.getElementById("modalNfEntrada");
const btnSalvarNfEntrada = document.getElementById("btnSalvarNfEntrada");
const btnFecharNfEntrada = document.getElementById("btnFecharNfEntrada");
const nf_descricao = document.getElementById("nf_descricao");
const nf_valor = document.getElementById("nf_valor");
const nf_data = document.getElementById("nf_data");
const nf_banco = document.getElementById("nf_banco");

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

let bancos = [];
let bancosLancamento = [];
let bancosTransferencia = [];
let roleUsuario = "admin";
let contaEditandoId = null;

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

function formatarValorInput(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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

function normalizarRole(role) {
    return String(role || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function ehVisualizador() {
    const role = normalizarRole(roleUsuario);
    return role === "viewer" || role === "visualizador";
}

function aplicarPermissoesUI() {
    const ocultar = ehVisualizador();

    if (btnTransferir) btnTransferir.style.display = ocultar ? "none" : "inline-flex";
    if (btnNovo) btnNovo.style.display = ocultar ? "none" : "inline-flex";
    if (btnNfEntrada) btnNfEntrada.style.display = ocultar ? "none" : "inline-flex";
}

async function carregarRoleUsuario() {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        const possiveisRoles = [
            localStorage.getItem("role"),
            localStorage.getItem("user_role"),
            localStorage.getItem("perfil"),
            localStorage.getItem("tipo_usuario"),
            user?.user_metadata?.role,
            user?.user_metadata?.perfil,
            user?.app_metadata?.role
        ];

        for (const item of possiveisRoles) {
            const role = normalizarRole(item);
            if (role) {
                roleUsuario = role;
                aplicarPermissoesUI();
                return;
            }
        }

        roleUsuario = "admin";
        aplicarPermissoesUI();
    } catch (erro) {
        console.error("Erro ao carregar role do usuário:", erro);
        roleUsuario = "admin";
        aplicarPermissoesUI();
    }
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

function limparModalLancamento() {
    contaEditandoId = null;
    tituloModalLancamento.textContent = "Novo Lançamento Manual";
    m_descricao.value = "";
    m_valor.value = "";
    m_data.value = "";
    m_banco.value = "";
}

function limparModalNfEntrada() {
    nf_descricao.value = "";
    nf_valor.value = "";
    nf_data.value = "";
    nf_banco.value = "";
}

function abrirModalNovo() {
    limparModalLancamento();
    modalLancamento.style.display = "flex";
}

async function abrirModalEditar(id) {
    if (ehVisualizador()) return;

    const { data, error } = await supabase
        .from("contas_pagar")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        console.error("Erro ao carregar conta para edição:", error);
        alert("Erro ao carregar conta para edição.");
        return;
    }

    contaEditandoId = id;
    tituloModalLancamento.textContent = "Editar Lançamento";
    m_descricao.value = data.descricao || "";
    m_valor.value = formatarValorInput(data.valor || 0);
    m_data.value = data.vencimento || "";
    m_banco.value = data.banco_id || "";
    modalLancamento.style.display = "flex";
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
    preencherSelect(nf_banco, bancosTransferencia, "Selecione o Banco...");
    preencherSelect(t_origem, bancosTransferencia, "Origem...");
    preencherSelect(t_destino, bancosTransferencia, "Destino...");

    renderCards();
}

async function carregarContas() {
    let query = supabase
        .from("contas_pagar")
        .select("*")
        .order("vencimento", { ascending: true });

    if (filtroBanco.value) query = query.eq("banco_id", filtroBanco.value);
    if (filtroData.value) query = query.eq("vencimento", filtroData.value);

    if (filtroMes.value) {
        const faixa = getFaixaMes(filtroMes.value);
        if (faixa) query = query.gte("vencimento", faixa.inicio).lte("vencimento", faixa.fim);
    }

    if (filtroStatus.value && filtroStatus.value !== "TODOS") {
        query = query.eq("status", filtroStatus.value);
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
        const statusAtual = String(l.status || "ABERTO").toUpperCase();

        let acoes = "-";

        if (!ehVisualizador()) {
            const botoes = [];

            if (statusAtual !== "PAGO") {
                botoes.push(`
                    <button onclick="pagar('${l.id}')" class="btn-tabela" style="background:#10b981;">Pagar</button>
                `);
            } else {
                botoes.push(`
                    <button onclick="reabrirConta('${l.id}')" class="btn-tabela" style="background:#3b82f6;">Reabrir</button>
                `);
            }

            botoes.push(`
                <button onclick="editarConta('${l.id}')" class="btn-tabela" style="background:#f59e0b;">Editar</button>
            `);

            botoes.push(`
                <button onclick="excluirConta('${l.id}')" class="btn-tabela" style="background:#ef4444;">Excluir</button>
            `);

            acoes = `<div class="acoes-tabela">${botoes.join("")}</div>`;
        }

        return `
            <tr>
                <td>${formatarDataBR(l.vencimento)}</td>
                <td>${banco?.nome || "-"}</td>
                <td>${moeda(l.valor)}</td>
                <td>${l.descricao || "-"}</td>
                <td>${statusAtual}</td>
                <td>${acoes}</td>
            </tr>
        `;
    }).join("");
}

window.editarConta = async (id) => {
    await abrirModalEditar(id);
};

window.pagar = async (id) => {
    if (ehVisualizador()) return;

    const confirmar = window.confirm("Confirmar pagamento desta conta?");
    if (!confirmar) return;

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

window.reabrirConta = async (id) => {
    if (ehVisualizador()) return;

    const confirmar = window.confirm("Reabrir esta conta paga?");
    if (!confirmar) return;

    const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "ABERTO" })
        .eq("id", id);

    if (error) {
        console.error("Erro ao reabrir conta:", error);
        alert("Erro ao reabrir conta.");
        return;
    }

    await carregarContas();
};

window.excluirConta = async (id) => {
    if (ehVisualizador()) return;

    const confirmar = window.confirm("Deseja realmente excluir esta conta?");
    if (!confirmar) return;

    const { error } = await supabase
        .from("contas_pagar")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Erro ao excluir conta:", error);
        alert("Erro ao excluir conta.");
        return;
    }

    await carregarContas();
};

async function salvarConta() {
    if (ehVisualizador()) return;

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

    if (contaEditandoId) {
        const { error } = await supabase
            .from("contas_pagar")
            .update({
                descricao,
                valor,
                vencimento,
                banco_id
            })
            .eq("id", contaEditandoId);

        if (error) {
            console.error("Erro ao editar conta:", error);
            alert("Erro ao editar lançamento.");
            return;
        }
    } else {
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
    }

    modalLancamento.style.display = "none";
    limparModalLancamento();
    await carregarContas();
}

async function salvarNfEntrada() {
    if (ehVisualizador()) return;

    const descricao = nf_descricao.value.trim();
    const valor = parseValor(nf_valor.value);
    const dataRecebimento = nf_data.value;
    const bancoId = nf_banco.value;

    if (!descricao) {
        alert("Informe a descrição / NF.");
        return;
    }

    if (!valor || valor <= 0) {
        alert("Informe um valor válido.");
        return;
    }

    if (!dataRecebimento) {
        alert("Informe a data.");
        return;
    }

    if (!bancoId) {
        alert("Selecione o banco.");
        return;
    }

    const banco = bancos.find((b) => b.id === bancoId);
    if (!banco) {
        alert("Banco não encontrado.");
        return;
    }

    const saldoAtual = Number(banco.saldo || 0);
    const novoSaldo = saldoAtual + valor;

    const { error: erroBanco } = await supabase
        .from("bancos")
        .update({ saldo: novoSaldo })
        .eq("id", bancoId);

    if (erroBanco) {
        console.error("Erro ao atualizar saldo do banco:", erroBanco);
        alert("Erro ao somar valor no banco.");
        return;
    }

    const { error: erroReceber } = await supabase
        .from("contas_receber_manual")
        .insert({
            descricao,
            valor,
            data_recebimento: dataRecebimento,
            banco_id: bancoId
        });

    if (erroReceber) {
        console.error("Erro ao salvar NF entrada:", erroReceber);
        alert("Erro ao gravar NF Entrada.");
        return;
    }

    modalNfEntrada.style.display = "none";
    limparModalNfEntrada();
    await carregarBancos();
}

async function transferir() {
    if (ehVisualizador()) return;

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

    const { data, error } = await supabase
        .from("transferencias_bancarias")
        .select("*")
        .order("data_transferencia", { ascending: false });

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
    filtroStatus.value = "ABERTO";
    carregarContas();
};

btnNovo.onclick = () => {
    if (ehVisualizador()) return;
    abrirModalNovo();
};

btnNfEntrada.onclick = () => {
    if (ehVisualizador()) return;
    limparModalNfEntrada();
    nf_data.value = new Date().toISOString().slice(0, 10);
    modalNfEntrada.style.display = "flex";
};

btnFecharModal.onclick = () => {
    modalLancamento.style.display = "none";
    limparModalLancamento();
};

btnSalvarModal.onclick = salvarConta;

btnFecharNfEntrada.onclick = () => {
    modalNfEntrada.style.display = "none";
    limparModalNfEntrada();
};

btnSalvarNfEntrada.onclick = salvarNfEntrada;

btnTransferir.onclick = async () => {
    if (ehVisualizador()) return;
    modalTransferencia.style.display = "flex";
    t_data.value = new Date().toISOString().slice(0, 10);
    await carregarTransferencias();
};

btnFecharTransferencia.onclick = () => {
    modalTransferencia.style.display = "none";
};

btnSalvarTransferencia.onclick = transferir;

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    await carregarRoleUsuario();
    await carregarBancos();
    filtroStatus.value = "ABERTO";
    await carregarContas();
});
