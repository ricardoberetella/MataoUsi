// ===============================================
//   NOTAS_VER.JS - DETALHES DA NF + BAIXAS
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let cacheProdutos = [];

// ===============================================
// FORMATAR DATA PARA PT-BR (DD/MM/AAAA)
// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    const data = new Date(dataISO);
    return data.toLocaleDateString("pt-BR");
}

// ===============================================
// INICIAR TELA
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = obterIdDaURL();
    if (!nfId) {
        alert("Nota Fiscal não encontrada.");
        window.location.href = "notas_lista.html";
        return;
    }

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
});

// ===============================================
// PEGAR ID DA URL
// ===============================================
function obterIdDaURL() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    return id ? Number(id) : null;
}

// ===============================================
// CARREGAR PRODUTOS (CACHE PARA NOME)
// ===============================================
async function carregarProdutosCache() {
    const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, descricao");

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        cacheProdutos = [];
        return;
    }

    cacheProdutos = data || [];
}

function nomeProduto(produtoId) {
    const p = cacheProdutos.find(pr => pr.id === produtoId);
    if (!p) return `ID ${produtoId}`;
    return `${p.codigo} - ${p.descricao}`;
}

// ===============================================
// CARREGAR DADOS DA NF
// ===============================================
async function carregarDadosNF() {
    const spanNumero = document.getElementById("nfNumero");
    const spanData = document.getElementById("nfData");
    const spanCliente = document.getElementById("nfCliente");

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`
            id,
            numero_nf,
            data_nf,
            clientes(razao_social)
        `)
        .eq("id", nfId)
        .single();

    if (error) {
        console.error("Erro ao carregar NF:", error);
        alert("Erro ao carregar dados da NF.");
        return;
    }

    spanNumero.textContent = data.numero_nf;
    spanData.textContent = formatarDataBR(data.data_nf); // ✅ AQUI ESTÁ A CORREÇÃO
    spanCliente.textContent = data.clientes?.razao_social || "—";
}

// ===============================================
// CARREGAR ITENS DA NF
// ===============================================
async function carregarItensNF() {
    const tbody = document.getElementById("listaItens");
    tbody.innerHTML = `
        <tr><td colspan="2" style="text-align:center;">Carregando...</td></tr>
    `;

    const { data, error } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    if (error) {
        console.error("Erro ao carregar itens da NF:", error);
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">Erro ao carregar itens</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">Nenhum item encontrado</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${nomeProduto(item.produto_id)}</td>
                <td style="text-align:right;">${item.quantidade}</td>
            </tr>
        `;
    });
}

// ===============================================
// CARREGAR BAIXAS — VERSÃO FINAL
// ===============================================
async function carregarBaixas() {
    const tbody = document.getElementById("listaBaixas");
    tbody.innerHTML = `
        <tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>
    `;

    const { data: baixasNF, error } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id, produto_id, quantidade_baixada")
        .eq("nf_id", nfId);

    if (error) {
        console.error("Erro ao buscar baixas:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Erro ao carregar baixas</td></tr>`;
        return;
    }

    if (!baixasNF || baixasNF.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhuma baixa realizada</td></tr>`;
        return;
    }

    const produtoIds = [...new Set(baixasNF.map(b => b.produto_id))];
    const pedidoIds = [...new Set(baixasNF.map(b => b.pedido_id))];

    const { data: itensPedidos } = await supabase
        .from("pedidos_itens")
        .select("pedido_id, produto_id, quantidade")
        .in("pedido_id", pedidoIds)
        .in("produto_id", produtoIds);

    const mapaPedido = {};
    itensPedidos?.forEach(it => {
        mapaPedido[`${it.pedido_id}-${it.produto_id}`] = Number(it.quantidade);
    });

    const { data: todasBaixas } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id, produto_id, quantidade_baixada")
        .in("pedido_id", pedidoIds)
        .in("produto_id", produtoIds);

    const mapaBaixas = {};
    todasBaixas?.forEach(b => {
        const key = `${b.pedido_id}-${b.produto_id}`;
        mapaBaixas[key] = (mapaBaixas[key] || 0) + Number(b.quantidade_baixada);
    });

    tbody.innerHTML = "";

    baixasNF.forEach(bx => {
        const key = `${bx.pedido_id}-${bx.produto_id}`;
        const qtdPedido = mapaPedido[key] || 0;
        const baixado = mapaBaixas[key] || 0;

        let situacao = "Pendente";
        if (baixado >= qtdPedido) situacao = "Concluído";
        else if (baixado > 0) situacao = "Parcial";

        tbody.innerHTML += `
            <tr>
                <td>${bx.pedido_id}</td>
                <td>${nomeProduto(bx.produto_id)}</td>
                <td style="text-align:right;">${bx.quantidade_baixada}</td>
                <td style="text-align:center;">${situacao}</td>
            </tr>
        `;
    });
}
