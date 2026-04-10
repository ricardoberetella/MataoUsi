// ===============================================
//  NOTAS_NOVA.JS — VERSÃO FINAL CORRIGIDA
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
}

function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);
    // Captura o ID do pedido se houver
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
                <td>R$ ${item.valor_unitario.toFixed(2)}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${item.subtotal.toFixed(2)}</td>
                <td><button type="button" onclick="removerItem(${i})">Remover</button></td>
            </tr>`;
    });
}

function gerarParcelas() {
    const total = itensNF.reduce((acc, item) => acc + item.subtotal, 0);
    const numeroNF = document.getElementById("nfNumero").value;
    const qtd = prompt("Quantidade de parcelas?");
    if (!total || !numeroNF || !qtd) return alert("Verifique a NF e os itens.");

    boletos = [];
    let dataBase = new Date();
    for (let i = 1; i <= qtd; i++) {
        let venc = new Date(dataBase);
        venc.setMonth(venc.getMonth() + i);
        const letra = String.fromCharCode(64 + i); 
        boletos.push({
            origem: `${numeroNF}-${letra}`,
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
        tbody.innerHTML += `<tr><td>${b.origem}</td><td>R$ ${b.valor.toFixed(2)}</td><td>${b.vencimento}</td></tr>`;
    });
}

// ===============================================
// SALVAMENTO CORRIGIDO COM VÍNCULOS DE NF_ID
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Preencha todos os campos e gere as parcelas.");
    }

    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente";
    const totalNF = itensNF.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        // 1. Salva a NF e pega o ID gerado
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({ cliente_id: clienteId, numero_nf: numeroNF, data_nf: dataNF, total: totalNF })
            .select().single();

        if (errNF) throw errNF;

        // 2. Salva Itens e Grava a Baixa na tabela de histórico
        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                q: item.quantidade
            });

            // Grava na tabela 'pedidos_baixas' para aparecer no quadro de detalhes
            if (item.pedido_id) {
                await supabase.from("pedidos_baixas").insert({
                    pedido_id: item.pedido_id,
                    produto_id: item.produto_id,
                    qtd_baixada: item.quantidade,
                    nf_id: nf.id, // VÍNCULO ESSENCIAL
                    situacao: "CONCLUÍDO"
                });

                // Atualiza o saldo no pedido (pedidos_itens)
                const { data: pItem } = await supabase
                    .from("pedidos_itens")
                    .select("baixado")
                    .eq("pedido_id", item.pedido_id)
                    .eq("produto_id", item.produto_id)
                    .single();

                await supabase.from("pedidos_itens")
                    .update({ baixado: (pItem?.baixado || 0) + item.quantidade })
                    .eq("pedido_id", item.pedido_id)
                    .eq("produto_id", item.produto_id);
            }
        }

        // 3. Salva Boletos vinculados à NF
        for (const b of boletos) {
            await supabase.from("contas_receber").insert({
                nf_id: nf.id, // VÍNCULO ESSENCIAL PARA APARECER NO DETALHE
                nf_origem: b.origem,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });

            // Extrato Financeiro
            await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${b.origem} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
        }

        alert("NF e Financeiro lançados com sucesso!");
        // Redireciona para a visualização da NF específica
        window.location.href = `notas_ver.html?id=${nf.id}`;

    } catch (error) {
        console.error(error);
        alert("Erro ao salvar: " + error.message);
    }
}
