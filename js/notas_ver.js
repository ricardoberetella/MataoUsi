// ===============================================
// NOTAS_VER.JS — BOLETOS (TOGGLE COM / SEM NF)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let tipoNFSelecionado = "NF";

// ELEMENTOS
let modalBoleto;
let boletoOrigem;
let boletoValor;
let boletoVencimento;
let optComNF;
let optSemNF;

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = Number(new URLSearchParams(window.location.search).get("id"));

    modalBoleto = document.getElementById("modalBoleto");
    boletoOrigem = document.getElementById("boletoOrigem");
    boletoValor = document.getElementById("boletoValor");
    boletoVencimento = document.getElementById("boletoVencimento");
    optComNF = document.getElementById("optComNF");
    optSemNF = document.getElementById("optSemNF");

    document.getElementById("btnNovoBoleto").onclick = abrirModal;
    document.getElementById("btnCancelarBoleto").onclick = fecharModal;
    document.getElementById("btnSalvarBoleto").onclick = salvarBoleto;

    optComNF.onclick = () => selecionarNF("NF");
    optSemNF.onclick = () => selecionarNF("SEM_NF");
});

// ===============================================
function selecionarNF(tipo) {
    tipoNFSelecionado = tipo;
    optComNF.classList.toggle("ativo", tipo === "NF");
    optSemNF.classList.toggle("ativo", tipo === "SEM_NF");
}

// ===============================================
function abrirModal() {
    selecionarNF("NF");
    boletoOrigem.value = "";
    boletoValor.value = "";
    boletoVencimento.value = "";
    modalBoleto.style.display = "flex";
}

function fecharModal() {
    modalBoleto.style.display = "none";
}

// ===============================================
async function salvarBoleto() {
    const valor = Number(boletoValor.value);
    if (!valor || !boletoVencimento.value) {
        alert("Preencha valor e vencimento");
        return;
    }

    const payload = {
        nota_fiscal_id: nfId,
        tipo_nf: tipoNFSelecionado,
        origem: boletoOrigem.value || null,
        valor,
        data_vencimento: boletoVencimento.value
    };

    const { error } = await supabase.from("boletos").insert(payload);
    if (error) {
        alert("Erro ao salvar boleto");
        return;
    }

    fecharModal();
    location.reload();
}
