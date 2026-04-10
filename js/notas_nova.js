import { supabase, verificarLogin } from "./auth.js";

let listaClientes = [];
let listaProdutos = [];
let itensNF = [];
let boletos = [];

// ==========================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    await carregarClientes();
    await carregarProdutos();
    configurarEventos();
});

// ==========================
function formatarMoeda(v) {
    return v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ==========================
async function carregarClientes() {
    const { data } = await supabase.from("clientes").select("id, razao_social");
    listaClientes = data || [];

    const select = document.getElementById("clienteSelect");
    select.innerHTML = `<option value="">Selecione</option>`;

    listaClientes.forEach(c => {
        const o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.razao_social;
        select.appendChild(o);
    });
}

// ==========================
async function carregarProdutos() {
    const { data } = await supabase.from("produtos").select("*");
    listaProdutos = data || [];

    const select = document.getElementById("produtoSelect");
    select.innerHTML = `<option value="">Selecione</option>`;

    listaProdutos.forEach(p => {
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = `${p.codigo} - ${p.descricao}`;
        select.appendChild(o);
    });
}

// ==========================
function configurarEventos() {
    document.getElementById("btnAdicionarItem").onclick = adicionarItem;
    document.getElementById("btnGerarParcelas").onclick = gerarParcelas;
    document.getElementById("btnSalvarNF").onclick = salvarNF;
}

// ==========================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const qtd = Number(document.getElementById("quantidadeNF").value);

    if (!produtoId || qtd <= 0) return alert("Preencha corretamente");

    const prod = listaProdutos.find(p => p.id === produtoId);

    itensNF.push({
        produto_id: produtoId,
        quantidade: qtd,
        valor_unitario: prod.valor_unitario,
        subtotal: qtd * prod.valor_unitario
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

    let el = document.getElementById("totalNF");
    if (!el) {
        el = document.createElement("h3");
        el.id = "totalNF";
        document.querySelectorAll(".card")[1].appendChild(el);
    }

    el.innerHTML = `Total da NF: ${formatarMoeda(total)}`;
}

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
function gerarParcelas() {
    const total = itensNF.reduce((acc, i) => acc + i.subtotal, 0);
    const nf = document.getElementById("nfNumero").value;

    const qtd = prompt("Qtd parcelas?");
    if (!qtd) return;

    boletos = [];

    for (let i = 1; i <= qtd; i++) {
        let d = new Date();
        d.setMonth(d.getMonth() + i);

        boletos.push({
            origem: `${nf} - ${String.fromCharCode(64 + i)}`,
            valor: total / qtd,
            vencimento: d
        });
    }

    atualizarTabelaBoletos();
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
            <td>${b.vencimento.toLocaleDateString("pt-BR")}</td>
            <td>
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
// 💥 SALVAR COMPLETO (CORRIGIDO)
// ==========================
async function salvarNF() {

    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value;
    const dataNF = document.getElementById("nfData").value;

    const total = itensNF.reduce((acc, i) => acc + i.subtotal, 0);

    if (!clienteId || !numeroNF || !dataNF) {
        return alert("Preencha tudo");
    }

    try {
        // NF
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

        // ITENS
        for (const item of itensNF) {
            await supabase.from("notas_fiscais_itens").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade
            });

            // BAIXA
            await supabase.from("notas_pedidos_baixas").insert({
                nf_id: nf.id,
                produto_id: item.produto_id,
                baixada: item.quantidade
            });
        }

        // BOLETOS (AGORA CORRETO)
        for (const b of boletos) {
            await supabase.from("boletos").insert({
                tipo_movimento: "BOLETO",
                descricao: b.origem,
                valor: b.valor,
                data_vencimento: b.vencimento,
                status: "ABERTO",
                origem: numeroNF
            });
        }

        alert("SALVO PERFEITO 🔥");
        location.reload();

    } catch (e) {
        console.error(e);
        alert("Erro: " + e.message);
    }
}
