// ===============================================
// SALVAR PRODUTO — VERSÃO PROTEGIDA COM AUTH.JS
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

/* ========================================
      PROTEGER A PÁGINA
======================================== */
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin(); // 🔒 Impede acesso sem login
    if (!user) return;

    // Se for viewer → bloqueia
    if (user.user_metadata?.role !== "admin") {
        alert("Acesso não permitido.");
        window.location.href = "produtos_lista.html";
    }
});

/* ========================================
      SALVAR NOVO PRODUTO
======================================== */
window.salvarProduto = async function () {

    // Proteção adicional
    const user = await verificarLogin();
    if (!user || user.user_metadata?.role !== "admin") {
        alert("Ação não permitida!");
        return;
    }

    const codigo = document.getElementById("codigo").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const unidade = document.getElementById("unidade").value.trim();
    const comprimento_mm = document.getElementById("comprimento_mm").value.trim();
    const peso_liquido = document.getElementById("peso_liquido").value.trim();
    const peso_bruto = document.getElementById("peso_bruto").value.trim();
    const acabamento = document.getElementById("acabamento").value.trim();
    const valor_unitario = document.getElementById("valor_unitario").value.trim();

    if (!codigo || !descricao || !unidade) {
        alert("Preencha os campos obrigatórios!");
        return;
    }

    const { error } = await supabase
        .from("produtos")
        .insert([
            {
                codigo,
                descricao,
                unidade,
                comprimento_mm: comprimento_mm || null,
                peso_liquido: peso_liquido || null,
                peso_bruto: peso_bruto || null,
                acabamento,
                valor_unitario: valor_unitario || 0
            }
        ]);

    if (error) {
        alert("Erro ao salvar produto!");
        console.error(error);
        return;
    }

    alert("Produto cadastrado com sucesso!");
    window.location.href = "produtos_lista.html";
};
