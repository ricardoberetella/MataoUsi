// ===============================================
//  NOTAS_NOVA.JS — ARQUIVO COMPLETO E CORRIGIDO
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
    document.getElementById("produtoSelect").onchange = atualizarPreviewLinha;
    document.getElementById("quantidadeNF").oninput = atualizarPreviewLinha;
}

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

function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    if (!tbody) return;
    tbody.innerHTML = `
        <tr style="font-weight: bold; background-color: #1a2a3a; color: #00d4ff;">
            <td style="padding: 10px;">Produto</td>
            <td style="padding: 10px;">Valor Unitário</td>
            <td style="padding: 10px;">Quantidade</td>
            <td style="padding: 10px;">Total</td>
            <td style="padding: 10px; text-align: center;">Ações</td>
        </tr>`;

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
    if (inputTotalNF) inputTotalNF.value = total.toFixed(2);
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
    atualizarValorTotalNF();
};

function gerarParcelas() {
    const total = Number(document.getElementById("valorTotalNF").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const qtd = prompt("Quantidade de parcelas?");
    if (!total || !numeroNF || !qtd) return alert("Verifique número da NF e total.");

    boletos = [];
    let dataBase = new Date();
    for (let i = 1; i <= qtd; i++) {
        let venc = new Date(dataBase);
        venc.setMonth(venc.getMonth() + i);
        const letra = String.fromCharCode(64 + i); 
        boletos.push({
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
    boletos.forEach(b => {
        tbody.innerHTML += `<tr><td>${b.origem_formatada}</td><td>R$ ${b.valor.toFixed(2)}</td><td>${b.vencimento}</td></tr>`;
    });
}

// ===============================================
// FUNÇÃO DE SALVAMENTO COM CORREÇÃO DE COLUNAS E BAIXAS
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Preencha tudo e gere as parcelas.");
    }

    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente";
    const totalNF = itensNF.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        // 1. Criar Nota Fiscal (Coluna correta: data_nf)
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({ cliente_id: clienteId, numero_nf: numeroNF, data_nf: dataNF, total: totalNF })
            .select().single();

        if (errNF) throw new Error("Erro NF: " + errNF.message);

        // 2. Processar Itens e Baixas nos Pedidos
        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id, produto_id: item.produto_id, q: item.quantidade
            });

            // Se o item veio de um pedido, atualiza a coluna 'baixado' na pedidos_itens
            if (item.pedido_id) {
                const { data: itemPedido } = await supabase
                    .from("pedidos_itens")
                    .select("baixado")
                    .eq("pedido_id", item.pedido_id)
                    .eq("produto_id", item.produto_id)
                    .single();

                const novoBaixado = (itemPedido?.baixado || 0) + item.quantidade;

                await supabase.from("pedidos_itens")
                    .update({ baixado: novoBaixado })
                    .eq("pedido_id", item.pedido_id)
                    .eq("produto_id", item.produto_id);
            }
        }

        // 3. Gravar Financeiro (Contas a Receber e Extrato)
        for (const b of boletos) {
            await supabase.from("contas_receber").insert({
                nf_origem: b.origem_formatada,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });

            await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${b.origem_formatada} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
        }

        alert("Sucesso! NF, Baixas e Financeiro processados.");
        window.location.href = "notas_lista.html";

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}
