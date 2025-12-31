import { supabase, verificarLogin } from "./auth.js";

let role = "viewer"; 
let id = null;

// ==================================================
// 🔐 INICIAR COM PROTEÇÃO + CARREGAR ROLE
// ==================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    role = user.user_metadata?.role || "viewer";

    // Captura ID da URL
    const params = new URLSearchParams(window.location.search);
    id = params.get("id");

    if (!id) {
        alert("ID do produto não informado.");
        window.location.href = "produtos.html";
        return;
    }

    aplicarPermissoes();
    carregarProduto();
});

// ==================================================
// 🔒 OCULTAR BOTÕES PARA VIEWER
// ==================================================
function aplicarPermissoes() {
    if (role !== "admin") {
        const btnEditar = document.getElementById("btnEditar");
        const btnExcluir = document.getElementById("btnExcluir");

        if (btnEditar) btnEditar.style.display = "none";
        if (btnExcluir) btnExcluir.style.display = "none";
    }
}

// ==================================================
// Formatador
// ==================================================
function formatarNumero(val) {
    if (val == null) return "0,000";
    return Number(val).toLocaleString("pt-BR", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
}

// ==================================================
// CARREGAR PRODUTO
// ==================================================
async function carregarProduto() {

    await verificarLogin();

    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        alert("Erro ao carregar produto.");
        window.location.href = "produtos.html";
        return;
    }

    document.getElementById("tituloProduto").textContent =
        `${data.codigo} — ${data.descricao}`;

    document.getElementById("detalhesProduto").innerHTML = `
        <p><strong>Código:</strong> ${data.codigo}</p>
        <p><strong>Descrição:</strong> ${data.descricao}</p>
        <p><strong>Unidade:</strong> ${data.unidade}</p>
        <p><strong>Comprimento (mm):</strong> ${data.comprimento_mm ?? ""}</p>
        <p><strong>Peso Líquido:</strong> ${formatarNumero(data.peso_liquido)}</p>
        <p><strong>Peso Bruto:</strong> ${formatarNumero(data.peso_bruto)}</p>
        <p><strong>Acabamento:</strong> ${data.acabamento ?? ""}</p>
    `;
}

// ==================================================
// EDITAR → AGORA CORRETO!
// ==================================================
document.getElementById("btnEditar").addEventListener("click", async () => {
    await verificarLogin();

    if (role !== "admin") {
        alert("Ação não permitida.");
        return;
    }

    window.location.href = `produtos_editar.html?id=${id}`;
});

// ==================================================
// EXCLUIR
// ==================================================
document.getElementById("btnExcluir").addEventListener("click", async () => {

    await verificarLogin();

    if (role !== "admin") {
        alert("Ação não permitida.");
        return;
    }

    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir produto.");
        return;
    }

    alert("Produto excluído com sucesso!");
    window.location.href = "produtos.html";
});
