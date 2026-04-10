// ===============================================
//  NOTAS_NOVA.JS — COMPLETO COM BAIXA DE PEDIDOS
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
    const { data } = await supabase.from("produtos").select("id, codigo, descricao, preco_venda").order("codigo");
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
// GESTÃO DE ITENS E BAIXA DE PEDIDOS
// ===============================================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);
    // IMPORTANTE: Este campo deve conter o ID do pedido que você está faturando
    const pedidoId = document.getElementById("pedidoOrigemInput")?.value || null; 

    if (!produtoId || quantidade <= 0) return alert("Selecione produto e quantidade.");

    const produto = listaProdutos.find(p => p.id === produtoId);
    const valorUnitario = produto?.preco_venda || 0;
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

function atualizarValorTotalNF() {
    const total = itensNF.reduce((acc, item) => acc + item.subtotal, 0);
    const inputTotal = document.getElementById("valorTotalNF");
    if (inputTotal) inputTotal.value = total.toFixed(2);
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
                <td>R$ ${item.subtotal.toFixed(2)}</td>
                <td><button type="button" onclick="removerItem(${i})">Remover</button></td>
            </tr>`;
    });
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
    atualizarValorTotalNF();
};

// ===============================================
// FINANCEIRO (BOLETOS, CONTAS E EXTRATO)
// ===============================================
function gerarParcelas() {
    const total = Number(document.getElementById("valorTotalNF").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const qtd = prompt("Quantidade de parcelas?");
    
    if (!total || !numeroNF || !qtd) return alert("Verifique o número da NF e o valor total.");

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
                <td>${b.parcela}</td>
                <td>${b.origem_formatada}</td>
                <td>R$ ${b.valor.toFixed(2)}</td>
                <td>${b.vencimento}</td>
                <td><button type="button" onclick="removerParcela(${i})">Remover</button></td>
            </tr>`;
    });
}

// ===============================================
// SALVAMENTO COMPLETO (NF + BAIXAS + FINANCEIRO)
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Preencha todos os campos obrigatórios.");
    }

    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente";
    const totalNF = itensNF.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        // 1. GRAVAR NOTA FISCAL
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({ cliente_id: clienteId, numero_nf: numeroNF, data_nf: dataNF, total: totalNF })
            .select().single();

        if (errNF) throw errNF;

        // 2. GRAVAR ITENS E REALIZAR BAIXA NOS PEDIDOS
        for (const item of itensNF) {
            // Insere o item na NF
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                q: item.quantidade
            });

            // GERA A BAIXA (Para alimentar o quadro "Baixas Realizadas")
            const { error: errBaixa } = await supabase.from("pedidos_baixas").insert({
                pedido_id: item.pedido_id, // Vincula ao pedido original
                produto_id: item.produto_id,
                qtd_baixada: item.quantidade,
                nf_id: nf.id,
                situacao: "CONCLUÍDO"
            });
            if (errBaixa) console.error("Erro ao registrar baixa:", errBaixa.message);
        }

        // 3. PROCESSAR FINANCEIRO (BOLETOS + CONTAS RECEBER + EXTRATO)
        for (const b of boletos) {
            // Tabela Boletos
            await supabase.from("boletos").insert({
                nota_fiscal_id: nf.id,
                numero_nf_referencia: b.origem_formatada,
                valor: b.valor,
                data_vencimento: b.vencimento,
                status: "ABERTO"
            });

            // Tabela Contas a Receber
            await supabase.from("contas_receber").insert({
                origem: b.origem_formatada,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });

            // Tabela Extrato Financeiro
            await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${b.origem_formatada} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
        }

        alert("Sucesso! NF salva, itens baixados e financeiro gerado em Contas e Extrato.");
        window.location.href = "notas_lista.html";

    } catch (error) {
        console.error("ERRO:", error);
        alert("Erro no salvamento: " + error.message);
    }
}
