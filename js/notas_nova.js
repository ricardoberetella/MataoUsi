// ===============================================
//  NOTAS_NOVA.JS — VERSÃO FINAL AJUSTADA
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

        boletos.push({
            numero: `${numeroNF}-${i}`,
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
        tbody.innerHTML += `<tr><td>${b.numero}</td><td>R$ ${b.valor.toFixed(2)}</td><td>${b.vencimento}</td></tr>`;
    });
}

// ===============================================
// SALVAR NF + BOLETOS + FINANCEIRO AUTOMÁTICO
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Preencha tudo e gere as parcelas.");
    }

    const totalNF = itensNF.reduce((acc, item) => acc + item.subtotal, 0);

    try {
        // 1. NOTA
        const { data: nf, error } = await supabase
            .from("notas_fiscais")
            .insert({ cliente_id: clienteId, numero_nf: numeroNF, data_nf: dataNF, total: totalNF })
            .select()
            .single();

        if (error) throw error;

        // 2. ITENS
        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                q: item.quantidade
            });
        }

        // 3. BOLETOS + CONTAS + EXTRATO
        for (const b of boletos) {

            // BOLETO
            const { data: boleto } = await supabase
                .from("boletos")
                .insert({
                    nota_fiscal_id: nf.id,
                    numero_documento: b.numero,
                    valor: b.valor,
                    data_vencimento: b.vencimento,
                    status: "ABERTO"
                })
                .select()
                .single();

            // CONTAS A RECEBER
            await supabase.from("contas_receber").insert({
                boleto_id: boleto.id,
                nota_fiscal_id: nf.id,
                valor: b.valor,
                data_vencimento: b.vencimento,
                status: "ABERTO"
            });

            // EXTRATO (sua tabela real)
            await supabase.from("inserir_movimentos").insert({
                cliente_id: clienteId,
                tipo: "entrada",
                valor: b.valor,
                data: b.vencimento,
                observacao: `NF ${numeroNF}`
            });
        }

        alert("✅ NF salva com financeiro automático!");
        window.location.href = `notas_ver.html?id=${nf.id}`;

    } catch (err) {
        console.error(err);
        alert("Erro ao salvar: " + err.message);
    }
}
