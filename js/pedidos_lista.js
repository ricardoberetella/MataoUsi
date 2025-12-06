import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Inicializa conexão
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let emailUsuario = null;

// ==============================
// IDENTIFICAR USUÁRIO LOGADO
// ==============================
async function identificarUsuario() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    emailUsuario = user.email;
}

// ==============================
// CARREGAR LISTA
// ==============================
async function carregarPedidos() {
    await identificarUsuario();

    const tbody = document.getElementById("listaPedidos");
    tbody.innerHTML = "";

    const { data } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, data_pedido, total, clientes(razao_social)")
        .order("id", { ascending: false });

    const isAdmin = (emailUsuario === "ricardoberetella@hotmail.com");

    data.forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${p.numero_pedido}</td>
            <td>${p.clientes.razao_social}</td>
            <td>${new Date(p.data_pedido).toLocaleDateString('pt-BR')}</td>
            <td>${p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td>
                ${isAdmin ? `
                    <button class="btn-azul" onclick="editarPedido(${p.id})">Editar</button>
                    <button class="btn-vermelho" onclick="excluirPedido(${p.id})">Excluir</button>
                ` : ""}
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Ocultar BOTÃO "NOVO PEDIDO" PARA O VISUALIZADOR
    if (!isAdmin) {
        const btnNovo = document.querySelector("a[href='pedidos_novo.html']");
        if (btnNovo) btnNovo.style.display = "none";
    }
}

// ==============================
// EDITAR
// ==============================
window.editarPedido = id => {
    window.location.href = `pedidos_editar.html?id=${id}`;
};

// ==============================
// EXCLUIR
// ==============================
window.excluirPedido = async id => {
    if (!confirm("Excluir este pedido?")) return;

    await supabase.from("pedidos").delete().eq("id", id);
    carregarPedidos();
};

// Inicializa
document.addEventListener("DOMContentLoaded", carregarPedidos);
