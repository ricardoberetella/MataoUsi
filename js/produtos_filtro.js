import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS
const campoBusca = document.getElementById("campoBusca");
const btnBuscar = document.getElementById("btnBuscar");
const btnImprimir = document.getElementById("btnImprimir");
const tabela = document.querySelector("#tabelaResultados tbody");

// =========================================
// CARREGAR LISTA COMPLETA AO ABRIR
// =========================================
carregarTodos();

// =========================================
// FUNÇÃO BUSCAR (código ou descrição)
// =========================================
btnBuscar.addEventListener("click", buscar);

async function buscar() {
    const termo = campoBusca.value.trim();

    let query = supabase.from("produtos").select("*");

    // Filtro por código ou descrição
    if (termo !== "") {
        query = query.or(`codigo.ilike.%${termo}%,descricao.ilike.%${termo}%`);
    }

    const { data, error } = await query.order("codigo");

    if (error) {
        console.error("Erro ao buscar:", error);
        alert("Erro ao buscar produtos");
        return;
    }

    preencherTabela(data);
}

// =========================================
// CARREGAR TUDO SEM FILTRO
// =========================================
async function carregarTodos() {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("codigo");

    if (error) {
        console.error(error);
        alert("Erro ao carregar produtos.");
        return;
    }

    preencherTabela(data);
}

// =========================================
// PREENCHER TABELA
// =========================================
function preencherTabela(lista) {
    tabela.innerHTML = "";

    if (!lista || lista.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">Nenhum produto encontrado</td>
            </tr>
        `;
        return;
    }

    lista.forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${p.codigo}</td>
            <td>${p.descricao}</td>
            <td>${p.comprimento_mm}</td>
            <td>${p.peso_liquido}</td>
            <td>${p.peso_bruto}</td>
            <td>${p.valor_unitario}</td>
            <td>${p.acabamento}</td>
        `;

        tabela.appendChild(tr);
    });
}

// =========================================
// IMPRIMIR
// =========================================
btnImprimir.addEventListener("click", () => {
    window.print();
});
