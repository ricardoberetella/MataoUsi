// ===============================================
//        LOGIN.JS - Funcional e Compatível
// ===============================================

import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {

    // 🔐 Se já estiver logado → vai direto para o dashboard
    const session = await supabase.auth.getSession();
    if (session?.data?.session) {
        window.location.href = "dashboard.html";
        return;
    }

    const btn = document.getElementById("btnLogin");

    if (!btn) {
        console.error("ERRO: Botão de login não encontrado!");
        return;
    }

    btn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value.trim();

        if (!email || !senha) {
            alert("Por favor, preencha e-mail e senha.");
            return;
        }

        // ============================
        //            LOGIN
        // ============================
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {
            console.error("Erro no login:", error.message);
            alert("E-mail ou senha incorretos.");
            return;
        }

        // LOGIN OK → redirecionar
        window.location.href = "dashboard.html";
    });
});
