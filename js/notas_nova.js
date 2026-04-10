// ===============================================
//  NOTAS_NOVA.JS — FINAL 100% CORRIGIDO
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

// ==========================
// FORMATAR DINHEIRO BR
// ==========================
function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ==========================
// CLIENTES / PRODUTOS
// ==========================
async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("id, razao_social");
    listaClientes = data || [];

    const select = document.getElementById("clienteSelect");
    select.innerHTML = `<option value="">Selecione</option>`;
    listaClientes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.razao_social;
        select.appendChild(opt);
    });
}

async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("*");
    listaProdutos = data || [];

    const select = document.getElementById("produtoSelect");
    select.innerHTML = `<option value="">Selecione</option>`;
    listaProdutos.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.codigo} - ${p.descricao}`;
        select.appendChild(opt);
    });
}

// ==========================
// EVENTOS
// ==========================
function configurarEventos() {
    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
}

// ==========================
// ITENS
// ==========================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);

    if (!produtoId || quantidade <= 0) {
        return alert("Informe produto e quantidade");
    }

    const prod = listaProdutos.find(p => p.id === produtoId);

    itensNF.push({
        produto_id: produtoId,
        quantidade,
        valor_unitario: prod.valor_unitario,
        subtotal: quantidade * prod.valor_unitario
    });

    atualizarTabelaItens();
}

// ==========================
function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    tbody.innerHTML = "";

    itensNF.forEach((item, i) => {
        const prod = listaProdutos.find(p => p.id === item.produto_id);

        tbody.innerHTML += `
        <tr>
            <td>${prod.codigo} - ${prod.descricao}</td>
            <td>${formatarMoeda(item.valor_unitario)}</td>
            <td>${item.quantidade}</td>
            <td>${formatarMoeda(item.subtotal)}</td>
            <td>
                <button onclick="editarItem(${i})">✏️</button>
                <button onclick="removerItem(${i})">❌</button>
            </td>
        </tr>
        `;
    });

    atualizarTotalNF();
}

// ==========================
function atualizarTotalNF() {
    const total = itensNF.reduce((acc, i) => acc + i.subtotal, 0);

    let el = document.getElementById("totalNFDisplay");

    if (!el) {
        el = document.createElement("h3");
        el.id = "totalNFDisplay";
        document.querySelector(".card").appendChild(el);
    }

    el.innerHTML = `Total da NF: ${formatarMoeda(total)}`;
}

// ==========================
// EDITAR / REMOVER
// ==========================
window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
};

window.editarItem = (i) => {
    const item = itensNF[i];

    document.getElementById("produtoSelect").value = item.produto_id;
    document.getElementById("quantidadeNF").value = item.quantidade;

    itensNF.splice(i, 1);
    atualizarTabelaItens();
};

// ==========================
// PARCELAS AUTOMÁTICAS
// ==========================
function gerarParcelas() {
    const total = itensNF.reduce((acc, i) => acc + i.subtotal, 0);
    const numeroNF = document.getElementById("nfNumero").value;

    const qtd = prompt("Quantidade de parcelas?");
    if (!qtd) return;

    boletos = [];

    for (let i = 1; i <= qtd; i++) {
        const data = new Date();
        data.setMonth(data.getMonth() + i);

        const letra = String.fromCharCode(64 + i);

        boletos.push({
            origem: `${numeroNF} - ${letra}`,
            valor: total / qtd,
            vencimento: data
        });
    }

    atualizarTabelaBoletos();
}

// ==========================
function formatarDataBR(data) {
    return data.toLocaleDateString("pt-BR");
}

// ==========================
function atualizarTabelaBoletos() {
    const tbody = document.getElementById("tbodyBoletos");
    tbody.innerHTML = "";

    boletos.forEach((b, i) => {
        tbody.innerHTML += `
        <tr>
            <td>${b.origem}</td>
            <td>${formatarMoeda(b.valor)}</td>
            <td>${formatarDataBR(new Date(b.vencimento))}</td>
            <td>
                <button onclick="editarBoleto(${i})">✏️</button>
                <button onclick="removerBoleto(${i})">❌</button>
            </td>
        </tr>
        `;
    });
}

window.removerBoleto = (i) => {
    boletos.splice(i, 1);
    atualizarTabelaBoletos();
};

// ==========================
// SALVAR NF COMPLETO
// ==========================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;

    const total = itensNF.reduce((acc, i) => acc + i.subtotal, 0);

    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0) {
        return alert("Preencha tudo!");
    }

    try {
        // 1. SALVAR NF
        const { data: nf, error } = await supabase
            .from("notas_fiscais")
            .insert({
                cliente_id: clienteId,
                numero_nf: numeroNF,
                data_nf: dataNF, // CORRIGIDO (era dados_nf)
                total: total
            })
            .select()
            .single();

        if (error) throw error;

        // 2. SALVAR ITENS
        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade
            });
        }

        // 3. SALVAR BOLETOS
        for (const b of boletos) {
            await supabase.from("boletos").insert({
                nf_id: nf.id,
                descricao: b.origem,
                valor: b.valor,
                data_vencimento: new Date(b.vencimento).toISOString(),
                status: "ABERTO"
            });
        }

        alert("SALVO COM SUCESSO!");
        location.reload();

    } catch (err) {
        console.error(err);
        alert("Erro: " + err.message);
    }
}
