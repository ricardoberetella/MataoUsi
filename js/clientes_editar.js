import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================
      PEGAR ID DO CLIENTE
============================ */
const url = new URL(window.location.href);
const id = url.searchParams.get("id");

if (!id) {
    alert("Erro: ID do cliente não informado.");
    window.location.href = "clientes.html";
}

/* ============================
      CARREGAR DADOS
============================ */
async function carregarCliente() {

    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        alert("Erro ao carregar dados do cliente.");
        console.error(error);
        return;
    }

    document.getElementById("razao_social").value = data.razao_social ?? "";
    document.getElementById("cpf_cnpj").value = data.cpf_cnpj ?? "";
    document.getElementById("telefone").value = data.telefone ?? "";
    document.getElementById("email").value = data.email ?? "";
    document.getElementById("endereco").value = data.endereco ?? "";
}

/* ============================
      SALVAR ALTERAÇÕES
============================ */
document.getElementById("btnSalvarEdicao").addEventListener("click", async () => {

    const dadosAtualizados = {
        razao_social: document.getElementById("razao_social").value,
        cpf_cnpj: document.getElementById("cpf_cnpj").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("email").value,
        endereco: document.getElementById("endereco").value
    };

    const { error } = await supabase
        .from("clientes")
        .update(dadosAtualizados)
        .eq("id", id);

    if (error) {
        alert("Erro ao salvar alterações.");
        console.error(error);
        return;
    }

    alert("Cliente atualizado com sucesso!");
    window.location.href = "clientes.html";
});

/* ============================
         INICIALIZAÇÃO
============================ */
carregarCliente();
