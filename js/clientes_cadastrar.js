import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("formNovoCliente");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const novo = {
        razao_social: document.getElementById("razao_social").value,
        cpf_cnpj: document.getElementById("cpf_cnpj").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("email").value,
        endereco: document.getElementById("endereco").value
    };

    const { error } = await supabase.from("clientes").insert(novo);

    if (error) {
        alert("Erro ao salvar: " + error.message);
        return;
    }

    alert("Cliente cadastrado com sucesso!");
    window.location.href = "clientes.html";
});
