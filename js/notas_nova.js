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

// ================= CLIENTES =================
async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("id, razao_social");
    listaClientes = data || [];

    const select = document.getElementById("clienteSelect");
    select.innerHTML = `<option value="">Selecione</option>`;

    listaClientes.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.razao_social}</option>`;
    });
}

// ================= PRODUTOS =================
async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("*");
    listaProdutos = data || [];

    const select = document.getElementById("produtoSelect");
    select.innerHTML = `<option value="">Selecione</option>`;

    listaProdutos.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.descricao}</option>`;
    });
}

// ================= EVENTOS =================
function configurarEventos() {
    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
}

// ================= ITENS =================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);

    if (!produtoId || !quantidade) {
        alert("Preencha produto e quantidade");
        return;
    }

    const produto = listaProdutos.find(p => p.id === produtoId);

    const item = {
        produto_id: produtoId,
        quantidade,
        valor_unitario: produto.valor_unitario,
        subtotal: quantidade * produto.valor_unitario
    };

    itensNF.push(item);

    atualizarTabelaItens();
    atualizarTotalNF();
}

// ================= TABELA ITENS =================
function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    tbody.innerHTML = "";

    itensNF.forEach((item, i) => {
        const prod = listaProdutos.find(p => p.id === item.produto_id);

        tbody.innerHTML += `
        <tr>
            <td>${prod.codigo} - ${prod.descricao}</td>
            <td>R$ ${formatarValor(item.valor_unitario)}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${formatarValor(item.subtotal)}</td>
            <td>
                <button onclick="editarItem(${i})">✏️</button>
                <button onclick="removerItem(${i})">❌</button>
            </td>
        </tr>`;
    });
}

function removerItem(i) {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
    atualizarTotalNF();
}
window.removerItem = removerItem;

function editarItem(i) {
    const novaQtd = prompt("Nova quantidade:");
    if (!novaQtd) return;

    itensNF[i].quantidade = Number(novaQtd);
    itensNF[i].subtotal = itensNF[i].quantidade * itensNF[i].valor_unitario;

    atualizarTabelaItens();
    atualizarTotalNF();
}
window.editarItem = editarItem;

// ================= TOTAL =================
function atualizarTotalNF() {
    const total = itensNF.reduce((acc, i) => acc + i.subtotal, 0);

    document.getElementById("valorTotalNF").value =
        total.toFixed(2).replace(".", ",");

    return total;
}

// ================= BOLETOS =================
function gerarParcelas() {
    const total = atualizarTotalNF();
    const numeroNF = document.getElementById("nfNumero").value;

    const qtd = Number(prompt("Quantidade de parcelas"));
    if (!qtd) return;

    boletos = [];

    for (let i = 1; i <= qtd; i++) {
        let data = new Date();
        data.setMonth(data.getMonth() + i);

        boletos.push({
            origem: `${numeroNF} - ${String.fromCharCode(64 + i)}`,
            valor: total / qtd,
            vencimento: formatarData(data)
        });
    }

    atualizarTabelaBoletos();
}

function atualizarTabelaBoletos() {
    const tbody = document.getElementById("tbodyBoletos");
    tbody.innerHTML = "";

    boletos.forEach((b, i) => {
        tbody.innerHTML += `
        <tr>
            <td>${b.origem}</td>
            <td>R$ ${formatarValor(b.valor)}</td>
            <td>${b.vencimento}</td>
            <td>
                <button onclick="removerBoleto(${i})">❌</button>
            </td>
        </tr>`;
    });
}

function removerBoleto(i) {
    boletos.splice(i, 1);
    atualizarTabelaBoletos();
}
window.removerBoleto = removerBoleto;

// ================= SALVAR =================
async function salvarNF() {
    try {
        const clienteId = Number(document.getElementById("clienteSelect").value);
        const numeroNF = document.getElementById("nfNumero").value;
        const dataNF = document.getElementById("nfData").value;

        const total = atualizarTotalNF();

        if (!clienteId || !numeroNF || !dataNF) {
            alert("Preencha os dados da NF");
            return;
        }

        // ===== SALVA NF =====
        const { data: nf, error } = await supabase
            .from("notas_fiscais")
            .insert({
                cliente_id: clienteId,
                numero_nf: numeroNF,
                data_nf: dataNF,
                total: total
            })
            .select()
            .single();

        if (error) throw error;

        // ===== SALVA ITENS (USANDO COLUNA q DO SEU BANCO) =====
        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                q: item.quantidade
            });
        }

        // ===== SALVA BAIXA NOS PEDIDOS =====
        for (const item of itensNF) {
            await supabase.from("notas_pedidos_baixas").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                baixada: item.quantidade
            });
        }

        // ===== SALVA BOLETOS =====
        for (const b of boletos) {
            await supabase.from("contas_receber").insert({
                nf_id: nf.id,
                nf_origem: b.origem,
                valor: b.valor,
                vencimento: converterDataISO(b.vencimento),
                status: "ABERTO"
            });
        }

        alert("NF COMPLETA SALVA COM SUCESSO!");

        location.reload();

    } catch (err) {
        console.error(err);
        alert("Erro: " + err.message);
    }
}

// ================= HELPERS =================
function formatarValor(v) {
    return Number(v).toFixed(2).replace(".", ",");
}

function formatarData(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function converterDataISO(dataBR) {
    const [d, m, y] = dataBR.split("/");
    return `${y}-${m}-${d}`;
}
