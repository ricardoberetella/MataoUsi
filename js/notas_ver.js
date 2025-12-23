// ===============================================
// NOTAS_VER.JS — NF + ITENS + BAIXAS + BOLETOS
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let numeroNFAtual = null;
let cacheProdutos = [];
let boletoEditandoId = null;
let roleUsuario = "viewer";

let modalBoleto;
let boletoOrigem;
let boletoValor;
let boletoVencimento;

// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    return new Date(dataISO).toLocaleDateString("pt-BR");
}

function formatarMoedaBR(valor) {
    if (valor === null || valor === undefined) return "—";
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ✅ CORREÇÃO DEFINITIVA
function corrigirDataParaSalvar(data) {
    if (!data) return null;

    const d = new Date(data + "T00:00:00");
    d.setDate(d.getDate() + 1);

    return d.toISOString().split("T")[0] + "T00:00:00";
}

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

    if (roleUsuario !== "admin") {
        if (btnNovo) btnNovo.style.display = "none";
    } else {
        if (btnNovo) btnNovo.onclick = abrirModalNovo;
        if (btnSalvar) btnSalvar.onclick = salvarBoleto;
    }

    if (btnCancelar) btnCancelar.onclick = fecharModal;

    await carregarDadosNF();
    await carregarBoletos();
});

// ===============================================
async function carregarDadosNF() {
    const { data } = await supabase
        .from("notas_fiscais")
        .select("numero_nf")
        .eq("id", nfId)
        .single();

    if (data) numeroNFAtual = data.numero_nf;
}

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
                <td>${b.tipo_nf}</td>
                <td>${b.origem || "—"}</td>
                <td>${formatarMoedaBR(b.valor)}</td>
                <td>${formatarDataBR(b.data_vencimento)}</td>
                <td>
                    <button class="btn-azul" onclick="editarBoleto(${b.id})">Editar</button>
                </td>
            </tr>`;
    });
}

// ===============================================
function abrirModalNovo() {
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
    const valor = Number(boletoValor.value);

    if (!valor || !boletoVencimento.value) {
        alert("Preencha valor e vencimento");
        return;
    }

    const payload = {
        nota_fiscal_id: nfId,
        origem: boletoOrigem.value || null,
        valor,
        data_vencimento: corrigirDataParaSalvar(boletoVencimento.value)
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
