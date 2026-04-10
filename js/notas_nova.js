import { supabase } from "./supabaseClient.js";

let itensNF = [];
let boletosNF = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarClientes();
    carregarProdutos();

    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnAdicionarParcela").onclick = adicionarParcela;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
});

// ==========================
// 🔹 CARREGAR CLIENTES
// ==========================
async function carregarClientes() {
    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome");

    if (error) {
        console.error("Erro clientes:", error);
        return;
    }

    const select = document.getElementById("clienteSelect");
    select.innerHTML = `<option value="">Selecione o cliente</option>`;

    data.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    });
}

// ==========================
// 🔹 CARREGAR PRODUTOS
// ==========================
async function carregarProdutos() {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("nome");

    if (error) {
        console.error("Erro produtos:", error);
        return;
    }

    const select = document.getElementById("produtoSelect");
    select.innerHTML = `<option value="">Selecione o produto</option>`;

    data.forEach(p => {
        select.innerHTML += `
            <option value="${p.id}" data-valor="${p.valor || 0}">
                ${p.nome}
            </option>
        `;
    });
}

// ==========================
// FORMATAÇÃO
// ==========================
function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2
    });
}

// ==========================
// ITENS
// ==========================
function adicionarItem() {
    const produtoSelect = document.getElementById("produtoSelect");
    const quantidade = Number(document.getElementById("quantidadeNF").value);

    if (!produtoSelect.value || !quantidade) {
        alert("Preencha produto e quantidade");
        return;
    }

    const valorUnitario = Number(produtoSelect.selectedOptions[0].dataset.valor);
    const total = valorUnitario * quantidade;

    itensNF.push({
        produto_id: produtoSelect.value,
        nome: produtoSelect.selectedOptions[0].text,
        quantidade,
        valor_unitario: valorUnitario,
        total
    });

    renderItens();
    atualizarTotalNF();
}

function renderItens() {
    const tbody = document.getElementById("tbodyItensNF");
    tbody.innerHTML = "";

    itensNF.forEach((item, i) => {
        tbody.innerHTML += `
        <tr>
            <td>${item.nome}</td>
            <td>R$ ${formatarMoeda(item.valor_unitario)}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${formatarMoeda(item.total)}</td>
            <td>
                <button onclick="removerItem(${i})">❌</button>
            </td>
        </tr>`;
    });
}

window.removerItem = (i) => {
    itensNF.splice(i, 1);
    renderItens();
    atualizarTotalNF();
};

// ==========================
// TOTAL
// ==========================
function atualizarTotalNF() {
    const total = itensNF.reduce((s, i) => s + i.total, 0);
    document.getElementById("valorTotalNF").value = formatarMoeda(total);
}

// ==========================
// BOLETOS
// ==========================
function adicionarParcela() {
    const numeroNF = document.getElementById("nfNumero").value;
    const parcela = Number(document.getElementById("parcelaInput").value);
    const valor = Number(document.getElementById("valorParcelaInput").value);
    const vencimento = document.getElementById("vencimentoInput").value;

    const letra = String.fromCharCode(64 + parcela);

    boletosNF.push({
        codigo: `${numeroNF} - ${letra}`,
        valor,
        vencimento
    });

    renderBoletos();
}

function gerarParcelas() {
    const total = itensNF.reduce((s, i) => s + i.total, 0);
    const qtd = Number(prompt("Qtd parcelas"));

    boletosNF = [];

    for (let i = 1; i <= qtd; i++) {
        const letra = String.fromCharCode(64 + i);

        const data = new Date();
        data.setMonth(data.getMonth() + i);

        boletosNF.push({
            codigo: `${document.getElementById("nfNumero").value} - ${letra}`,
            valor: total / qtd,
            vencimento: data.toISOString().split("T")[0]
        });
    }

    renderBoletos();
}

function renderBoletos() {
    const tbody = document.getElementById("tbodyBoletos");
    tbody.innerHTML = "";

    boletosNF.forEach((b, i) => {
        const dataBR = new Date(b.vencimento).toLocaleDateString("pt-BR");

        tbody.innerHTML += `
        <tr>
            <td>${b.codigo}</td>
            <td>R$ ${formatarMoeda(b.valor)}</td>
            <td>${dataBR}</td>
            <td>
                <button onclick="removerParcela(${i})">❌</button>
            </td>
        </tr>`;
    });
}

window.removerParcela = (i) => {
    boletosNF.splice(i, 1);
    renderBoletos();
};

// ==========================
// SALVAR
// ==========================
async function salvarNF() {
    try {
        const cliente_id = document.getElementById("clienteSelect").value;
        const numero_nf = document.getElementById("nfNumero").value;
        const data_nf = document.getElementById("nfData").value;

        const total = itensNF.reduce((s, i) => s + i.total, 0);

        // NF
        const { data: nf, error } = await supabase
            .from("notas_fiscais")
            .insert([{
                cliente_id,
                numero_nf,
                data_nf,
                total,
                tipo: "NF"
            }])
            .select()
            .single();

        if (error) throw error;

        const nf_id = nf.id;

        // ITENS
        const itens = itensNF.map(i => ({
            nf_id,
            produto_id: i.produto_id,
            quantidade: i.quantidade
        }));

        await supabase.from("notas_fiscais_itens").insert(itens);

        // BOLETOS
        if (boletosNF.length > 0) {
            const boletos = boletosNF.map(b => ({
                nf_id,
                codigo: b.codigo,
                valor: b.valor,
                data_vencimento: b.vencimento,
                status: "ABERTO"
            }));

            await supabase.from("boletos").insert(boletos);
        }

        // BAIXAS
        const baixas = itensNF.map(i => ({
            nf_id,
            produto_id: i.produto_id,
            baixada: i.quantidade
        }));

        await supabase.from("notas_pedidos_baixas").insert(baixas);

        alert("NF salva completa!");
        location.reload();

    } catch (err) {
        console.error(err);
        alert("Erro: " + err.message);
    }
}
