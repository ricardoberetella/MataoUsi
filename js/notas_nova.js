// ===============================================
//  NOTAS_NOVA.JS — COMPLETO COM BOLETOS + CONTAS_RECEBER
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let listaClientes = [];
let listaProdutos = [];
let itensNF = [];
let boletos = [];

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    await carregarClientes();
    await carregarProdutos();
    configurarEventos();

    console.log("Tela de Nova NF carregada.");
});

// ===============================================
async function carregarClientes() {
    const select = document.getElementById("clienteSelect");
    select.innerHTML = `<option value="">Selecione o cliente</option>`;

    const { data } = await supabase
        .from("clientes")
        .select("id, razao_social")
        .order("razao_social");

    listaClientes = data || [];

    listaClientes.forEach(cli => {
        const opt = document.createElement("option");
        opt.value = cli.id;
        opt.textContent = cli.razao_social;
        select.appendChild(opt);
    });
}

// ===============================================
async function carregarProdutos() {
    const select = document.getElementById("produtoSelect");

    const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao")
        .order("codigo");

    listaProdutos = data || [];

    listaProdutos.forEach(prod => {
        const opt = document.createElement("option");
        opt.value = prod.id;
        opt.textContent = `${prod.codigo} - ${prod.descricao}`;
        select.appendChild(opt);
    });
}

// ===============================================
function configurarEventos() {
    document.getElementById("btnAdicionarItem")?.addEventListener("click", adicionarItem);
    document.getElementById("btnSalvarNF")?.addEventListener("click", salvarNF);

    document.getElementById("btnAdicionarParcela")?.addEventListener("click", adicionarParcela);
    document.getElementById("btnGerarParcelas")?.addEventListener("click", gerarParcelas);
}

// ===============================================
// ITENS
// ===============================================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);

    if (!produtoId || quantidade <= 0) {
        alert("Selecione produto e quantidade.");
        return;
    }

    itensNF.push({ produto_id: produtoId, quantidade });
    atualizarTabelaItens();
}

function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    tbody.innerHTML = "";

    itensNF.forEach((item, index) => {
        const produto = listaProdutos.find(p => p.id === item.produto_id);

        tbody.innerHTML += `
            <tr>
                <td>${produto?.codigo} - ${produto?.descricao}</td>
                <td>${item.quantidade}</td>
                <td>
                    <button onclick="removerItem(${index})">Remover</button>
                </td>
            </tr>
        `;
    });
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
};

// ===============================================
// BOLETOS
// ===============================================
function adicionarParcela() {
    const parcela = Number(document.getElementById("parcelaInput").value);
    const valor = Number(document.getElementById("valorParcelaInput").value);
    const vencimento = document.getElementById("vencimentoInput").value;

    if (!parcela || !valor || !vencimento) {
        alert("Preencha todos os campos da parcela.");
        return;
    }

    boletos.push({ parcela, valor, vencimento });
    atualizarTabelaBoletos();
}

function atualizarTabelaBoletos() {
    const tbody = document.getElementById("tbodyBoletos");
    tbody.innerHTML = "";

    boletos.forEach((b, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${b.parcela}</td>
                <td>R$ ${b.valor.toFixed(2)}</td>
                <td>${b.vencimento}</td>
                <td><button onclick="removerParcela(${i})">Remover</button></td>
            </tr>
        `;
    });
}

window.removerParcela = (i) => {
    boletos.splice(i, 1);
    atualizarTabelaBoletos();
};

// ===============================================
// GERAR PARCELAS AUTOMÁTICAS
// ===============================================
function gerarParcelas() {
    const total = Number(document.getElementById("valorTotalNF").value);

    if (!total || total <= 0) {
        alert("Informe o valor total primeiro.");
        return;
    }

    const qtd = prompt("Quantas parcelas?");
    if (!qtd) return;

    boletos = [];

    const valorParcela = total / qtd;
    let data = new Date();

    for (let i = 1; i <= qtd; i++) {
        data.setMonth(data.getMonth() + 1);

        boletos.push({
            parcela: i,
            valor: valorParcela,
            vencimento: data.toISOString().split("T")[0]
        });
    }

    atualizarTabelaBoletos();
}

// ===============================================
// SALVAR NF COMPLETA
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    const total = Number(document.getElementById("valorTotalNF").value);

    if (!clienteId || !numeroNF || !dataNF) {
        alert("Preencha os dados da NF.");
        return;
    }

    // ---------- NF ----------
    const { data: nf } = await supabase
        .from("notas_fiscais")
        .insert({
            cliente_id: clienteId,
            numero_nf: numeroNF,
            data_nf: dataNF,
            total: total
        })
        .select()
        .single();

    const nfId = nf.id;

    // ---------- ITENS ----------
    await supabase.from("notas_fiscais_itens").insert(
        itensNF.map(i => ({
            nf_id: nfId,
            produto_id: i.produto_id,
            quantidade: i.quantidade
        }))
    );

    // ---------- BOLETOS + CONTAS_RECEBER ----------
    for (const b of boletos) {

        // salva boleto
        await supabase.from("boletos").insert({
            nf_id: nfId,
            parcela: b.parcela,
            valor: b.valor,
            vencimento: b.vencimento
        });

        // lança no contas_receber
        await supabase.from("contas_receber").insert({
            cliente_id: clienteId,
            data: b.vencimento,
            descricao: `NF ${numeroNF} - Parcela ${b.parcela}`,
            valor: b.valor,
            status: "PENDENTE"
        });
    }

    // ---------- BAIXA AUTOMÁTICA ----------
    await realizarBaixaPorData(nfId, clienteId, itensNF);

    alert("NF completa salva com sucesso 🚀");
    window.location.href = "notas_lista.html";
}

// ===============================================
// BAIXA AUTOMÁTICA (MANTIDA)
// ===============================================
async function realizarBaixaPorData(nfId, clienteId, itensNF) {
    for (const itemNF of itensNF) {
        let qtdRestante = Number(itemNF.quantidade);
        if (qtdRestante <= 0) continue;

        const { data: itensPedido } = await supabase
            .from("pedidos_itens")
            .select(`
                id,
                pedido_id,
                produto_id,
                quantidade,
                data_entrega,
                pedidos!inner(id, cliente_id)
            `)
            .eq("produto_id", itemNF.produto_id)
            .eq("pedidos.cliente_id", clienteId)
            .order("data_entrega", { ascending: true });

        for (const pedItem of (itensPedido || [])) {
            if (qtdRestante <= 0) break;

            const { data: baixasItem } = await supabase
                .from("notas_pedidos_baixas")
                .select("quantidade_baixada")
                .eq("pedido_item_id", pedItem.id);

            const totalBaixado = (baixasItem || []).reduce((s, b) => s + Number(b.quantidade_baixada), 0);
            const saldo = pedItem.quantidade - totalBaixado;

            if (saldo <= 0) continue;

            const baixar = Math.min(qtdRestante, saldo);

            await supabase.from("notas_pedidos_baixas").insert({
                nf_id: nfId,
                pedido_id: pedItem.pedido_id,
                produto_id: pedItem.produto_id,
                pedido_item_id: pedItem.id,
                quantidade_baixada: baixar
            });

            qtdRestante -= baixar;
        }
    }
}
