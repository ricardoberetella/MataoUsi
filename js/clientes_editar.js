import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("formEditar");

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id");

// CARREGAR DADOS
async function carregar() {
    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert("Erro ao carregar dados");
        return;
    }

    document.getElementById("id").value = data.id;
    document.getElementById("razao_social").value = data.razao_social;
    document.getElementById("cpf_cnpj").value = data.cpf_cnpj;
    document.getElementById("telefone").value = data.telefone;
    document.getElementById("email").value = data.email;
    document.getElementById("endereco").value = data.endereco;
}

carregar();

// SALVAR ALTERAÇÕES
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const atualizado = {
        razao_social: document.getElementById("razao_social").value,
        cpf_cnpj: document.getElementById("cpf_cnpj").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("email").value,
        endereco: document.getElementById("endereco").value
    };

    const { error } = await supabase
        .from("clientes")
        .update(atualizado)
        .eq("id", id);

    if (error) {
        alert("Erro ao atualizar: " + error.message);
        return;
    }

    alert("Cliente atualizado!");
    window.location.href = "clientes.html";
});
