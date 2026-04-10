// ===============================================
//  NOTAS_NOVA.JS — COMPLETO E CORRIGIDO
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
    const { data } = await supabase.from("clientes").select("id, razao_social").order("razao_social");
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
    const { data } = await supabase.from("produtos").select("id, codigo, descricao").order("codigo");
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
// GESTÃO DE ITENS E BAIXA DE PEDIDOS
// ===============================================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);
    const pedidoId = document.getElementById("pedidoOrigem")?.value || null; // Caso tenha campo de pedido

    if (!produtoId || quantidade <= 0) return alert("Selecione produto e quantidade.");

    itensNF.push({ produto_id: produtoId, quantidade, pedido_id: pedidoId });
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
// FINANCEIRO (BOLETOS)
// ===============================================
function adicionarParcela() {
    const parcela = document.getElementById("parcelaInput").value; // Ex: A, B, C ou 1, 2, 3
    const valor = Number(document.getElementById("valorParcelaInput").value);
    const vencimento = document.getElementById("vencimentoInput").value;

    if (!parcela || !valor || !vencimento) return alert("Preencha a parcela.");

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
    if (!total || !qtd) return;

    boletos = [];
    let dataBase = new Date();
    for (let i = 1; i <= qtd; i++) {
        let venc = new Date(dataBase);
        venc.setMonth(venc.getMonth() + i);
        boletos.push({
            parcela: String.fromCharCode(64 + i), // Gera A, B, C...
            valor: total / qtd,
            vencimento: venc.toISOString().split("T")[0]
        });
    }
    atualizarTabelaBoletos();
}

// ===============================================
// SALVAR TUDO (PROCESSO COMPLETO)
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Erro: Verifique se preencheu a NF, os Itens e os Boletos.");
    }

    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente";

    try {
        // 1. CRIAR A NOTA FISCAL
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({
                cliente_id: clienteId,
                numero_nf: numeroNF,
                data_nf: dataNF,
                total: boletos.reduce((acc, b) => acc + b.valor, 0)
            })
            .select().single();

        if (errNF) throw errNF;

        // 2. DAR BAIXA NOS ITENS (Registra na tabela de itens e vincula baixa)
        for (const item of itensNF) {
            // Insere o item na NF
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade
            });

            // GERA A BAIXA NO PEDIDO (Para aparecer no seu print 1)
            if (item.pedido_id) {
                await supabase.from("pedidos_baixas").insert({
                    pedido_id: item.pedido_id,
                    produto_id: item.produto_id,
                    qtd_baixada: item.quantidade,
                    nf_id: nf.id,
                    situacao: "CONCLUÍDO"
                });
            }
        }

        // 3. PROCESSAR FINANCEIRO (BOLETOS -> CONTAS RECEBER -> EXTRATO)
        for (const b of boletos) {
            const refIdentificador = `${numeroNF}-${b.parcela}`;

            // A) Tabela Boletos
            await supabase.from("boletos").insert({
                nota_fiscal_id: nf.id,
                origem: numeroNF,
                vinculacao: b.parcela,
                valor: b.valor,
                vencimento: b.vencimento
            });

            // B) Contas a Receber (Print 2)
            await supabase.from("contas_receber").insert({
                origem: refIdentificador,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });

            // C) Extrato Financeiro (Print 3)
            await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${refIdentificador} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
        }

        alert("Sucesso! NF salva, itens baixados e financeiro gerado.");
        window.location.href = "notas_lista.html";

    } catch (error) {
        console.error("Erro Geral:", error);
        alert("Erro no processo: " + error.message);
    }
}
