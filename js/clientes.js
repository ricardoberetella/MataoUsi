import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase; // debug opcional

let role = "viewer"; // padrão seguro

/* ============================
      VERIFICAR USUÁRIO
============================ */
async function verificarUsuario() {
    const sessionData = await supabase.auth.getSession();
    const user = sessionData?.data?.session?.user;

    console.log("USER =", user);

    if (user?.user_metadata?.role) {
        role = user.user_metadata.role;
    }

    console.log("ROLE =", role);
}

/* ============================
      APLICAR PERMISSÕES
============================ */
function aplicarPermissoes() {

    // Botão novo cliente
    const btnNovo = document.getElementById("btnNovo");
    if (btnNovo)
        btnNovo.style.display = (role === "admin") ? "inline-block" : "none";

    // Cabeçalho ações
    const thAcoes = document.getElementById("thAcoesClientes");
    if (thAcoes)
        thAcoes.style.display = (role === "admin") ? "" : "none";

    // Células ações
    document.querySelectorAll(".acoes-col").forEach(td => {
        td.style.display = (role === "admin") ? "" : "none";
    });
}

/* ============================
      LISTAR CLIENTES
============================ */
async function carregarClientes() {
    const tbody = document.getElementById("listaClientes");

    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social", { ascending: true });

    tbody.innerHTML = "";

    data.forEach(c => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${c.razao_social}</td>
            <td>${c.cpf_cnpj}</td>

            <td class="acoes-col">
                <button class="btn-azul" onclick="editarCliente(${c.id})">Editar</button>
                <button class="btn-vermelho" onclick="excluirCliente(${c.id})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    aplicarPermissoes(); // agora funciona corretamente
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

    if (!confirm("Excluir este cliente?")) return;

    await supabase.from("clientes").delete().eq("id", id);
    carregarClientes();
};

/* ============================
       BOTÃO NOVO CLIENTE
============================ */
document.addEventListener("DOMContentLoaded", () => {
    const btnNovo = document.getElementById("btnNovo");
    if (btnNovo) {
        btnNovo.addEventListener("click", () => {
            if (role !== "admin") return;
            window.location.href = "clientes_novo.html";
        });
    }
});

/* ============================
      ORDEM CORRETA
============================ */
document.addEventListener("DOMContentLoaded", async () => {
    await verificarUsuario();
    await carregarClientes();
});
