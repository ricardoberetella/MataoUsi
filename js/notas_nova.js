// ===============================================
//  NOTAS_NOVA.JS — VERSÃO INTEGRAL CORRIGIDA
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let listaClientes = [];
let listaProdutos = [];
let itensNF = [];
let boletos = [];

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
    // Busca 'valor_unitario' conforme sua estrutura de banco de dados
    const { data } = await supabase.from("produtos").select("id, codigo, descricao, valor_unitario").order("codigo");
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
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;

    // Listeners para cálculo em tempo real antes de adicionar à lista
    document.getElementById("produtoSelect").onchange = atualizarPreviewLinha;
    document.getElementById("quantidadeNF").oninput = atualizarPreviewLinha;
}

// ATUALIZAÇÃO AUTOMÁTICA DE VALORES NA INTERFACE (PREVIEW)
function atualizarPreviewLinha() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value) || 0;
    
    const produto = listaProdutos.find(p => p.id === produtoId);
    const vUnit = produto?.valor_unitario || 0;
    const vTotal = vUnit * quantidade;

    const inputVUnit = document.getElementById("valorUnitarioItem"); 
    const inputVTotal = document.getElementById("valorTotalItem");

    if (inputVUnit) inputVUnit.value = vUnit.toFixed(2);
    if (inputVTotal) inputVTotal.value = vTotal.toFixed(2);
}

function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);
    const pedidoId = document.getElementById("pedidoOrigemInput")?.value || null;

    if (!produtoId || quantidade <= 0) return alert("Selecione produto e quantidade.");

    const produto = listaProdutos.find(p => p.id === produtoId);
    const valorUnitario = produto?.valor_unitario || 0;
    const subtotal = quantidade * valorUnitario;

    itensNF.push({ 
        produto_id: produtoId, 
        quantidade, 
        valor_unitario: valorUnitario,
        subtotal: subtotal,
        pedido_id: pedidoId 
    });

    atualizarTabelaItens();
    atualizarValorTotalNF();
}

// CORREÇÃO DA BARRA SUPERIOR E COLUNAS
function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    // Cabeçalho com a ordem solicitada: Produto, Valor Unitário, Quantidade, Total e Ações
    const cabecalho = `
        <tr style="font-weight: bold; background-color: #1a2a3a; color: #00d4ff;">
            <td style="padding: 10px;">Produto</td>
            <td style="padding: 10px;">Valor Unitário</td>
            <td style="padding: 10px;">Quantidade</td>
            <td style="padding: 10px;">Total</td>
            <td style="padding: 10px; text-align: center;">Ações</td>
        </tr>
    `;
    
    tbody.innerHTML = cabecalho;

    itensNF.forEach((item, i) => {
        const prod = listaProdutos.find(p => p.id === item.produto_id);
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 10px;">${prod?.codigo} - ${prod?.descricao}</td>
                <td style="padding: 10px;">R$ ${item.valor_unitario.toFixed(2)}</td>
                <td style="padding: 10px;">${item.quantidade}</td>
                <td style="padding: 10px;">R$ ${item.subtotal.toFixed(2)}</td>
                <td style="padding: 10px; text-align: center;">
                    <button type="button" class="btn-remover" onclick="removerItem(${i})">Remover</button>
                </td>
            </tr>`;
    });
}

function atualizarValorTotalNF() {
    const total = itensNF.reduce((acc, item) => acc + item.subtotal, 0);
    const inputTotalNF = document.getElementById("valorTotalNF");
    if (inputTotalNF) {
        inputTotalNF.value = total.toFixed(2);
    }
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
    atualizarValorTotalNF();
};

// GERAÇÃO DE PARCELAS COM ORIGEM DINÂMICA (Ex: 9999-A)
function gerarParcelas() {
    const total = Number(document.getElementById("valorTotalNF").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const qtd = prompt("Quantidade de parcelas?");
    
    if (!total || !numeroNF || !qtd) return alert("Verifique o número da NF e o total.");

    boletos = [];
    let dataBase = new Date();
    for (let i = 1; i <= qtd; i++) {
        let venc = new Date(dataBase);
        venc.setMonth(venc.getMonth() + i);
        const letra = String.fromCharCode(64 + i); 
        boletos.push({
            parcela: letra,
            origem_formatada: `${numeroNF}-${letra}`,
            valor: total / qtd,
            vencimento: venc.toISOString().split("T")[0]
        });
    }
    atualizarTabelaBoletos();
}

function atualizarTabelaBoletos() {
    const tbody = document.getElementById("tbodyBoletos");
    if (!tbody) return;
    tbody.innerHTML = "";
    boletos.forEach((b, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${b.origem_formatada}</td>
                <td>R$ ${b.valor.toFixed(2)}</td>
                <td>${b.vencimento}</td>
                <td><button type="button" class="btn-remover" onclick="removerParcela(${i})">Remover</button></td>
            </tr>`;
    });
}

// SALVAMENTO COM BAIXA DE PEDIDOS E INTEGRAÇÃO FINANCEIRA
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Preencha todos os campos.");
    }

    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente";
    const totalNF = itensNF.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({ cliente_id: clienteId, numero_nf: numeroNF, data_nf: dataNF, total: totalNF })
            .select().single();

        if (errNF) throw errNF;

        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                q: item.quantidade
            });

            // Registro de baixa no pedido para aparecer no quadro de "Baixas Realizadas"
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

        for (const b of boletos) {
            await supabase.from("contas_receber").insert({
                origem: b.origem_formatada,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });

            // Envio para o Extrato Financeiro (SICOOB)
            await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${b.origem_formatada} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
        }

        alert("NF Lançada com sucesso!");
        window.location.href = "notas_lista.html";

    } catch (error) {
        console.error(error);
        alert("Erro: " + error.message);
    }
}
