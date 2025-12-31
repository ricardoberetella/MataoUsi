// ===============================================
// LISTA DE PEDIDOS – CLIQUE NA LINHA PARA VISUALIZAR
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let role = "viewer";

// ===============================================
// DATA SEM "SHIFT" DE FUSO (não usar new Date em YYYY-MM-DD)
// ===============================================
function dataBR(iso) {
    if (!iso) return "";
    const s = String(iso).split("T")[0];
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    return `${m[3]}/${m[2]}/${m[1]}`;
}

// ===============================================
// CARREGAR USUÁRIO (VERIFICA ROLE)
// ===============================================
async function carregarUsuario() {
    const user = await verificarLogin();
    if (!user) return null;

    role = user.user_metadata?.role || "viewer";
    return user;
}

// ===============================================
// PERMISSÕES DE TELA (VISUALIZADOR x ADMIN)
// ===============================================
function aplicarPermissoesTela() {

    if (role !== "admin") {

        // ❌ Esconder botão "Novo Pedido"
        const btnNovo = document.getElementById("btnNovoPedido");
        if (btnNovo) btnNovo.style.display = "none";

        // ✅ Filtros sempre visível
        const btnFiltros = document.getElementById("btnFiltros");
        if (btnFiltros) btnFiltros.style.display = "inline-block";

        // ❌ Esconder coluna Ações
        const colAcoes = document.getElementById("colAcoes");
        if (colAcoes) colAcoes.style.display = "none";

        // ❌ Esconder botões Editar / Excluir
        document.querySelectorAll(".btn-admin").forEach(btn => {
            btn.style.display = "none";
        });
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

    // Ordenar por cliente
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

        // 👉 CLIQUE NA LINHA ABRE O PEDIDO
        tr.style.cursor = "pointer";
        tr.addEventListener("click", () => {
            window.location.href = `pedidos_detalhes.html?id=${p.id}`;
        });

        tr.innerHTML = `
            <td>${p.numero_pedido}</td>
            <td>${clienteNome}</td>
            <td>${dataBR(p.data_pedido)}</td>
            <td>${Number(p.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
            <td class="acoes">
                <button class="btn-azul btn-admin">Editar</button>
                <button class="btn-vermelho btn-admin">Excluir</button>
            </td>
        `;

        // 👉 Impede que clicar nos botões dispare o clique da linha
        tr.querySelectorAll("button").forEach(btn => {
            btn.addEventListener("click", e => e.stopPropagation());
        });

        // Ações admin
        const [btnEditar, btnExcluir] = tr.querySelectorAll(".btn-admin");

        btnEditar.addEventListener("click", () => editarPedido(p.id));
        btnExcluir.addEventListener("click", () => excluirPedido(p.id));

        tbody.appendChild(tr);
    });

    aplicarPermissoesTela();
}

// ===============================================
// EDITAR (ADMIN)
// ===============================================
function editarPedido(id) {
    if (role !== "admin") return;
    window.location.href = `pedidos_editar.html?id=${id}`;
}

// ===============================================
// EXCLUIR (ADMIN)
// ===============================================
async function excluirPedido(id) {

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
}

// ===============================================
// INICIAR
// ===============================================
document.addEventListener("DOMContentLoaded", carregarPedidos);
