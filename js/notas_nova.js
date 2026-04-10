// ===============================================
//  NOTAS_NOVA.JS — VERSÃO FINAL (CORREÇÃO DE COLUNAS)
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

function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);
    if (!produtoId || quantidade <= 0) return alert("Selecione produto e quantidade.");
    itensNF.push({ produto_id: produtoId, quantidade });
    atualizarTabelaItens();
}

function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    if (!tbody) return;
    tbody.innerHTML = "";
    itensNF.forEach((item, i) => {
        const prod = listaProdutos.find(p => p.id === item.produto_id);
        tbody.innerHTML += `<tr><td>${prod?.codigo} - ${prod?.descricao}</td><td>${item.quantidade}</td><td><button type="button" onclick="removerItem(${i})">Remover</button></td></tr>`;
    });
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
};

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
        tbody.innerHTML += `<tr><td>${b.parcela}</td><td>R$ ${b.valor.toFixed(2)}</td><td>${b.vencimento}</td><td><button type="button" onclick="removerParcela(${i})">Remover</button></td></tr>`;
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
        boletos.push({ parcela: String.fromCharCode(64 + i), valor: total / qtd, vencimento: venc.toISOString().split("T")[0] });
    }
    atualizarTabelaBoletos();
}

async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;
    
    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Preencha todos os campos, itens e boletos.");
    }

    const clienteObj = listaClientes.find(c => c.id === clienteId);
    const nomeCliente = clienteObj ? clienteObj.razao_social : "Cliente";
    const totalFinal = boletos.reduce((acc, b) => acc + b.valor, 0);

    try {
        // 1. INSERIR NOTA FISCAL (Corrigido para 'data_nf' conforme erro de cache)
        const { data: nf, error: errNF } = await supabase
            .from("notas_fiscais")
            .insert({
                cliente_id: clienteId,
                numero_nf: numeroNF,
                data_nf: dataNF, 
                total: totalFinal
            })
            .select().single();

        if (errNF) throw new Error("Erro NF: " + errNF.message);

        // 2. INSERIR ITENS
        for (const item of itensNF) {
            const { error: errIten } = await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                q: item.quantidade
            });
            if (errIten) console.error("Erro no item:", errIten);
        }

        // 3. FINANCEIRO
        for (const b of boletos) {
            const ref = `${numeroNF}${b.parcela}`;

            // TABELA BOLETOS
            const { data: novoBoleto, error: errB } = await supabase.from("boletos").insert({
                nota_fiscal_id: nf.id,
                numero_nf_referencia: ref,
                valor: b.valor,
                data_vencimento: b.vencimento,
                status: "ABERTO"
            }).select().single();

            // TABELA CONTAS RECEBER (Aparecer no Print 2)
            await supabase.from("contas_receber").insert({
                origem: ref,
                valor: b.valor,
                vencimento: b.vencimento,
                status: "ABERTO",
                cliente: nomeCliente
            });

            // TABELA EXTRATO FINANCEIRO (Aparecer no Print 3)
            await supabase.from("extrato_financeiro").insert({
                data: b.vencimento,
                banco: "SICOOB",
                descricao: `NF ${ref} - ${nomeCliente}`,
                valor: b.valor,
                status: "PENDENTE"
            });
        }

        alert("Sucesso! NF e Financeiro processados. 🚀");
        window.location.href = "notas_lista.html";

    } catch (error) {
        console.error("ERRO:", error);
        alert(error.message);
    }
}
