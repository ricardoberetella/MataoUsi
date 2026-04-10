// ===============================================
//  NOTAS_NOVA.JS — ARQUIVO COMPLETO E CORRIGIDO
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let listaClientes = [];
let listaProdutos = [];
let itensNF = [];
let boletos = [];

// ===============================================
// INICIALIZAÇÃO
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    await carregarClientes();
    await carregarProdutos();
    configurarEventos();
});

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

function configurarEventos() {
    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
    document.getElementById("btnAdicionarParcela").onclick = adicionarParcela;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
}

// ===============================================
// GESTÃO DE ITENS (PRODUTOS)
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
            <td><button type="button" onclick="removerItem(${i})">Remover</button></td>
        </tr>`;
    });
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
};

// ===============================================
// GESTÃO DE BOLETOS (FINANCEIRO)
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
            <td>R$ ${b.valor.toFixed(2)}</td>
            <td>${b.vencimento}</td>
            <td><button type="button" onclick="removerParcela(${i})">Remover</button></td>
        </tr>`;
    });
}

window.removerParcela = (i) => {
    boletos.splice(i, 1);
    atualizarTabelaBoletos();
};

function gerarParcelas() {
    const total = Number(document.getElementById("valorTotalNF").value);
    const qtd = prompt("Quantidade de parcelas?");

    if (!total || !qtd) return alert("Informe o valor total e a quantidade de parcelas.");

    boletos = [];
    let dataBase = new Date();

    for (let i = 1; i <= qtd; i++) {
        let venc = new Date(dataBase);
        venc.setMonth(venc.getMonth() + i);
        
        boletos.push({
            parcela: i,
            valor: total / qtd,
            vencimento: venc.toISOString().split("T")[0]
        });
    }
    atualizarTabelaBoletos();
}

// ===============================================
// SALVAMENTO COMPLETO (AÇÃO FINAL)
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    // Validações básicas
    if (!clienteId || !numeroNF || !dataNF) return alert("Preencha os dados da NF.");
    if (itensNF.length === 0) return alert("Adicione ao menos um item.");
    if (boletos.length === 0) return alert("Gere os boletos antes de salvar.");

    // Cálculo do total real baseado nos boletos
    const totalFinal = boletos.reduce((acc, b) => acc + b.valor, 0);
    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "";

    try {
        // 1. Inserir a Nota Fiscal
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({
                cliente_id: clienteId,
                numero_nf: numeroNF,
                data_nf: dataNF,
                total: totalFinal
            })
            .select().single();

        if (errNF) throw errNF;

        // 2. Inserir Itens da NF
        const { error: errItens } = await supabase
            .from("notas_fiscais_itens")
            .insert(itensNF.map(item => ({
                nf_id: nf.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade
            })));

        if (errItens) throw errItens;

        // 3. Loop para Gravar Financeiro (Boletos, Contas a Receber e Extrato)
        for (const b of boletos) {
            const ref = `${numeroNF}-${b.parcela}`;

            // Tabela Boletos
            await supabase.from("boletos").insert({
                nota_fiscal_id: nf.id,
                origem: numeroNF,
                numero_referencia: ref,
                valor: b.valor,
                data_vencimento: b.vencimento,
                status: "ABERTO"
            });

            // Tabela Contas a Receber (Print 2)
            await supabase.from("contas_receber").insert({
                origem: ref,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });

            // Tabela Extrato Financeiro (Print 3)
            await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${ref} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
        }

        alert("Nota Fiscal e Financeiro processados com sucesso! 🚀");
        window.location.href = "notas_lista.html";

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar: " + error.message);
    }
}
