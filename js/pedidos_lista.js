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
// PERMISSÕES (VIEWER: SEM NOVO/EDITAR/EXCLUIR)
// ===============================================
function aplicarPermissoesTabela() {
    // Oculta botão "Novo Pedido" para viewer
    const novoPedidoBtn = document.getElementById("btnNovoPedido");
    if (novoPedidoBtn && role !== "admin") {
        novoPedidoBtn.style.display = "none";
    }
}

// ===============================================
// CARREGAR PEDIDOS (ORDENAR E AGRUPAR POR CLIENTE)
// ===============================================
async function carregarPedidos() {
    const user = await carregarUsuario();
    if (!user) return;

    const tbody = document.getElementById("listaPedidos");
    tbody.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";

    // Ordena pela data mais recente primeiro
    const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, data_pedido, total, clientes(razao_social)")
        .order("data_pedido", { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='6'>Erro ao carregar.</td></tr>";
        return;
    }

    // 🔥 Ordenar clientes alfabeticamente no front-end
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
                    <td colspan="6"
                        style="border-bottom: 2px solid rgba(56,189,248,0.25); padding: 4px 0;">
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

        // VIEWER: Visualizar + Imprimir
        // ADMIN: Editar + Excluir + (Visualizar opcional via Editar)
        const acoesHtml = (role === "admin")
            ? `
                <button class="btn-azul" onclick="editarPedido(${p.id})">Editar</button>
                <button class="btn-vermelho" onclick="excluirPedido(${p.id})">Excluir</button>
              `
            : `
                <button class="btn-azul" onclick="visualizarPedido(${p.id})">Visualizar</button>
                <button class="btn-verde" onclick="imprimirPedido(${p.id})">Imprimir</button>
              `;

        tr.innerHTML = `
            <td>${p.numero_pedido}</td>
            <td>${clienteNome}</td>
            <td>${new Date(p.data_pedido).toLocaleDateString("pt-BR")}</td>
            <td>${Number(p.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
            <td class="acoes">${acoesHtml}</td>
        `;

        tbody.appendChild(tr);
    });

    aplicarPermissoesTabela();
}

// ===============================================
// VISUALIZAR PEDIDO (VIEWER)
// -> sem criar tela nova: usa a tela existente de editar,
//    mas o próprio backend/role deve impedir salvar/alterar.
// ===============================================
window.visualizarPedido = (id) => {
    window.location.href = `pedidos_editar.html?id=${id}`;
};

// ===============================================
// IMPRIMIR PEDIDO (VIEWER)
// -> sem criar tela nova: abre a mesma tela com flag de impressão.
//    (se sua tela de editar já tiver botão imprimir, você pode ignorar a flag)
// ===============================================
window.imprimirPedido = (id) => {
    window.location.href = `pedidos_editar.html?id=${id}&imprimir=1`;
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
    // 🔐 Proteção de login no início da página
    const user = await verificarLogin();
    if (!user) return;

    carregarPedidos();
});
