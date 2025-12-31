// ===============================================
// CLIENTES.JS — VERSÃO FINAL 100% SEGURA
// ===============================================

import { supabase, protegerPagina, obterRole } from "./auth.js";

let role = "viewer"; // padrão seguro

/* ======================================================
                 VERIFICAR LOGIN E PERMISSÕES
====================================================== */
async function carregarUsuario() {
    await protegerPagina(); // 🔐 garante que só logado entra

    role = await obterRole(); // pega a role real

    console.log("ROLE DO USUÁRIO:", role);

    // Oculta botões e coluna AÇÕES para viewer
    if (role !== "admin") {
        const btn = document.getElementById("btnNovo");
        if (btn) btn.style.display = "none";

        const th = document.querySelector(".th-acoes");
        if (th) th.style.display = "none";
    }
}

/* ======================================================
                   CARREGAR CLIENTES
====================================================== */
async function carregarClientes() {
    const tbody = document.getElementById("listaClientes");

    tbody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align:center;color:#94a3b8;">
                Carregando clientes...
            </td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social");

    if (error) {
        console.error("Erro ao carregar clientes:", error);
        tbody.innerHTML = `
            <tr><td colspan="3" style="text-align:center;color:red;">
                Erro ao carregar.
            </td></tr>
        `;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center;color:#94a3b8;">
                    Nenhum cliente cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";

    data.forEach((c) => {
        tbody.innerHTML += `
            <tr>
                <td>${c.razao_social}</td>
                <td>${c.cpf_cnpj}</td>

                <td class="col-acoes">
                    ${
                        role === "admin"
                            ? `
                                <button onclick="editarCliente(${c.id})" class="btn-azul">Editar</button>
                                <button onclick="excluirCliente(${c.id})" class="btn-vermelho">Excluir</button>
                              `
                            : "-"
                    }
                </td>
            </tr>
        `;
    });

    // Se for viewer → oculta coluna completa
    if (role !== "admin") {
        document.querySelectorAll(".col-acoes").forEach(td => {
            td.style.display = "none";
        });
    }
}

/* ======================================================
                       AÇÕES
====================================================== */

// 🔐 edição protegida
window.editarCliente = async (id) => {
    const roleAtual = await obterRole();
    if (roleAtual !== "admin") {
        alert("Ação não permitida.");
        return;
    }

    window.location.href = `clientes_editar.html?id=${id}`;
};

// 🔐 exclusão protegida
window.excluirCliente = async (id) => {
    const roleAtual = await obterRole();
    if (roleAtual !== "admin") {
        alert("Ação não permitida.");
        return;
    }

    if (!confirm("Excluir cliente?")) return;

    const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
        return;
    }

    carregarClientes();
};

/* ======================================================
                   INICIALIZAÇÃO DA PÁGINA
====================================================== */
document.addEventListener("DOMContentLoaded", async () => {
    await carregarUsuario();
    await carregarClientes();

    // Botão novo cliente somente admin
    const btnNovo = document.getElementById("btnNovo");
    if (btnNovo) {
        btnNovo.addEventListener("click", () => {
            window.location.href = "clientes_novo.html";
        });
    }
});
