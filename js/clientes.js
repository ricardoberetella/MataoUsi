import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==============================
      BOTÃO NOVO CLIENTE
============================== */
document.addEventListener("DOMContentLoaded", () => {
    const btnNovo = document.getElementById("btnNovo");
    if (btnNovo) {
        btnNovo.onclick = () => {
            window.location.href = "clientes_cadastrar.html";
        };
    }

    carregarClientes();
    carregarEdicao();
});

/* ==============================
      LISTAR CLIENTES
============================== */
async function carregarClientes() {
    const tbody = document.getElementById("listaClientes");
    if (!tbody) return;

    const { data } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social", { ascending: true });

    tbody.innerHTML = "";

    data.forEach(c => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${c.razao_social}</td>
            <td>${c.cpf_cnpj}</td>
            <td>
                <button class="btn-azul" onclick="editarCliente(${c.id})">Editar</button>
                <button class="btn-vermelho" onclick="excluirCliente(${c.id})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/* ==============================
      EDITAR
============================== */
window.editarCliente = id => {
    window.location.href = `clientes_editar.html?id=${id}`;
};

/* ==============================
      EXCLUIR
============================== */
window.excluirCliente = async id => {
    if (!confirm("Excluir este cliente?")) return;

    await supabase.from("clientes")
        .delete()
        .eq("id", id);

    carregarClientes();
};

/* ==============================
      CARREGAR DADOS NA EDIÇÃO
============================== */
async function carregarEdicao() {
    const btnSalvar = document.getElementById("btnSalvarEdicao");
    if (!btnSalvar) return;

    const id = new URLSearchParams(window.location.search).get("id");

    const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

    document.getElementById("razao_social").value = data.razao_social;
    document.getElementById("cpf_cnpj").value = data.cpf_cnpj;
    document.getElementById("telefone").value = data.telefone || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("endereco").value = data.endereco || "";

    btnSalvar.onclick = async () => {
        const payload = {
            razao_social: document.getElementById("razao_social").value.trim(),
            cpf_cnpj: document.getElementById("cpf_cnpj").value.trim(),
            telefone: document.getElementById("telefone").value.trim(),
            email: document.getElementById("email").value.trim(),
            endereco: document.getElementById("endereco").value.trim()
        };

        await supabase.from("clientes")
            .update(payload)
            .eq("id", id);

        window.location.href = "clientes.html";
    };
}

/* ==============================
      SALVAR NOVO CLIENTE
============================== */
window.salvarCliente = async () => {

    const payload = {
        razao_social: document.getElementById("razao_social").value.trim(),
        cpf_cnpj: document.getElementById("cpf_cnpj").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        email: document.getElementById("email").value.trim(),
        endereco: document.getElementById("endereco").value.trim()
    };

    await supabase.from("clientes").insert([payload]);

    window.location.href = "clientes.html";
};
