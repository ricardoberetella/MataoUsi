// ===============================================
//   NOTAS_VER.JS - DETALHES DA NF + BAIXAS + BOLETOS
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let cacheProdutos = [];
let boletoEditandoId = null;

// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    return new Date(dataISO).toLocaleDateString("pt-BR");
}

function formatarMoedaBR(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// "15.998,00" | "15998,00" | "15998.00" -> 15998.00
function parseValor(valorStr) {
    if (!valorStr) return null;
    const limpo = valorStr
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
    const num = Number(limpo);
    return Number.isFinite(num) ? num : null;
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = obterIdDaURL();
    if (!nfId) {
        alert("Nota Fiscal não encontrada.");
        return;
    }

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();

    configurarEventosBoletos();
    await carregarBoletos();
});

// ===============================================
function obterIdDaURL() {
    const id = new URLSearchParams(window.location.search).get("id");
    return id ? Number(id) : null;
}

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
async function carregarDadosNF() {
    const { data } = await supabase
        .from("notas_fiscais")
        .select("numero_nf,data_nf,clientes(razao_social)")
        .eq("id", nfId)
        .single();

    document.getElementById("nfNumero").textContent = data.numero_nf;
    document.getElementById("nfData").textContent = formatarDataBR(data.data_nf);
    document.getElementById("nfCliente").textContent = data.clientes?.razao_social || "—";
}

// ===============================================
async function carregarItensNF() {
    const { data } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id,quantidade")
        .eq("nf_id", nfId);

    const tbody = document.getElementById("listaItens");
    tbody.innerHTML = "";

    data?.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td>${nomeProduto(i.produto_id)}</td>
                <td style="text-align:right">${i.quantidade}</td>
            </tr>`;
    });
}

// ===============================================
async function carregarBaixas() {
    const { data } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id,produto_id,quantidade_baixada")
        .eq("nf_id", nfId);

    const tbody = document.getElementById("listaBaixas");
    tbody.innerHTML = "";

    data?.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.pedido_id}</td>
                <td>${nomeProduto(b.produto_id)}</td>
                <td style="text-align:right">${b.quantidade_baixada}</td>
                <td>—</td>
            </tr>`;
    });
}

// ===================== BOLETOS =====================
function configurarEventosBoletos() {
    document.getElementById("btnNovoBoleto").onclick = abrirModalNovoBoleto;
    document.getElementById("btnCancelarBoleto").onclick = fecharModalBoleto;
    document.getElementById("btnSalvarBoleto").onclick = salvarBoleto;
    document.getElementById("filtroBoletos").onchange = carregarBoletos;

    document.querySelectorAll('input[name="vinculoBoleto"]').forEach(r => {
        r.onchange = () => {
            document.getElementById("areaSemNF").style.display =
                r.value === "sem" && r.checked ? "block" : "none";
        };
    });
}

function abrirModalNovoBoleto() {
    boletoEditandoId = null;
    document.getElementById("modalBoleto").style.display = "flex";
}

function fecharModalBoleto() {
    document.getElementById("modalBoleto").style.display = "none";
}

// ===============================================
async function carregarBoletos() {
    const filtro = document.getElementById("filtroBoletos").value;
    let query = supabase.from("boletos").select("*").order("data_vencimento");

    if (filtro === "nf") query = query.eq("nota_fiscal_id", nfId);
    if (filtro === "sem") query = query.is("nota_fiscal_id", null);
    if (filtro === "todos")
        query = query.or(`nota_fiscal_id.eq.${nfId},nota_fiscal_id.is.null`);

    const { data } = await query;
    const tbody = document.getElementById("listaBoletos");
    tbody.innerHTML = "";

    data?.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.origem || "—"}</td>
                <td>${b.nota_fiscal_id ? "COM NF" : "SEM NF"}</td>
                <td>${b.numero_nf_referencia || "—"}</td>
                <td style="text-align:right">${formatarMoedaBR(b.valor)}</td>
                <td>${formatarDataBR(b.data_vencimento)}</td>
                <td>
                    <button onclick="editarBoleto(${b.id})">Editar</button>
                    <button onclick="excluirBoleto(${b.id})">Excluir</button>
                </td>
            </tr>`;
    });
}

// ===============================================
async function salvarBoleto() {
    const valor = parseValor(document.getElementById("boletoValor").value);
    const dataISO = document.getElementById("boletoVencimento").value;
    const vinculo = document.querySelector('input[name="vinculoBoleto"]:checked').value;

    if (!valor) {
        alert("Valor inválido.");
        return;
    }

    if (!dataISO) {
        alert("Data de vencimento inválida.");
        return;
    }

    const payload = {
        nota_fiscal_id: vinculo === "com" ? nfId : null,
        origem: document.getElementById("boletoOrigem").value || null,
        tipo_nf: vinculo === "com" ? "NF" : "SEM_NF",
        numero_nf_referencia:
            vinculo === "com"
                ? null
                : document.getElementById("boletoNumeroNFRef").value || null,
        valor: valor,
        data_vencimento: dataISO
    };

    const resp = boletoEditandoId
        ? await supabase.from("boletos").update(payload).eq("id", boletoEditandoId)
        : await supabase.from("boletos").insert(payload);

    if (resp.error) {
        console.error("ERRO SUPABASE:", resp.error);
        alert("Erro ao salvar boleto.");
        return;
    }

    fecharModalBoleto();
    carregarBoletos();
}

// ===============================================
async function editarBoleto(id) {
    const { data } = await supabase.from("boletos").select("*").eq("id", id).single();
    boletoEditandoId = id;

    document.getElementById("boletoOrigem").value = data.origem || "";
    document.getElementById("boletoValor").value = data.valor;
    document.getElementById("boletoVencimento").value = data.data_vencimento || "";
    document.getElementById("boletoNumeroNFRef").value = data.numero_nf_referencia || "";

    document.getElementById("modalBoleto").style.display = "flex";
}

// ===============================================
async function excluirBoleto(id) {
    if (!confirm("Excluir boleto?")) return;
    await supabase.from("boletos").delete().eq("id", id);
    carregarBoletos();
}
