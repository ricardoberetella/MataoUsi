// ===============================================
// NOTAS_VER.JS — NF + ITENS + BAIXAS + BOLETOS
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let cacheProdutos = [];
let boletoEditandoId = null;

// MODAL
let modalBoleto;
let boletoOrigem;
let boletoValor;
let boletoVencimento;

// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    return new Date(dataISO).toLocaleDateString("pt-BR");
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

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

    document.getElementById("btnNovoBoleto")?.addEventListener("click", abrirModalNovo);
    document.getElementById("btnCancelarBoleto")?.addEventListener("click", fecharModal);
    document.getElementById("btnSalvarBoleto")?.addEventListener("click", salvarBoleto);

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
    await carregarBoletos();
});

// ===============================================
// PRODUTOS (CACHE)
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
// DADOS DA NF
// ===============================================
async function carregarDadosNF() {
    const { data } = await supabase
        .from("notas_fiscais")
        .select("numero_nf, data_nf, clientes(razao_social)")
        .eq("id", nfId)
        .single();

    if (!data) return;

    nfNumero.textContent = data.numero_nf;
    nfData.textContent = formatarDataBR(data.data_nf);
    nfCliente.textContent = data.clientes?.razao_social || "—";
}

// ===============================================
// ITENS DA NF
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
                <td>
                    <div class="cell-center">${i.quantidade}</div>
                </td>
            </tr>`;
    });
}

// ===============================================
// BAIXAS — CENTRALIZAÇÃO REAL
// ===============================================
async function carregarBaixas() {
    const tbody = document.getElementById("listaBaixas");
    tbody.innerHTML = "";

    const { data: baixas } = await supabase
        .from("notas_pedidos_baixas")
        .select("nf_id, produto_id, quantidade_baixada")
        .eq("nf_id", nfId);

    if (!baixas || baixas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">Nenhuma baixa</td></tr>`;
        return;
    }

    const { data: notas } = await supabase
        .from("notas_fiscais")
        .select("id, numero_nf")
        .in("id", [...new Set(baixas.map(b => b.nf_id))]);

    const mapaNF = {};
    notas?.forEach(n => mapaNF[n.id] = n.numero_nf);

    const mapa = {};

    baixas.forEach(b => {
        const key = `${b.nf_id}-${b.produto_id}`;
        if (!mapa[key]) {
            mapa[key] = {
                nf: mapaNF[b.nf_id] || "—",
                produto_id: b.produto_id,
                baixado: 0
            };
        }
        mapa[key].baixado += b.quantidade_baixada;
    });

    Object.values(mapa).forEach(reg => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <div class="cell-center">${reg.nf}</div>
                </td>
                <td>${nomeProduto(reg.produto_id)}</td>
                <td>
                    <div class="cell-center">${reg.baixado}</div>
                </td>
                <td>
                    <div class="cell-center">Concluído</div>
                </td>
            </tr>`;
    });
}

// ===============================================
// BOLETOS (INALTERADO)
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
                <td><div class="cell-center">${b.tipo_nf === "NF" ? "Com NF" : "Sem NF"}</div></td>
                <td>${b.origem || "—"}</td>
                <td><div class="cell-center">R$ ${Number(b.valor).toFixed(2)}</div></td>
                <td><div class="cell-center">${formatarDataBR(b.data_vencimento)}</div></td>
                <td>
                    <div class="cell-center">
                        <button class="btn-azul" onclick="editarBoleto(${b.id})">Editar</button>
                        <button class="btn-vermelho" onclick="excluirBoleto(${b.id})">Excluir</button>
                    </div>
                </td>
            </tr>`;
    });
}

// ===============================================
// MODAL BOLETO
// ===============================================
function abrirModalNovo() {
    boletoEditandoId = null;
    boletoOrigem.value = "";
    boletoValor.value = "";
    boletoVencimento.value = "";
    document.querySelector("input[name='tipo_nf'][value='NF']").checked = true;
    modalBoleto.style.display = "flex";
}

function fecharModal() {
    modalBoleto.style.display = "none";
}

async function salvarBoleto() {
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
        data_vencimento: boletoVencimento.value
    };

    const resp = boletoEditandoId
        ? await supabase.from("boletos").update(payload).eq("id", boletoEditandoId)
        : await supabase.from("boletos").insert(payload);

    if (resp.error) {
        alert("Erro ao salvar boleto");
        return;
    }

    fecharModal();
    carregarBoletos();
}

window.editarBoleto = async id => {
    const { data } = await supabase.from("boletos").select("*").eq("id", id).single();
    boletoEditandoId = id;

    boletoOrigem.value = data.origem || "";
    boletoValor.value = data.valor;
    boletoVencimento.value = data.data_vencimento;
    document.querySelector(`input[name='tipo_nf'][value='${data.tipo_nf}']`).checked = true;

    modalBoleto.style.display = "flex";
};

window.excluirBoleto = async id => {
    if (!confirm("Excluir boleto?")) return;
    await supabase.from("boletos").delete().eq("id", id);
    carregarBoletos();
};
