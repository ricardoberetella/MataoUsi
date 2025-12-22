// ===============================================
// NOTAS_VER.JS — NF + ITENS + BAIXAS + BOLETOS
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let cacheProdutos = [];
let boletoEditandoId = null;

// ELEMENTOS MODAL
let modalBoleto;
let boletoOrigem;
let boletoValor;
let boletoVencimento;

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

    // MAPEAR ELEMENTOS DO MODAL
    modalBoleto = document.getElementById("modalBoleto");
    boletoOrigem = document.getElementById("boletoOrigem");
    boletoValor = document.getElementById("boletoValor");
    boletoVencimento = document.getElementById("boletoVencimento");

    // BOTÕES
    const btnNovo = document.getElementById("btnNovoBoleto");
    const btnCancelar = document.getElementById("btnCancelarBoleto");
    const btnSalvar = document.getElementById("btnSalvarBoleto");

    if (btnNovo) btnNovo.onclick = abrirModalNovo;
    if (btnCancelar) btnCancelar.onclick = fecharModal;
    if (btnSalvar) btnSalvar.onclick = salvarBoleto;

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
    await carregarBoletos();
});

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
// BAIXAS (AGRUPADAS)
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
        if (!mapa[key]) {
            mapa[key] = {
                pedido_id: b.pedido_id,
                produto_id: b.produto_id,
                baixado: 0
            };
        }
        mapa[key].baixado += b.quantidade_baixada;
    });

    const pedidoIds = [...new Set(baixas.map(b => b.pedido_id))];
    const produtoIds = [...new Set(baixas.map(b => b.produto_id))];

    const { data: itensPedidos } = await supabase
        .from("pedidos_itens")
        .select("pedido_id, produto_id, quantidade")
        .in("pedido_id", pedidoIds)
        .in("produto_id", produtoIds);

    Object.values(mapa).forEach(reg => {
        const item = itensPedidos?.find(
            i => i.pedido_id === reg.pedido_id && i.produto_id === reg.produto_id
        );

        const total = item?.quantidade || 0;
        let situacao = "Pendente";
        if (reg.baixado >= total && total > 0) situacao = "Concluído";
        else if (reg.baixado > 0) situacao = "Parcial";

        tbody.innerHTML += `
            <tr>
                <td>${reg.pedido_id}</td>
                <td>${nomeProduto(reg.produto_id)}</td>
                <td style="text-align:right">${reg.baixado}</td>
                <td>${situacao}</td>
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
// MODAL BOLETO
// ===============================================
function abrirModalNovo() {
    boletoEditandoId = null;
    boletoOrigem.value = "";
    boletoValor.value = "";
    boletoVencimento.value = "";
    document.querySelector("input[name='tipo_nf'][value='NF']").checked = true;
    modalBoleto.style.display = "flex";
}

function fecharModal() {
    modalBoleto.style.display = "none";
}

async function salvarBoleto() {
    const tipo_nf = document.querySelector("input[name='tipo_nf']:checked").value;
    const valor = Number(boletoValor.value);

    if (!valor || !boletoVencimento.value) {
        alert("Preencha valor e vencimento");
        return;
    }

    const payload = {
        nota_fiscal_id: nfId,
        tipo_nf,
        origem: boletoOrigem.value || null,
        valor,
        data_vencimento: boletoVencimento.value
    };

    const resp = boletoEditandoId
        ? await supabase.from("boletos").update(payload).eq("id", boletoEditandoId)
        : await supabase.from("boletos").insert(payload);

    if (resp.error) {
        console.error(resp.error);
        alert("Erro ao salvar boleto");
        return;
    }

    fecharModal();
    carregarBoletos();
}

window.editarBoleto = async function (id) {
    const { data } = await supabase
        .from("boletos")
        .select("*")
        .eq("id", id)
        .single();

    boletoEditandoId = id;

    boletoOrigem.value = data.origem || "";
    boletoValor.value = data.valor;
    boletoVencimento.value = data.data_vencimento;
    document.querySelector(`input[name='tipo_nf'][value='${data.tipo_nf}']`).checked = true;

    modalBoleto.style.display = "flex";
};

window.excluirBoleto = async function (id) {
    if (!confirm("Excluir boleto?")) return;
    await supabase.from("boletos").delete().eq("id", id);
    carregarBoletos();
};
