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
    const numero = Number(valor || 0);
    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    const partes = String(dataISO).split("-");
    if (partes.length !== 3) return dataISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
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

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function abrirModal() {
    if (modalLancamento) modalLancamento.style.display = "flex";
}

function fecharModal() {
    if (modalLancamento) modalLancamento.style.display = "none";
    if (m_descricao) m_descricao.value = "";
    if (m_valor) m_valor.value = "";
    if (m_data) m_data.value = "";
    if (m_banco) m_banco.value = "";
}

async function carregarBancos() {
    try {
        m_banco.innerHTML = `<option value="">Carregando bancos...</option>`;

        const { data, error } = await supabase
            .from("bancos")
            .select("id, nome, saldo")
            .order("nome", { ascending: true });

        if (error) {
            console.error("Erro ao carregar bancos:", error);
            m_banco.innerHTML = `<option value="">Erro ao carregar bancos</option>`;
            return;
        }

        const todosBancos = data || [];

        console.log("BANCOS ENCONTRADOS:", todosBancos);

        bancosCache = todosBancos.filter((banco) => {
            const nome = normalizarTexto(banco.nome);
            return nome === "SICOOB" || nome === "CAIXA FEDERAL";
        });

        console.log("BANCOS FILTRADOS:", bancosCache);

        m_banco.innerHTML = `<option value="">Selecione o Banco...</option>`;

        if (!bancosCache.length) {
            m_banco.innerHTML = `<option value="">Nenhum banco encontrado</option>`;
        } else {
            bancosCache.forEach((banco) => {
                const option = document.createElement("option");
                option.value = banco.id;
                option.textContent = banco.nome;
                m_banco.appendChild(option);
            });
        }

        if (cardsBancos) {
            cardsBancos.innerHTML = "";

            bancosCache.forEach((banco) => {
                const card = document.createElement("div");
                card.style.flex = "1";
                card.style.minWidth = "220px";
                card.style.background = "rgba(30, 41, 59, 0.75)";
                card.style.border = "1px solid rgba(56, 189, 248, 0.25)";
                card.style.borderRadius = "12px";
                card.style.padding = "16px";
                card.innerHTML = `
                    <div style="color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
                        ${banco.nome}
                    </div>
                    <div style="color:white; font-size:24px; font-weight:bold;">
                        ${formatarMoeda(banco.saldo)}
                    </div>
                `;
                cardsBancos.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Falha geral ao carregar bancos:", err);
        m_banco.innerHTML = `<option value="">Erro inesperado</option>`;
    }
}

async function carregarContasPagar() {
    try {
        let query = supabase
            .from("contas_pagar")
            .select(`
                id,
                descricao,
                valor,
                vencimento,
                status,
                banco_id
            `)
            .order("vencimento", { ascending: true });

        if (filtroDataAte?.value) {
            query = query.lte("vencimento", filtroDataAte.value);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Erro ao carregar contas a pagar:", error);
            listaPagar.innerHTML = `
                <tr>
                    <td colspan="6" style="padding:20px; color:#f87171;">
                        Erro ao carregar contas a pagar.
                    </td>
                </tr>
            `;
            return;
        }

        const registros = data || [];

        if (!registros.length) {
            listaPagar.innerHTML = `
                <tr>
                    <td colspan="6" style="padding:20px; color:#94a3b8;">
                        Nenhum lançamento encontrado.
                    </td>
                </tr>
            `;
            return;
        }

        listaPagar.innerHTML = registros.map((item) => {
            const banco = bancosCache.find(b => b.id === item.banco_id);
            const bancoNome = banco?.nome || "—";
            const status = item.status || "ABERTO";

            return `
                <tr style="border-bottom:1px solid rgba(148,163,184,0.15);">
                    <td style="padding:12px;">${item.descricao || "—"}</td>
                    <td style="padding:12px;">${bancoNome}</td>
                    <td style="padding:12px;">${formatarMoeda(item.valor)}</td>
                    <td style="padding:12px;">${formatarDataBR(item.vencimento)}</td>
                    <td style="padding:12px;">${status}</td>
                    <td style="padding:12px;">—</td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        console.error("Falha geral ao carregar contas a pagar:", err);
        listaPagar.innerHTML = `
            <tr>
                <td colspan="6" style="padding:20px; color:#f87171;">
                    Erro inesperado ao carregar contas.
                </td>
            </tr>
        `;
    }
}

async function salvarLancamento() {
    try {
        const descricao = m_descricao?.value.trim();
        const valor = parseValorBR(m_valor?.value);
        const vencimento = m_data?.value;
        const banco_id = m_banco?.value;

        if (!descricao) {
            alert("Preencha a descrição.");
            return;
        }

        if (!valor || valor <= 0) {
            alert("Preencha um valor válido.");
            return;
        }

        if (!vencimento) {
            alert("Preencha a data de vencimento.");
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
                status: "ABERTO",
                banco_id
            }]);

        if (error) {
            console.error("Erro ao salvar lançamento:", error);
            alert("Erro ao salvar lançamento: " + error.message);
            return;
        }

        fecharModal();
        await carregarContasPagar();
    } catch (err) {
        console.error("Falha geral ao salvar lançamento:", err);
        alert("Erro inesperado ao salvar lançamento.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await verificarLogin();
        await carregarBancos();
        await carregarContasPagar();
    } catch (err) {
        console.error("Erro ao iniciar página:", err);
    }
});

btnFiltrar?.addEventListener("click", carregarContasPagar);
btnNovoPagar?.addEventListener("click", abrirModal);
btnFecharModal?.addEventListener("click", fecharModal);
btnSalvarModal?.addEventListener("click", salvarLancamento);

btnTransferir?.addEventListener("click", () => {
    alert("Tela de transferências ainda será implementada.");
});

modalLancamento?.addEventListener("click", (e) => {
    if (e.target === modalLancamento) {
        fecharModal();
    }
});
