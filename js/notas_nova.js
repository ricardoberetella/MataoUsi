import { supabase } from "./supabaseClient.js";

let itensNF = [];
let boletosNF = [];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnAdicionarParcela").onclick = adicionarParcela;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
});

// ==========================
// FORMATAÇÕES
// ==========================
function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function parseMoeda(valor) {
    return Number(valor.toString().replace(",", "."));
}

// ==========================
// ITENS
// ==========================
function adicionarItem() {
    const produtoSelect = document.getElementById("produtoSelect");
    const quantidade = Number(document.getElementById("quantidadeNF").value);

    const produtoId = produtoSelect.value;
    const produtoNome = produtoSelect.options[produtoSelect.selectedIndex]?.text;

    if (!produtoId || !quantidade) {
        alert("Preencha produto e quantidade");
        return;
    }

    const valorUnitario = Number(produtoSelect.selectedOptions[0].dataset.valor || 0);
    const total = valorUnitario * quantidade;

    itensNF.push({
        produto_id: produtoId,
        nome: produtoNome,
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

    itensNF.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${item.nome}</td>
                <td>R$ ${formatarMoeda(item.valor_unitario)}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${formatarMoeda(item.total)}</td>
                <td>
                    <button onclick="editarItem(${index})">✏️</button>
                    <button onclick="removerItem(${index})">❌</button>
                </td>
            </tr>
        `;
    });
}

window.removerItem = (index) => {
    itensNF.splice(index, 1);
    renderItens();
    atualizarTotalNF();
};

window.editarItem = (index) => {
    const item = itensNF[index];
    document.getElementById("quantidadeNF").value = item.quantidade;
    itensNF.splice(index, 1);
    renderItens();
    atualizarTotalNF();
};

// ==========================
// TOTAL NF
// ==========================
function atualizarTotalNF() {
    const total = itensNF.reduce((soma, item) => soma + item.total, 0);
    document.getElementById("valorTotalNF").value = formatarMoeda(total);
}

// ==========================
// BOLETOS
// ==========================
function adicionarParcela() {
    const numeroNF = document.getElementById("nfNumero").value;
    const parcela = document.getElementById("parcelaInput").value;
    const valor = parseMoeda(document.getElementById("valorParcelaInput").value);
    const vencimento = document.getElementById("vencimentoInput").value;

    const letra = String.fromCharCode(64 + Number(parcela));
    const codigo = `${numeroNF} - ${letra}`;

    boletosNF.push({
        codigo,
        valor,
        vencimento
    });

    renderBoletos();
}

function gerarParcelas() {
    const total = itensNF.reduce((soma, i) => soma + i.total, 0);
    const qtd = Number(prompt("Quantidade de parcelas:"));

    if (!qtd) return;

    boletosNF = [];

    const valorParcela = total / qtd;
    const numeroNF = document.getElementById("nfNumero").value;

    for (let i = 1; i <= qtd; i++) {
        const letra = String.fromCharCode(64 + i);

        const data = new Date();
        data.setMonth(data.getMonth() + i);

        boletosNF.push({
            codigo: `${numeroNF} - ${letra}`,
            valor: valorParcela,
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
                    <button onclick="editarParcela(${i})">✏️</button>
                    <button onclick="removerParcela(${i})">❌</button>
                </td>
            </tr>
        `;
    });
}

window.removerParcela = (i) => {
    boletosNF.splice(i, 1);
    renderBoletos();
};

// ==========================
// SALVAR NF COMPLETO
// ==========================
async function salvarNF() {
    try {
        const cliente_id = document.getElementById("clienteSelect").value;
        const numero_nf = document.getElementById("nfNumero").value;
        const data_nf = document.getElementById("nfData").value;

        if (!cliente_id || !numero_nf) {
            alert("Preencha cliente e número");
            return;
        }

        const total = itensNF.reduce((soma, i) => soma + i.total, 0);

        // 1️⃣ SALVAR NF
        const { data: nf, error: errNF } = await supabase
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

        if (errNF) throw errNF;

        const nf_id = nf.id;

        // 2️⃣ SALVAR ITENS
        const itensInsert = itensNF.map(i => ({
            nf_id,
            produto_id: i.produto_id,
            quantidade: i.quantidade
        }));

        const { error: errItens } = await supabase
            .from("notas_fiscais_itens")
            .insert(itensInsert);

        if (errItens) throw errItens;

        // 3️⃣ SALVAR BOLETOS
        const boletosInsert = boletosNF.map(b => ({
            nf_id,
            codigo: b.codigo,
            valor: b.valor,
            data_vencimento: b.vencimento,
            status: "ABERTO"
        }));

        if (boletosInsert.length > 0) {
            const { error: errBol } = await supabase
                .from("boletos")
                .insert(boletosInsert);

            if (errBol) throw errBol;
        }

        // 4️⃣ BAIXAS (simples exemplo automático)
        const baixas = itensNF.map(i => ({
            nf_id,
            produto_id: i.produto_id,
            baixada: i.quantidade
        }));

        await supabase.from("notas_pedidos_baixas").insert(baixas);

        alert("NF salva COMPLETA com sucesso!");

        location.reload();

    } catch (err) {
        console.error(err);
        alert("Erro ao salvar: " + err.message);
    }
}
