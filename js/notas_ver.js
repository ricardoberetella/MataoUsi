// ===============================================
// NOTAS_VER.JS — NF + ITENS + BAIXAS + BOLETOS
// (VERSÃO BLINDADA – NÃO DEPENDE DE IDS FIXOS)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let cacheProdutos = [];
let boletoEditandoId = null;

// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    return new Date(dataISO).toLocaleDateString("pt-BR");
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const idUrl = new URLSearchParams(window.location.search).get("id");
    if (!idUrl) {
        alert("NF não encontrada");
        return;
    }

    nfId = Number(idUrl);

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
    await carregarBoletos();

    // 🔒 DELEGAÇÃO GLOBAL (NÃO QUEBRA SE HTML MUDAR)
    document.body.addEventListener("click", tratarCliquesGlobais);
});

// ===============================================
// CLIQUES GLOBAIS (BOLETOS)
// ===============================================
function tratarCliquesGlobais(e) {

    // ➕ INCLUIR BOLETO
    if (e.target.closest("#btnNovoBoleto") || e.target.closest(".btn-novo-boleto")) {
        abrirModalBoleto();
    }

    // ❌ CANCELAR
    if (e.target.closest("#btnCancelarBoleto") || e.target.closest(".btn-cancelar-boleto")) {
        fecharModalBoleto();
    }

    // 💾 SALVAR
    if (e.target.closest("#btnSalvarBoleto") || e.target.closest(".btn-salvar-boleto")) {
        salvarBoleto();
    }
}

// ===============================================
// PRODUTOS (CACHE)
// ===============================================
async function carregarProdutosCache() {
    const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao");

    cacheProdutos = data || [];
}

function nomeProduto(id) {
    const p = cacheProdutos.find(x => x.id === id);
    return p ? `${p.codigo} - ${p.descricao}` : `ID ${id}`;
}

// ===============================================
// DADOS DA NF
// ===============================================
async function carregarDadosNF() {
    const { data, error } = await supabase
        .from("notas_fiscais")
        .select("numero_nf, data_nf, clientes(razao_social)")
        .eq("id", nfId)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    document.getElementById("nfNumero").textContent = data.numero_nf;
    document.getElementById("nfData").textContent = formatarDataBR(data.data_nf);
    document.getElementById("nfCliente").textContent = data.clientes?.razao_social || "—";
}

// ===============================================
// ITENS DA NF
// ===============================================
async function carregarItensNF() {
    const tbody = document.getElementById("listaItens");
    tbody.innerHTML = "";

    const { data } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">Nenhum item</td></tr>`;
        return;
    }

    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td>${nomeProduto(i.produto_id)}</td>
                <td style="text-align:right">${i.quantidade}</td>
            </tr>`;
    });
}

// ===============================================
// BAIXAS
// ===============================================
async function carregarBaixas() {
    const tbody = document.getElementById("listaBaixas");
    tbody.innerHTML = "";

    const { data: baixas } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id, produto_id, quantidade_baixada")
        .eq("nf_id", nfId);

    if (!baixas || baixas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">Nenhuma baixa</td></tr>`;
        return;
    }

    const mapa = {};

    baixas.forEach(b => {
        const key = `${b.pedido_id}-${b.produto_id}`;
        mapa[key] = mapa[key] || { ...b, total: 0 };
        mapa[key].total += b.quantidade_baixada;
    });

    Object.values(mapa).forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.pedido_id}</td>
                <td>${nomeProduto(b.produto_id)}</td>
                <td style="text-align:right">${b.total}</td>
                <td>${b.total > 0 ? "Parcial" : "Pendente"}</td>
            </tr>`;
    });
}

// ===============================================
// BOLETOS
// ===============================================
async function carregarBoletos() {
    const tbody = document.getElementById("listaBoletos");
    tbody.innerHTML = "";

    const { data } = await supabase
        .from("boletos")
        .select("*")
        .eq("nota_fiscal_id", nfId)
        .order("data_vencimento");

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Nenhum boleto</td></tr>`;
        return;
    }

    data.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.tipo_nf === "NF" ? "Com NF" : "Sem NF"}</td>
                <td>${b.origem || "—"}</td>
                <td style="text-align:right">R$ ${Number(b.valor).toFixed(2)}</td>
                <td>${formatarDataBR(b.data_vencimento)}</td>
                <td>
                    <button class="btn-azul" onclick="editarBoleto(${b.id})">Editar</button>
                    <button class="btn-vermelho" onclick="excluirBoleto(${b.id})">Excluir</button>
                </td>
            </tr>`;
    });
}

// ===============================================
// MODAL BOLETO (BUSCA DINÂMICA)
// ===============================================
function abrirModalBoleto() {
    const modal = document.querySelector("[data-modal='boleto']");
    if (!modal) {
        alert("Modal de boleto não encontrado no HTML");
        return;
    }
    boletoEditandoId = null;
    modal.style.display = "flex";
}

function fecharModalBoleto() {
    const modal = document.querySelector("[data-modal='boleto']");
    if (modal) modal.style.display = "none";
}

async function salvarBoleto() {
    const modal = document.querySelector("[data-modal='boleto']");
    if (!modal) return;

    const origem = modal.querySelector("[name='origem']")?.value || null;
    const valor = Number(modal.querySelector("[name='valor']")?.value);
    const vencimento = modal.querySelector("[name='vencimento']")?.value;
    const tipo_nf = modal.querySelector("input[name='tipo_nf']:checked")?.value || "NF";

    if (!valor || !vencimento) {
        alert("Preencha valor e vencimento");
        return;
    }

    const payload = {
        nota_fiscal_id: nfId,
        tipo_nf,
        origem,
        valor,
        data_vencimento: vencimento
    };

    const resp = boletoEditandoId
        ? await supabase.from("boletos").update(payload).eq("id", boletoEditandoId)
        : await supabase.from("boletos").insert(payload);

    if (resp.error) {
        console.error(resp.error);
        alert("Erro ao salvar boleto");
        return;
    }

    fecharModalBoleto();
    carregarBoletos();
}

// ===============================================
window.editarBoleto = async id => {
    boletoEditandoId = id;
    abrirModalBoleto();
};

window.excluirBoleto = async id => {
    if (!confirm("Excluir boleto?")) return;
    await supabase.from("boletos").delete().eq("id", id);
    carregarBoletos();
};
