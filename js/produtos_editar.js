import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ================================
      FUNÇÕES DE FORMATAÇÃO
================================ */
function formataPesoParaExibir(v) {
    return Number(v).toFixed(3).replace(".", ",");
}

function formataPesoParaSalvar(v) {
    return Number(v.replace(",", ".")).toFixed(3);
}

function formataValorParaExibir(v) {
    return Number(v).toFixed(2).replace(".", ",");
}

function formataValorParaSalvar(v) {
    return Number(v.replace(",", ".")).toFixed(2);
}

/* ================================
      CARREGAR PRODUTO
================================ */
document.addEventListener("DOMContentLoaded", async () => {
    const id = getParam("id");
    carregarProduto(id);

    document.getElementById("btnSalvarEdicao").onclick = () => salvarEdicao(id);
});

function getParam(name) {
    return new URL(window.location.href).searchParams.get(name);
}

async function carregarProduto(id) {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert("Erro ao carregar produto!");
        return;
    }

    document.getElementById("codigo").value = data.codigo;
    document.getElementById("descricao").value = data.descricao;
    document.getElementById("unidade").value = data.unidade;
    document.getElementById("comprimento_mm").value = data.comprimento_mm;
    document.getElementById("peso_liquido").value = formataPesoParaExibir(data.peso_liquido);
    document.getElementById("peso_bruto").value = formataPesoParaExibir(data.peso_bruto);
    document.getElementById("valor_unitario").value = formataValorParaExibir(data.valor_unitario);
    document.getElementById("acabamento").value = data.acabamento;
}

/* ================================
      SALVAR EDIÇÃO
================================ */
async function salvarEdicao(id) {
    const payload = {
        codigo: document.getElementById("codigo").value.trim(),
        descricao: document.getElementById("descricao").value.trim(),
        unidade: document.getElementById("unidade").value.trim(),
        comprimento_mm: document.getElementById("comprimento_mm").value.trim(),
        peso_liquido: formataPesoParaSalvar(document.getElementById("peso_liquido").value),
        peso_bruto: formataPesoParaSalvar(document.getElementById("peso_bruto").value),
        valor_unitario: formataValorParaSalvar(document.getElementById("valor_unitario").value),
        acabamento: document.getElementById("acabamento").value
    };

    await supabase
        .from("produtos")
        .update(payload)
        .eq("id", id);

    alert("Produto atualizado com sucesso!");
    window.location.href = "produtos_lista.html";
}
