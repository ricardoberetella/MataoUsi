import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editId = null;

/* =========================================================
    PEGAR ID DA URL
========================================================= */
function getIdUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

/* =========================================================
    CARREGAR DADOS DO CLIENTE NO FORMULÁRIO
========================================================= */
async function carregarCliente() {
    editId = getIdUrl();

    if (!editId) {
        alert("Nenhum cliente selecionado!");
        window.location.href = "clientes.html";
        return;
    }

    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", editId)
        .single();

    if (error || !data) {
        console.error("Erro ao carregar:", error);
        alert("Erro ao carregar dados do cliente.");
        return;
    }

    // Preencher os campos
    document.getElementById("razao_social").value = data.razao_social || "";
    document.getElementById("cpf_cnpj").value = data.cpf_cnpj || "";
    document.getElementById("telefone").value = data.telefone || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("endereco").value = data.endereco || "";
}

/* =========================================================
    SALVAR ALTERAÇÕES
========================================================= */
async function salvarEdicao() {
    const body = {
        razao_social: document.getElementById("razao_social").value.trim(),
        cpf_cnpj: document.getElementById("cpf_cnpj").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        email: document.getElementById("email").value.trim(),
        endereco: document.getElementById("endereco").value.trim(),
    };

    const { error } = await supabase
        .from("clientes")
        .update(body)
        .eq("id", editId);

    if (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar alterações.");
        return;
    }

    alert("Cliente atualizado com sucesso!");
    window.location.href = "clientes.html";
}

/* =========================================================
    EVENTOS
========================================================= */
document.getElementById("btnSalvarEdicao").addEventListener("click", salvarEdicao);

/* =========================================================
    INICIAR PÁGINA
========================================================= */
carregarCliente();
