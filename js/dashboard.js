// ===============================================
// DASHBOARD.JS – VERSÃO FINAL E 100% FUNCIONAL
// ===============================================

import { supabase, verificarLogin, sair } from "./auth.js";

let role = "viewer"; // padrão seguro

// ===============================================
// INICIAR (PROTEÇÃO + CARREGAR PERMISSÕES)
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin(); // 🔐 bloqueia acesso sem login
    if (!user) return;

    role = user.user_metadata?.role || "viewer";

    aplicarPermissoes();
    configurarLogout();
});

// ===============================================
// OCULTAR BOTÕES PARA VIEWER
// ===============================================
function aplicarPermissoes() {

    // Lista de botões que viewer não pode ver
    const botoesAdmin = [
        document.getElementById("btnClientes"),
        document.getElementById("btnPedidos"),
        document.getElementById("btnProdutos"),
        document.getElementById("btnEstoque"),
        document.getElementById("btnFinanceiro"),
        document.getElementById("btnRelatorios")
    ];

    if (role !== "admin") {
        botoesAdmin.forEach(btn => {
            if (btn) btn.classList.add("btn-desabilitado");
        });
    }
}

// ===============================================
// LOGOUT
// ===============================================
function configurarLogout() {
    const btnLogout = document.getElementById("logout");

    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await sair(); // 🔐 logout seguro
        });
    }
}
