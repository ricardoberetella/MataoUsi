// ===============================================
//  NOTAS_NOVA.JS — FINAL AJUSTADO AO SEU BANCO
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
});

// ===============================================
async function carregarClientes() {
    const { data } = await supabase
        .from("clientes")
        .select("id, razao_social")
        .order("razao_social");

    listaClientes = data || [];

    const select = document.getElementById("clienteSelect");
    listaClientes.forEach(cli => {
        const opt = document.createElement("option");
        opt.value = cli.id;
        opt.textContent = cli.razao_social;
        select.appendChild(opt);
    });
}

// ===============================================
async function carregarProdutos() {
    const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao")
        .order("codigo");

    listaProdutos = data || [];

    const select = document.getElementById("produtoSelect");
    listaProdutos.forEach(prod => {
        const opt = document.createElement("option");
        opt.value = prod.id;
        opt.textContent = `${prod.codigo} - ${prod.descricao}`;
        select.appendChild(opt);
    });
}

// ===============================================
function configurarEventos() {
    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
    document.getElementById("btnAdicionarParcela").onclick = adicionarParcela;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
}

// ===============================================
// ITENS
// ===============================================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);

    if (!produtoId || quantidade <= 0) return alert("Preencha item");

    itensNF.push({ produto_id: produtoId, quantidade });
    atualizarTabelaItens();
}

function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    tbody.innerHTML = "";

    itensNF.forEach((item, i) => {
        const prod = listaProdutos.find(p => p.id === item.produto_id);

        tbody.innerHTML += `
        <tr>
            <td>${prod?.codigo} - ${prod?.descricao}</td>
            <td>${item.quantidade}</td>
            <td><button onclick="removerItem(${i})">Remover</button></td>
        </tr>`;
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
        return alert("Preencha parcela");
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
        </tr>`;
    });
}

window.removerParcela = (i) => {
    boletos.splice(i, 1);
    atualizarTabelaBoletos();
};

// ===============================================
function gerarParcelas() {
    const total = Number(document.getElementById("valorTotalNF").value);
    const qtd = prompt("Qtd parcelas?");

    if (!total || !qtd) return;

    boletos = [];
    let data = new Date();

    for (let i = 1; i <= qtd; i++) {
        data.setMonth(data.getMonth() + 1);

        boletos.push({
            parcela: i,
            valor: total / qtd,
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

    // ---------- NF ----------
    const { data: nf, error } = await supabase
        .from("notas_fiscais")
        .insert({
            cliente_id: clienteId,
            numero_nf: numeroNF,
            data_nf: dataNF,
            total: total
        })
        .select()
        .single();

    if (error) {
        console.error(error);
        return alert("Erro NF");
    }

    const nfId = nf.id;

    // ---------- ITENS ----------
    await supabase.from("notas_fiscais_itens").insert(
        itensNF.map(i => ({
            nf_id: nfId,
            produto_id: i.produto_id,
            quantidade: i.quantidade
        }))
    );

    // ---------- BOLETOS CORRIGIDO ----------
    for (const b of boletos) {

        const { error: erroBoleto } = await supabase
            .from("boletos")
            .insert({
                nota_fiscal_id: nfId,
                origem: numeroNF,
                tipo: "NF",
                numero_referencia: `${numeroNF}-${b.parcela}`,
                valor: b.valor,
                data_vencimento: b.vencimento,
                status: "ABERTO",
                tipo_de_iniciacao: "NF"
            });

        if (erroBoleto) {
            console.error("ERRO BOLETO:", erroBoleto);
            return alert("Erro ao salvar boleto");
        }

        // ---------- CONTAS RECEBER ----------
        const { error: erroCR } = await supabase
            .from("contas_receber")
            .insert({
                data: b.vencimento,
                descricao: `${numeroNF}-${b.parcela}`,
                valor: b.valor,
                status: "PENDENTE"
            });

        if (erroCR) {
            console.error("ERRO CR:", erroCR);
            return alert("Erro contas receber");
        }
    }

    alert("NF salva completa 🚀");
    window.location.href = "notas_lista.html";
}
