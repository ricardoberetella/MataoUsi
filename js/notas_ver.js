import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let cacheProdutos = [];

// ===============================
// FORMATAR DATA
// ===============================
function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    return new Date(dataISO).toLocaleDateString("pt-BR");
}

// ===============================
// INICIAR
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = new URLSearchParams(window.location.search).get("id");
    if (!nfId) {
        alert("NF não encontrada");
        return;
    }

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
    await carregarBoletos();
});

// ===============================
// CACHE PRODUTOS
// ===============================
async function carregarProdutosCache() {
    const { data } = await supabase
        .from("produtos")
        .select("id, codigo, descricao");

    cacheProdutos = data || [];
}

function nomeProduto(id) {
    const p = cacheProdutos.find(x => x.id === id);
    return p ? `${p.codigo} - ${p.descricao}` : `ID ${id}`;
}

// ===============================
// DADOS NF
// ===============================
async function carregarDadosNF() {
    const { data } = await supabase
        .from("notas_fiscais")
        .select("numero_nf, data_nf, clientes(razao_social)")
        .eq("id", nfId)
        .single();

    document.getElementById("nfNumero").textContent = data.numero_nf;
    document.getElementById("nfData").textContent = formatarDataBR(data.data_nf);
    document.getElementById("nfCliente").textContent = data.clientes?.razao_social || "—";
}

// ===============================
// ITENS NF
// ===============================
async function carregarItensNF() {
    const tbody = document.getElementById("listaItens");

    const { data } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">Nenhum item</td></tr>`;
        return;
    }

    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td>${nomeProduto(i.produto_id)}</td>
                <td style="text-align:right">${i.quantidade}</td>
            </tr>
        `;
    });
}

// ===============================
// BAIXAS
// ===============================
async function carregarBaixas() {
    const tbody = document.getElementById("listaBaixas");

    const { data } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id, produto_id, quantidade_baixada")
        .eq("nf_id", nfId);

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">Nenhuma baixa</td></tr>`;
        return;
    }

    data.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.pedido_id}</td>
                <td>${nomeProduto(b.produto_id)}</td>
                <td style="text-align:right">${b.quantidade_baixada}</td>
                <td>Baixado</td>
            </tr>
        `;
    });
}

// ===============================
// BOLETOS (EDITAR + EXCLUIR)
// ===============================
async function carregarBoletos() {
    const tbody = document.getElementById("listaBoletos");

    const { data, error } = await supabase
        .from("boletos")
        .select("*")
        .eq("nota_fiscal_id", nfId)
        .order("data_vencimento");

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar boletos</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Nenhum boleto cadastrado</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    data.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.origem || "—"}</td>
                <td>${b.tipo_nf}</td>
                <td style="text-align:right">R$ ${Number(b.valor).toFixed(2)}</td>
                <td>${formatarDataBR(b.data_vencimento)}</td>
                <td style="text-align:center">
                    <button class="btn-azul" onclick="editarBoleto(${b.id})">Editar</button>
                    <button class="btn-vermelho" onclick="excluirBoleto(${b.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

// ===============================
// EXCLUIR BOLETO
// ===============================
window.excluirBoleto = async function (id) {
    if (!confirm("Deseja realmente excluir este boleto?")) return;

    const { error } = await supabase
        .from("boletos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir boleto");
        console.error(error);
        return;
    }

    carregarBoletos();
};

// ===============================
// EDITAR BOLETO (SIMPLES)
// ===============================
window.editarBoleto = async function (id) {
    const { data, error } = await supabase
        .from("boletos")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        alert("Erro ao carregar boleto");
        return;
    }

    const novaOrigem = prompt("Origem:", data.origem || "");
    if (novaOrigem === null) return;

    const novoValor = prompt("Valor:", data.valor);
    if (novoValor === null || isNaN(novoValor)) return;

    const novaData = prompt(
        "Data de vencimento (YYYY-MM-DD):",
        data.data_vencimento
    );
    if (novaData === null) return;

    const { error: erroUpdate } = await supabase
        .from("boletos")
        .update({
            origem: novaOrigem,
            valor: Number(novoValor),
            data_vencimento: novaData
        })
        .eq("id", id);

    if (erroUpdate) {
        alert("Erro ao atualizar boleto");
        console.error(erroUpdate);
        return;
    }

    carregarBoletos();
};
