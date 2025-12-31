// ================================
// IMPORTAÇÃO
// ================================
import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let listaClientes = [];
let listaProdutos = [];

// ================================
// INICIAR TELA
// ================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = obterIdURL();
    if (!nfId) {
        alert("NF não encontrada!");
        window.location.href = "notas_lista.html";
        return;
    }

    await carregarClientes();
    await carregarProdutos();
    await carregarNF();

    document.getElementById("btnSalvar").addEventListener("click", salvarNF);
});

function obterIdURL() {
    const url = new URL(window.location.href);
    return url.searchParams.get("id");
}

// ================================
// CARREGAR CLIENTES
// ================================
async function carregarClientes() {
    const select = document.getElementById("clienteSelect");
    select.innerHTML = "<option value=''>Carregando...</option>";

    const { data, error } = await supabase
        .from("clientes")
        .select("id, razao_social")
        .order("razao_social", { ascending: true });

    if (error) {
        console.error(error);
        alert("Erro ao carregar clientes.");
        return;
    }

    listaClientes = data;

    select.innerHTML = "<option value=''>Selecione</option>";

    data.forEach(cli => {
        const opt = document.createElement("option");
        opt.value = cli.id;
        opt.textContent = cli.razao_social;
        select.appendChild(opt);
    });
}

// ================================
// CARREGAR PRODUTOS
// ================================
async function carregarProdutos() {
    const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao");

    listaProdutos = data || [];
}

// ================================
// CARREGAR NF
// ================================
async function carregarNF() {
    // NF
    const { data: nf } = await supabase
        .from("notas_fiscais")
        .select("id, cliente_id, numero_nf, data_nf")
        .eq("id", nfId)
        .single();

    if (!nf) {
        alert("NF não encontrada!");
        return;
    }

    document.getElementById("clienteSelect").value = nf.cliente_id;
    document.getElementById("nfNumero").value = nf.numero_nf;
    document.getElementById("nfData").value = nf.data_nf;

    // Itens
    const { data: itens } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    preencherItens(itens);
}

function preencherItens(itens) {
    const tbody = document.getElementById("listaItens");
    tbody.innerHTML = "";

    itens.forEach(item => {
        const prod = listaProdutos.find(p => p.id === item.produto_id);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${prod?.codigo} - ${prod?.descricao}</td>
            <td style="text-align:right;">${item.quantidade}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ================================
// SALVAR ALTERAÇÕES
// ================================
async function salvarNF() {
    const clienteId = document.getElementById("clienteSelect").value;
    const numeroNF = document.getElementById("nfNumero").value.trim();
    const dataNF = document.getElementById("nfData").value;

    if (!clienteId || !numeroNF || !dataNF) {
        alert("Preencha todos os campos.");
        return;
    }

    const { error } = await supabase
        .from("notas_fiscais")
        .update({
            cliente_id: clienteId,
            numero_nf: numeroNF,
            data_nf: dataNF
        })
        .eq("id", nfId);

    if (error) {
        console.error(error);
        alert("Erro ao salvar alterações.");
        return;
    }

    alert("Nota Fiscal atualizada com sucesso!");
    window.location.href = "notas_ver.html?id=" + nfId;
}
