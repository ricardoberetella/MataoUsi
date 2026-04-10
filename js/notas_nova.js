// ===============================================
//  NOTAS_NOVA.JS — VERSÃO CORRIGIDA E COMPLETA
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
    if (select) {
        select.innerHTML = `<option value="">Selecione o cliente</option>`;
        listaClientes.forEach(cli => {
            const opt = document.createElement("option");
            opt.value = cli.id;
            opt.textContent = cli.razao_social;
            select.appendChild(opt);
        });
    }
}

async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("id, codigo, descricao").order("codigo");
    listaProdutos = data || [];
    const select = document.getElementById("produtoSelect");
    if (select) {
        select.innerHTML = `<option value="">Selecione o produto</option>`;
        listaProdutos.forEach(prod => {
            const opt = document.createElement("option");
            opt.value = prod.id;
            opt.textContent = `${prod.codigo} - ${prod.descricao}`;
            select.appendChild(opt);
        });
    }
}

function configurarEventos() {
    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
    document.getElementById("btnAdicionarParcela").onclick = adicionarParcela;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
}

// ===============================================
// ITENS E BAIXAS
// ===============================================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);
    // Tenta pegar o ID do pedido de um campo oculto ou seleção (se houver)
    const pedidoId = document.getElementById("pedidoIdSelecionado")?.value || null;

    if (!produtoId || quantidade <= 0) return alert("Selecione produto e quantidade.");

    itensNF.push({ produto_id: produtoId, quantidade, pedido_id: pedidoId });
    atualizarTabelaItens();
}

function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    if (!tbody) return;
    tbody.innerHTML = "";
    itensNF.forEach((item, i) => {
        const prod = listaProdutos.find(p => p.id === item.produto_id);
        tbody.innerHTML += `
        <tr>
            <td>${prod?.codigo} - ${prod?.descricao}</td>
            <td>${item.quantidade}</td>
            <td><button type="button" class="btn-remover" onclick="removerItem(${i})">Remover</button></td>
        </tr>`;
    });
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
};

// ===============================================
// BOLETOS E PARCELAS
// ===============================================
function adicionarParcela() {
    const parcela = document.getElementById("parcelaInput").value;
    const valor = Number(document.getElementById("valorParcelaInput").value);
    const vencimento = document.getElementById("vencimentoInput").value;

    if (!parcela || !valor || !vencimento) return alert("Preencha os dados da parcela.");

    boletos.push({ parcela, valor, vencimento });
    atualizarTabelaBoletos();
}

function atualizarTabelaBoletos() {
    const tbody = document.getElementById("tbodyBoletos");
    if (!tbody) return;
    tbody.innerHTML = "";
    boletos.forEach((b, i) => {
        tbody.innerHTML += `
        <tr>
            <td>${b.parcela}</td>
            <td>R$ ${b.valor.toFixed(2)}</td>
            <td>${b.vencimento}</td>
            <td><button type="button" class="btn-remover" onclick="removerParcela(${i})">Remover</button></td>
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
            parcela: String.fromCharCode(64 + i), // A, B, C...
            valor: total / qtd,
            vencimento: venc.toISOString().split("T")[0]
        });
    }
    atualizarTabelaBoletos();
}

// ===============================================
// SALVAMENTO GLOBAL (NF + BAIXAS + FINANCEIRO)
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF) return alert("Preencha o cabeçalho da NF.");
    if (itensNF.length === 0) return alert("Adicione ao menos um item.");
    if (boletos.length === 0) return alert("Adicione ao menos um boleto/parcela.");

    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente";
    const totalNF = boletos.reduce((acc, b) => acc + b.valor, 0);

    try {
        console.log("Gravando NF...");
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({
                cliente_id: clienteId,
                numero_nf: numeroNF,
                data_nf: dataNF,
                total: totalNF
            })
            .select().single();

        if (errNF) throw new Error("Erro na NF: " + errNF.message);

        // 1. GRAVAR ITENS E BAIXAS
        console.log("Processando itens e baixas...");
        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade
            });

            // Se o item veio de um pedido, registra a baixa para o seu print 1
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

        // 2. GRAVAR BOLETOS, CONTAS A RECEBER E EXTRATO
        console.log("Processando financeiro...");
        for (const b of boletos) {
            const identificador = `${numeroNF}-${b.parcela}`;

            // Salva na tabela interna de boletos da NF
            await supabase.from("boletos").insert({
                nota_fiscal_id: nf.id,
                origem: numeroNF,
                vinculacao: b.parcela,
                valor: b.valor,
                vencimento: b.vencimento
            });

            // SALVA EM CONTAS A RECEBER (Print 2)
            const { error: errCR } = await supabase.from("contas_receber").insert({
                origem: identificador,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });
            if (errCR) console.error("Erro CR:", errCR);

            // SALVA NO EXTRATO FINANCEIRO (Print 3)
            const { error: errEX } = await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${identificador} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
            if (errEX) console.error("Erro Extrato:", errEX);
        }

        alert("Tudo salvo com sucesso! NF, Baixas e Financeiro atualizados. 🚀");
        window.location.href = "notas_lista.html";

    } catch (error) {
        console.error("ERRO NO SALVAMENTO:", error);
        alert(error.message);
    }
}
