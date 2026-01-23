// ===============================================
// NOTAS_VER.JS — NF + ITENS + BAIXAS + BOLETOS
// CONTROLE DE PERMISSÃO (ADMIN / VIEWER)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let numeroNFAtual = null;
let cacheProdutos = [];
let boletoEditandoId = null;
let roleUsuario = "viewer";

// MODAL
let modalBoleto;
let boletoOrigem;
let boletoValor;
let boletoVencimento;

// ===============================================
// FORMATADORES
// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    return dataISO.split("T")[0].split("-").reverse().join("/");
}

function formatarMoedaBR(valor) {
    if (valor === null || valor === undefined) return "—";
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ===============================================
// INIT
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    const idUrl = new URLSearchParams(window.location.search).get("id");
    if (!idUrl) {
        alert("NF não encontrada");
        return;
    }

    nfId = Number(idUrl);

    modalBoleto = document.getElementById("modalBoleto");
    boletoOrigem = document.getElementById("boletoOrigem");
    boletoValor = document.getElementById("boletoValor");
    boletoVencimento = document.getElementById("boletoVencimento");

    const btnNovo = document.getElementById("btnNovoBoleto");
    const btnCancelar = document.getElementById("btnCancelarBoleto");
    const btnSalvar = document.getElementById("btnSalvarBoleto");

    // 🔒 PERMISSÃO
    if (roleUsuario !== "admin") {
        if (btnNovo) btnNovo.style.display = "none";
    } else {
        if (btnNovo) btnNovo.onclick = abrirModalNovo;
        if (btnSalvar) btnSalvar.onclick = salvarBoleto;
    }

    if (btnCancelar) btnCancelar.onclick = fecharModal;

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
    await carregarBoletos();
});

// ===============================================
// PRODUTOS
// ===============================================
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

// ===============================================
// DADOS NF
// ===============================================
async function carregarDadosNF() {
    const { data } = await supabase
        .from("notas_fiscais")
        .select("numero_nf, data_nf, clientes(razao_social)")
        .eq("id", nfId)
        .single();

    if (!data) return;

    numeroNFAtual = data.numero_nf;

    nfNumero.textContent = data.numero_nf;
    nfData.textContent = formatarDataBR(data.data_nf);
    nfCliente.textContent = data.clientes?.razao_social || "—";
}

// ===============================================
// ITENS NF
// ===============================================
async function carregarItensNF() {
    const tbody = document.getElementById("listaItens");
    tbody.innerHTML = "";

    const { data } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">Nenhum item</td></tr>`;
        return;
    }

    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td>${nomeProduto(i.produto_id)}</td>
                <td>${i.quantidade}</td>
            </tr>`;
    });
}

// ===============================================
// BAIXAS
// ===============================================
async function carregarBaixas() {
    const tbody = document.getElementById("listaBaixas");
    tbody.innerHTML = "";

    const { data: baixas } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id, produto_id, quantidade_baixada")
        .eq("nf_id", nfId);

    if (!baixas || baixas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">Nenhuma baixa</td></tr>`;
        return;
    }

    baixas.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.pedido_id}</td>
                <td>${nomeProduto(b.produto_id)}</td>
                <td>${b.quantidade_baixada}</td>
                <td>Concluído</td>
            </tr>`;
    });
}

// ===============================================
// BOLETOS
// ===============================================
async function carregarBoletos() {
    const tbody = document.getElementById("listaBoletos");
    tbody.innerHTML = "";

    const { data } = await supabase
        .from("boletos")
        .select("*")
        .eq("nota_fiscal_id", nfId)
        .order("data_vencimento");

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Nenhum boleto</td></tr>`;
        return;
    }

    data.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.tipo_nf === "NF" ? "Com NF" : "Sem NF"}</td>
                <td>${b.origem || "—"}</td>
                <td>${formatarMoedaBR(b.valor)}</td>
                <td>${formatarDataBR(b.data_vencimento)}</td>
                <td>
                    ${roleUsuario === "admin" ? `
                        <button class="btn-azul" onclick="editarBoleto(${b.id})">Editar</button>
                        <button class="btn-vermelho" onclick="excluirBoleto(${b.id})">Excluir</button>
                    ` : "—"}
                </td>
            </tr>`;
    });
}

// ===============================================
// MODAL
// ===============================================
function abrirModalNovo() {
    if (roleUsuario !== "admin") return;
    boletoEditandoId = null;
    boletoOrigem.value = "";
    boletoValor.value = "";
    boletoVencimento.value = "";
    modalBoleto.style.display = "flex";
}

function fecharModal() {
    modalBoleto.style.display = "none";
}

async function salvarBoleto() {
    if (roleUsuario !== "admin") return;

    const tipo_nf = document.querySelector("input[name='tipo_nf']:checked").value;
    const valor = Number(boletoValor.value);

    if (!valor || !boletoVencimento.value) {
        alert("Preencha valor e vencimento");
        return;
    }

    const payload = {
        nota_fiscal_id: nfId,
        tipo_nf,
        origem: boletoOrigem.value || null,
        valor,
        data_vencimento: boletoVencimento.value + "T12:00:00"
    };

    const resp = boletoEditandoId
        ? await supabase.from("boletos").update(payload).eq("id", boletoEditandoId)
        : await supabase.from("boletos").insert(payload);

    if (resp.error) {
        alert("Erro ao salvar boleto");
        console.error(resp.error);
        return;
    }

    fecharModal();
    carregarBoletos();
}

// ===============================================
// AÇÕES (OBRIGATORIAMENTE NO WINDOW)
// ===============================================
window.editarBoleto = async function (id) {
    if (roleUsuario !== "admin") return;

    const { data } = await supabase
        .from("boletos")
        .select("*")
        .eq("id", id)
        .single();

    boletoEditandoId = id;

    boletoOrigem.value = data.origem || "";
    boletoValor.value = data.valor;
    boletoVencimento.value = data.data_vencimento?.split("T")[0] || "";

    modalBoleto.style.display = "flex";
};

window.excluirBoleto = async function (id) {
    if (roleUsuario !== "admin") return;

    const ok = confirm("Excluir boleto?");
    if (!ok) return;

    const { error } = await supabase
        .from("boletos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir boleto");
        console.error(error);
        return;
    }

    await carregarBoletos();
};
