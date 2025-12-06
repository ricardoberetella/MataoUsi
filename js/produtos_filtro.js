// =========================================
// SUPABASE (VERSÃO CORRETA PARA VERCEL)
// =========================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================
// ELEMENTOS DA PÁGINA
// =========================================
const selectProduto = document.getElementById("produtoSelect");
const tabela = document.querySelector("#tabelaResultados tbody");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnImprimir = document.getElementById("btnImprimir");

// =========================================
// CARREGAR LISTA DE PRODUTOS NO SELECT
// =========================================
async function carregarProdutosSelect() {
    const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, descricao")
        .order("codigo");

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        return;
    }

    selectProduto.innerHTML = `<option value="">Selecione...</option>`;

    data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.codigo} - ${p.descricao}`;
        selectProduto.appendChild(opt);
    });
}

// =========================================
// FILTRAR PRODUTO ÚNICO SELECIONADO
// =========================================
async function filtrar() {
    const id = selectProduto.value;

    if (!id) {
        tabela.innerHTML = `
            <tr><td colspan="7" style="text-align:center">Selecione um produto.</td></tr>
        `;
        return;
    }

    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        tabela.innerHTML = `
            <tr><td colspan="7" style="text-align:center">Nenhum resultado.</td></tr>
        `;
        return;
    }

    tabela.innerHTML = `
        <tr>
            <td>${data.codigo}</td>
            <td>${data.descricao}</td>
            <td>${data.comprimento_mm}</td>
            <td>${data.peso_liquido}</td>
            <td>${data.peso_bruto}</td>
            <td>${data.valor_unitario}</td>
            <td>${data.acabamento}</td>
        </tr>
    `;

    // preenchendo info para impressão
    document.getElementById("dataGeradaPrint").textContent =
        new Date().toLocaleString("pt-BR");
    document.getElementById("nomeProdutoPrint").textContent =
        `${data.codigo} - ${data.descricao}`;
}

// =========================================
// IMPRIMIR RELATÓRIO
// =========================================
btnImprimir.addEventListener("click", () => {
    if (!selectProduto.value) {
        alert("Selecione um produto antes de imprimir.");
        return;
    }
    window.print();
});

// =========================================
// EVENTOS
// =========================================
btnFiltrar.addEventListener("click", filtrar);

// =========================================
// INICIAR PÁGINA
// =========================================
carregarProdutosSelect();
