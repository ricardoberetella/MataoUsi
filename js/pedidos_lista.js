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
// PERMISSÕES DE TELA (VISUALIZADOR)
// ===============================================
function aplicarPermissoesTela() {

    if (role !== "admin") {

        // ❌ Oculta botão "Novo Pedido"
        const btnNovo = document.getElementById("btnNovoPedido");
        if (btnNovo) btnNovo.style.display = "none";

        // ❌ Oculta coluna Ações (cabeçalho)
        const colAcoes = document.getElementById("colAcoes");
        if (colAcoes) colAcoes.style.display = "none";

        // ❌ Oculta todas as ações por linha
        document.querySelectorAll(".acoes").forEach(td => {
            td.style.display = "none";
        });

        // ✅ Botão Filtros continua visível
        const btnFiltros = document.getElementById("btnFiltros");
        if (btnFiltros) btnFiltros.style.display = "inline-block";
    }
}

// ===============================================
// CARREGAR PEDIDOS
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

    // Ordenar clientes alfabeticamente
    data.sort((a, b) => {
        const aCli = a.clientes?.razao_social || "";
        const bCli = b.clientes?.razao_social || "";
        return aCli.localeCompare(bCli);
    });

    tbody.innerHTML = "";
    let ultimoCliente = "";

    data.forEach(p => {

        const clienteNome = p.clientes?.razao_social || "Cliente Não Informado";

        // Separador por cliente
        if (clienteNome !== ultimoCliente) {
            if (ultimoCliente !== "") {
                const sep = document.createElement("tr");
                sep.innerHTML = `
                    <td colspan="5"
                        style="border-bottom:2px solid rgba(56,189,248,0.25);padding:4px 0;">
                    </td>`;
                tbody.appendChild(sep);
            }
            ultimoCliente = clienteNome;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.numero_pedido}</td>
            <td>${clienteNome}</td>
            <td>${new Date(p.data_pedido).toLocaleDateString("pt-BR")}</td>
            <td>${Number(p.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
            <td class="acoes">
                <button class="btn-azul" onclick="editarPedido(${p.id})">Editar</button>
                <button class="btn-vermelho" onclick="excluirPedido(${p.id})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    aplicarPermissoesTela();
}

// ===============================================
// EDITAR / EXCLUIR (PROTEGIDOS)
// ===============================================
window.editarPedido = (id) => {
    if (role !== "admin") return;
    window.location.href = `pedidos_editar.html?id=${id}`;
};

window.excluirPedido = async (id) => {
    if (role !== "admin") return;

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
