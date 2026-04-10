// ===============================================
//  NOTAS_NOVA.JS — ATUALIZADO (AUTOMAÇÃO TOTAL)
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
    select.innerHTML = `<option value="">Selecione o cliente</option>`;

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
    select.innerHTML = `<option value="">Selecione o produto</option>`;

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

    if (!produtoId || quantidade <= 0) {
        return alert("Selecione produto e quantidade.");
    }

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
            <td><button class="btn-remover" onclick="removerItem(${i})">Remover</button></td>
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
        return alert("Preencha todos os campos da parcela.");
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
            <td>R$ ${b.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>${b.vencimento}</td>
            <td><button class="btn-remover" onclick="removerParcela(${i})">Remover</button></td>
        </tr>`;
    });
}

window.removerParcela = (i) => {
    boletos.splice(i, 1);
    atualizarTabelaBoletos();
};

// ===============================================
function gerarParcelas() {
    const totalInput = Number(document.getElementById("valorTotalNF").value);
    const qtd = prompt("Quantidade de parcelas?");

    if (!totalInput || !qtd) return;

    boletos = [];
    let dataBase = new Date();

    for (let i = 1; i <= qtd; i++) {
        let dataVencimento = new Date(dataBase);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);

        boletos.push({
            parcela: i,
            valor: totalInput / qtd,
            vencimento: dataVencimento.toISOString().split("T")[0]
        });
    }

    atualizarTabelaBoletos();
}

// ===============================================
// SALVAR NF COMPLETA COM INTEGRAÇÃO TOTAL
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    // Obter nome do cliente para as descrições financeiras
    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente Desconhecido";

    // CÁLCULO AUTOMÁTICO DO TOTAL BASEADO NOS BOLETOS
    const totalCalculado = boletos.reduce((acc, b) => acc + b.valor, 0);

    if (!clienteId || !numeroNF || !dataNF || boletos.length === 0) {
        return alert("Preencha os dados da NF e inclua ao menos um boleto.");
    }

    // 1. INSERIR NOTA FISCAL
    const { data: nf, error: errorNF } = await supabase
        .from("notas_fiscais")
        .insert({
            cliente_id: clienteId,
            numero_nf: numeroNF,
            data_nf: dataNF,
            total: totalCalculado
        })
        .select()
        .single();

    if (errorNF) {
        console.error("Erro NF:", errorNF);
        return alert("Erro ao salvar NF.");
    }

    const nfId = nf.id;

    // 2. INSERIR ITENS DA NF
    const { error: erroItens } = await supabase
        .from("notas_fiscais_itens")
        .insert(
            itensNF.map(i => ({
                nf_id: nfId,
                produto_id: i.produto_id,
                quantidade: i.quantidade
            }))
        );

    if (erroItens) console.error("Erro itens:", erroItens);

    // 3. PROCESSAR BOLETOS, CONTAS A RECEBER E EXTRATO
    for (const b of boletos) {
        const descCompleta = `${numeroNF}-${b.parcela} - ${nomeCliente}`;

        // Salvar na Tabela Boletos (Print 1)
        await supabase.from("boletos").insert({
            nota_fiscal_id: nfId,
            origem: numeroNF,
            tipo: "NF",
            numero_referencia: `${numeroNF}-${b.parcela}`,
            valor: b.valor,
            data_vencimento: b.vencimento,
            data_emissao: dataNF,
            status: "ABERTO"
        });

        // Salvar em Contas a Receber (Print 2)
        await supabase.from("contas_receber").insert({
            origem: `${numeroNF}-${b.parcela}`, // Coluna NF/Origem
            valor: b.valor,
            vencimento: b.vencimento,
            status: "ABERTO",
            cliente: nomeCliente
        });

        // Salvar no Extrato Financeiro (Print 3)
        await supabase.from("extrato_financeiro").insert({
            data: b.vencimento,
            banco: "SICOOB",
            descricao: descCompleta,
            valor: b.valor, // Valor positivo para Entrada/Receber
            status: "PENDENTE"
        });
    }

    alert("NF registrada, Financeiro atualizado e Extrato gerado com sucesso! 🚀");
    window.location.href = "notas_lista.html";
}
