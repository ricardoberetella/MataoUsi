import { supabase, verificarLogin } from "./auth.js";

let listaClientes = [];
let listaProdutos = [];
let itensNF = [];
let boletos = [];
let editIndex = null;

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    await carregarClientes();
    await carregarProdutos();
    configurarEventos();
});

// ================= LOAD =================
async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("id, razao_social").order("razao_social");
    listaClientes = data || [];

    const select = document.getElementById("clienteSelect");
    select.innerHTML = `<option value="">Selecione</option>`;

    listaClientes.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.razao_social}</option>`;
    });
}

async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("*").order("codigo");
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
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
    document.getElementById("btnAdicionarParcela").onclick = adicionarParcelaManual;
}

// ================= ITENS =================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const qtd = Number(document.getElementById("quantidadeNF").value);

    if (!produtoId || qtd <= 0) return alert("Preencha corretamente");

    const prod = listaProdutos.find(p => p.id === produtoId);
    const valor = prod.valor_unitario;
    const subtotal = valor * qtd;

    if (editIndex !== null) {
        itensNF[editIndex] = { produto_id: produtoId, quantidade: qtd, valor_unitario: valor, subtotal };
        editIndex = null;
    } else {
        itensNF.push({ produto_id: produtoId, quantidade: qtd, valor_unitario: valor, subtotal });
    }

    atualizarTabelaItens();
}

function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    tbody.innerHTML = "";

    itensNF.forEach((item, i) => {
        const p = listaProdutos.find(x => x.id === item.produto_id);

        tbody.innerHTML += `
        <tr>
            <td>${p.codigo} - ${p.descricao}</td>
            <td>R$ ${item.valor_unitario.toFixed(2)}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${item.subtotal.toFixed(2)}</td>
            <td>
                <button onclick="editarItem(${i})">✏️</button>
                <button onclick="removerItem(${i})">❌</button>
            </td>
        </tr>`;
    });

    atualizarTotalNF();
}

function atualizarTotalNF() {
    const total = itensNF.reduce((a, b) => a + b.subtotal, 0);
    document.getElementById("valorTotalNF").value = total.toFixed(2);
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    atualizarTabelaItens();
};

window.editarItem = (i) => {
    const item = itensNF[i];
    document.getElementById("produtoSelect").value = item.produto_id;
    document.getElementById("quantidadeNF").value = item.quantidade;
    editIndex = i;
};

// ================= BOLETOS =================
function gerarParcelas() {
    const total = itensNF.reduce((a, b) => a + b.subtotal, 0);
    const qtd = prompt("Quantidade de parcelas:");

    boletos = [];

    for (let i = 1; i <= qtd; i++) {
        const letra = String.fromCharCode(64 + i);
        const numero = document.getElementById("nfNumero").value;

        let data = new Date();
        data.setMonth(data.getMonth() + i);

        boletos.push({
            numero: `${numero} - ${letra}`,
            valor: total / qtd,
            vencimento: formatarDataBR(data)
        });
    }

    atualizarTabelaBoletos();
}

function adicionarParcelaManual() {
    const parcela = document.getElementById("parcelaInput").value;
    const valor = Number(document.getElementById("valorParcelaInput").value);
    const venc = document.getElementById("vencimentoInput").value;

    boletos.push({
        numero: `${document.getElementById("nfNumero").value} - ${parcela}`,
        valor,
        vencimento: formatarDataBR(new Date(venc))
    });

    atualizarTabelaBoletos();
}

function atualizarTabelaBoletos() {
    const tbody = document.getElementById("tbodyBoletos");
    tbody.innerHTML = "";

    boletos.forEach((b, i) => {
        tbody.innerHTML += `
        <tr>
            <td>${b.numero}</td>
            <td>R$ ${b.valor.toFixed(2)}</td>
            <td>${b.vencimento}</td>
            <td>
                <button onclick="editarBoleto(${i})">✏️</button>
                <button onclick="removerBoleto(${i})">❌</button>
            </td>
        </tr>`;
    });
}

window.removerBoleto = (i) => {
    boletos.splice(i, 1);
    atualizarTabelaBoletos();
};

window.editarBoleto = (i) => {
    const b = boletos[i];
    const novoValor = prompt("Novo valor:", b.valor);
    if (novoValor) b.valor = Number(novoValor);
    atualizarTabelaBoletos();
};

// ================= SALVAR =================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;

    if (!clienteId || !numeroNF || !dataNF || itensNF.length === 0 || boletos.length === 0) {
        return alert("Preencha tudo");
    }

    const totalNF = itensNF.reduce((a, b) => a + b.subtotal, 0);

    try {
        const { data: nf, error } = await supabase
            .from("notas_fiscais")
            .insert({
                cliente_id: clienteId,
                numero_nf: numeroNF,
                dados_nf: dataNF,
                total: totalNF
            })
            .select();

        if (error) throw error;

        const nfId = nf[0].id;

        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nfId,
                produto_id: item.produto_id,
                q: item.quantidade
            });
        }

        for (const b of boletos) {
            await supabase.from("contas_receber").insert({
                nota_fiscal_id: nfId,
                valor: b.valor,
                data_vencimento: converterDataISO(b.vencimento),
                status: "ABERTO"
            });
        }

        alert("NF salva!");
        location.reload();

    } catch (e) {
        console.error(e);
        alert("Erro: " + e.message);
    }
}

// ================= UTILS =================
function formatarDataBR(data) {
    return data.toLocaleDateString("pt-BR");
}

function converterDataISO(dataBR) {
    const [d, m, a] = dataBR.split("/");
    return `${a}-${m}-${d}`;
}
