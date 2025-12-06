import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let role = "viewer"; // padrão

/* ============================
      VERIFICAR USUÁRIO
============================ */
async function verificarUsuario() {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;

    if (user?.user_metadata?.role) {
        role = user.user_metadata.role;
    }

    console.log("Usuário logado:", user?.email);
    console.log("Papel:", role);
}

/* ============================
      PERMISSÕES
============================ */
function aplicarPermissoes() {
    const btnNovo = document.getElementById("btnNovo");
    const thAcoes = document.getElementById("thAcoesClientes");

    if (btnNovo) btnNovo.style.display = role === "admin" ? "inline-block" : "none";
    if (thAcoes) thAcoes.style.display = role === "admin" ? "" : "none";

    document.querySelectorAll(".acoes-col").forEach(col => {
        col.style.display = role === "admin" ? "" : "none";
    });
}

/* ============================
      LISTAR CLIENTES
============================ */
async function carregarClientes() {
    const tbody = document.getElementById("listaClientes");
    tbody.innerHTML = `
        <tr><td colspan="3" style="text-align:center;color:#aaa;">Carregando...</td></tr>
    `;

    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social", { ascending: true });

    if (error) {
        console.error("Erro ao consultar tabela clientes:", error);

        tbody.innerHTML = `
            <tr><td colspan="3" style="color:red;text-align:center;">
                Erro ao carregar clientes.<br>
                Verifique RLS, permissões ou nomes das colunas.
            </td></tr>
        `;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="3" style="text-align:center;color:#aaa;">
                Nenhum cliente encontrado.
            </td></tr>
        `;
        return;
    }

    tbody.innerHTML = "";

    data.forEach(c => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${c.razao_social || ""}</td>
            <td>${c.cpf_cnpj || ""}</td>

            <td class="acoes-col">
                <button class="btn-azul" onclick="editarCliente(${c.id})">Editar</button>
                <button class="btn-vermelho" onclick="excluirCliente(${c.id})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    aplicarPermissoes();
}

/* ============================
          EDITAR
============================ */
window.editarCliente = (id) => {
    if (role !== "admin") return;
    window.location.href = `clientes_editar.html?id=${id}`;
};

/* ============================
          EXCLUIR
============================ */
window.excluirCliente = async (id) => {
    if (role !== "admin") return;

    if (!confirm("Deseja realmente excluir este cliente?")) return;

    await supabase.from("clientes").delete().eq("id", id);
    carregarClientes();
};

/* ============================
      BOTÃO NOVO CLIENTE
============================ */
document.addEventListener("DOMContentLoaded", () => {
    const btnNovo = document.getElementById("btnNovo");
    if (btnNovo) {
        btnNovo.onclick = () => {
            if (role !== "admin") return;
            window.location.href = "clientes_novo.html";
        };
    }
});

/* ============================
      INICIAR TELA
============================ */
document.addEventListener("DOMContentLoaded", async () => {
    await verificarUsuario();
    await carregarClientes();
});
