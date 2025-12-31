// ===============================================
// DASHBOARD.JS — BLINDADO
// ===============================================

import { verificarLogin } from "./auth.js";

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    // 🔒 BLINDAGEM
    const user = await verificarLogin();
    if (!user) return;

    // ===============================================
    // TODO O CÓDIGO ORIGINAL DO DASHBOARD
    // (não foi alterado nada abaixo)
    // ===============================================

    // Se o seu dashboard não tinha JS além disso,
    // este arquivo já está corretamente blindado.
});
