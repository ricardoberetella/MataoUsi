// ===============================================
// LISTA DE PEDIDOS – ORDEM CORRETA + AGRUPAMENTO
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let role = "viewer";

// ===============================================
// CARREGAR USUÁRIO (VERIFICA ROLE)
// ===============================================
async function carregarUsuario() {
    const user = await verificarLogin(); // 🔐 proteção principal
    if (!user) return null;

    role = user.user_metadata?.role || "viewer";
    return user;
}

// ===============================================
// PERMISSÕES (BOTÕES POR ROLE)
// ===============================================
function montarBotoesAcoes(pedidoId) {

    let botoes = `
        <button class="btn-azul" onclick="visualizarPedido(${pedidoId})">
            Visualizar
        </button>

        <button class="btn-verde" onclick="imprimirPedido(${pedidoId})">
            Imprimir
        </button>
    `;

    if (role === "admin") {
        botoes += `
            <button class="btn-azul" onclick="editarPedido(${pedidoId})">
                Editar
            </button>
            <button class="btn-vermelho" onclick="excluirPedido(${pedidoId})">
                Excluir
            </button>
        `;
    }

    return botoes;
}

// ===============================================
// CARREGAR PEDIDOS (ORDENAR E AGRUPAR POR CLIENTE)
// ===============================================
async function carregarPedidos() {

    const user = await carregarUsuario();
    if (!user) return;

    const tbody = document.getElementById("listaPedidos");
    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

    const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, data_pedido, total, clientes(razao_social)")
        .order("data_pedido", { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar.</td></tr>";
        return;
    }

    // 🔥 Ordenar clientes alfabeticamente
    data.sort((a, b) => {
        const cliA = a.clientes?.razao_social || "";
        const cliB = b.clientes?.razao_social || "";
        return cliA.localeCompare(cliB);
    });

    tbody.innerHTML = "";

    let ultimoCliente = "";

    data.forEach((p) => {

        const clienteNome = p.clientes?.razao_social || "Cliente Não Informado";

        // ============================================================
        // SEPARADOR QUANDO MUDA DE CLIENTE
        // ============================================================
        if (clienteNome !== ultimoCliente) {

            if (ultimoCliente !== "") {
                const separador = document.createElement("tr");
                separador.innerHTML = `
                    <td colspan="5"
                        style="border-bottom:2px solid rgba(56,189,248,0.25);padding:4px 0;">
                    </td>
                `;
                tbody.appendChild(separador);
            }

            ultimoCliente = clienteNome;
        }

        // ============================================================
        // LINHA DO PEDIDO
        // ============================================================
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.numero_pedido}</td>
            <td>${clienteNome}</td>
            <td>${new Date(p.data_pedido).toLocaleDateString("pt-BR")}</td>
            <td>${Number(p.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>

            <td class="acoes">
                ${montarBotoesAcoes(p.id)}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// ===============================================
// VISUALIZAR PEDIDO (ADMIN + VIEWER)
// ===============================================
window.visualizarPedido = (id) => {
    window.location.href = `pedidos_visualizar.html?id=${id}`;
};

// ===============================================
// IMPRIMIR PEDIDO (ADMIN + VIEWER)
// ===============================================
window.imprimirPedido = (id) => {
    window.location.href = `pedidos_imprimir.html?id=${id}`;
};

// ===============================================
// EDITAR PEDIDO (SÓ ADMIN)
// ===============================================
window.editarPedido = (id) => {
    if (role !== "admin") return;
    window.location.href = `pedidos_editar.html?id=${id}`;
};

// ===============================================
// EXCLUIR PEDIDO (SÓ ADMIN)
// ===============================================
window.excluirPedido = async (id) => {
    if (role !== "admin") {
        alert("Ação não permitida!");
        return;
    }

    if (!confirm("Confirmar exclusão?")) return;

    const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
        return;
    }

    carregarPedidos();
};

// ===============================================
// INICIAR
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    carregarPedidos();
});
