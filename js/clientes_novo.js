// =========================================================
// CLIENTES_NOVO.JS — VERSÃO FINAL, SEGURA E PADRONIZADA
// =========================================================

import { supabase, protegerPagina, protegerAdmin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {

    // 🔐 1) Usuário precisa estar logado
    await protegerPagina();

    // 🔐 2) Apenas ADMIN pode cadastrar cliente
    await protegerAdmin();
});

// =========================================================
// SALVAR CLIENTE (APENAS ADMIN)
// =========================================================
document.getElementById("formCliente").addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔐 Verifica sessão + bloqueia viewer
    await protegerPagina();
    await protegerAdmin();

    const razao = document.getElementById("razao").value;
    const cpf_cnpj = document.getElementById("cpf_cnpj").value;
    const endereco = document.getElementById("endereco").value;
    const telefone = document.getElementById("telefone").value;
    const email = document.getElementById("email").value;

    const { error } = await supabase.from("clientes").insert([
        {
            razao_social: razao,
            cpf_cnpj,
            endereco,
            telefone,
            email
        }
    ]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
        return;
    }

    alert("Cliente cadastrado com sucesso!");
    window.location.href = "clientes.html";
});
