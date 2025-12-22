// ===============================================
// NOTAS_VER.JS — NF + ITENS + BAIXAS + BOLETOS
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

    nfId = new URLSearchParams(window.location.search).get("id");
    if (!nfId) {
        alert("NF não encontrada");
        return;
    }

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
    await carregarBoletos();

    document.getElementById("btnNovoBoleto").onclick = abrirModalNovo;
    document.getElementById("btnCancelarBoleto").onclick = fecharModal;
    document.getElementById("btnSalvarBoleto").onclick = salvarBoleto;
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

    nfNumero.textContent = data.numero_nf;
    nfData.textContent = formatarDataBR(data.data_nf);
    nfCliente.textContent = data.clientes?.razao_social || "—";
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
// BAIXAS (COM SITUAÇÃO)
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

    // buscar quantidade do pedido
    const pedidoIds = [...new Set(baixas.map(b => b.pedido_id))];
    const produtoIds = [...new Set(baixas.map(b => b.produto_id))];

    const { data: itensPedidos } = await supabase
        .from("pedidos_itens")
        .select("pedido_id, produto_id, quantidade")
        .in("pedido_id", pedidoIds)
        .in("produto_id", produtoIds);

    const mapaPedido = {};
    itensPedidos?.forEach(i => {
        mapaPedido[`${i.pedido_id}-${i.produto_id}`] = i.quantidade;
    });

    const mapaBaixas = {};
    baixas.forEach(b => {
        const key = `${b.pedido_id}-${b.produto_id}`;
        mapaBaixas[key] = (mapaBaixas[key] || 0) + b.quantidade_baixada;
    });

    baixas.forEach(b => {
        const key = `${b.pedido_id}-${b.produto_id}`;
        const total = mapaPedido[key] || 0;
        const baixado = mapaBaixas[key] || 0;

        let situacao = "Pendente";
        if (baixado >= total) situacao = "Concluído";
        else if (baixado > 0) situacao = "Parcial";

        tbody.innerHTML += `
            <tr>
                <td>${b.pedido_id}</td>
                <td>${nomeProduto(b.produto_id)}</td>
                <td style="text-align:right">${b.quantidade_baixada}</td>
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
    document.querySelector("input[value='NF']").checked = true;
    modalBoleto.style.display = "flex";
}

function fecharModal() {
    modalBoleto.style.display = "none";
}

async function salvarBoleto() {
    const tipo_nf = document.querySelector("input[name='tipo_nf']:checked").value;

    const payload = {
        nota_fiscal_id: nfId,
        tipo_nf,
        origem: boletoOrigem.value || null,
        valor: Number(boletoValor.value),
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
    const { data } = await supabase.from("boletos").select("*").eq("id", id).single();
    boletoEditandoId = id;

    boletoOrigem.value = data.origem || "";
    boletoValor.value = data.valor;
    boletoVencimento.value = data.data_vencimento;
    document.querySelector(`input[value='${data.tipo_nf}']`).checked = true;

    modalBoleto.style.display = "flex";
};

window.excluirBoleto = async function (id) {
    if (!confirm("Excluir boleto?")) return;
    await supabase.from("boletos").delete().eq("id", id);
    carregarBoletos();
};
