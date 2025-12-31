// ===============================================
// CLIENTES_EDITAR.JS — VERSÃO FINAL 100% SEGURA
// ===============================================

import { supabase, protegerPagina, protegerAdmin, obterRole } from "./auth.js";

let idCliente = null;

document.addEventListener("DOMContentLoaded", async () => {

    // 🔐 1) Protege o acesso (qualquer usuário precisa estar logado)
    await protegerPagina();

    // 🔐 2) Só ADMIN pode editar cliente
    await protegerAdmin();

    // 🔎 3) Captura ID da URL
    const url = new URL(window.location.href);
    idCliente = url.searchParams.get("id");

    if (!idCliente) {
        alert("ID do cliente não informado.");
        window.location.href = "clientes.html";
        return;
    }

    // 📌 4) Carrega dados do cliente
    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", idCliente)
        .single();

    if (error || !data) {
        alert("Erro ao carregar cliente.");
        window.location.href = "clientes.html";
        return;
    }

    // Preenche campos
    document.getElementById("razao").value = data.razao_social;
    document.getElementById("cpf_cnpj").value = data.cpf_cnpj;
    document.getElementById("endereco").value = data.endereco;
    document.getElementById("telefone").value = data.telefone;
    document.getElementById("email").value = data.email;
});

// ===============================================
// SALVAR ALTERAÇÕES (APENAS ADMIN)
// ===============================================
document.getElementById("formCliente").addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔐 1) Verifica login + administra acesso
    await protegerPagina();
    await protegerAdmin(); // Impede edição por viewer

    // 📌 2) Atualiza cliente
    const { error } = await supabase
        .from("clientes")
        .update({
            razao_social: document.getElementById("razao").value,
            cpf_cnpj: document.getElementById("cpf_cnpj").value,
            endereco: document.getElementById("endereco").value,
            telefone: document.getElementById("telefone").value,
            email: document.getElementById("email").value
        })
        .eq("id", idCliente);

    if (error) {
        alert("Erro ao atualizar: " + error.message);
        return;
    }

    alert("Cliente atualizado com sucesso!");
    window.location.href = "clientes.html";
});
