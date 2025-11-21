import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS
const listaDiv = document.getElementById("listaClientes");
const detalhesDiv = document.getElementById("detalhesCliente");

/* ===============================
   CARREGAR LISTA DE CLIENTES
=============================== */
async function carregarClientes() {
    const { data, error } = await supabase
        .from("clientes")
        .select("id, razao_social, cpf_cnpj")
        .order("razao_social", { ascending: true });

    if (error) {
        alert("Erro ao carregar clientes");
        console.log(error);
        return;
    }

    if (!data || data.length === 0) {
        listaDiv.innerHTML = "<p class='aviso'>Nenhum cliente cadastrado.</p>";
        return;
    }

    listaDiv.innerHTML = "";

    data.forEach(c => {
        const item = document.createElement("div");
        item.classList.add("cliente-item");

        item.innerHTML = `
            <span><strong>${c.razao_social}</strong></span>
            <span>CNPJ: ${c.cpf_cnpj}</span>
            <button class="btn-primary-sm" onclick="mostrarDetalhes(${c.id})">Abrir</button>
        `;

        listaDiv.appendChild(item);
    });
}

/* ===============================
   MOSTRAR DETALHES DO CLIENTE
=============================== */
window.mostrarDetalhes = async function (id) {
    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert("Erro ao buscar detalhes");
        return;
    }

    detalhesDiv.innerHTML = `
        <h2>Dados do Cliente</h2>

        <p><b>Razão Social:</b> ${data.razao_social}</p>
        <p><b>CNPJ:</b> ${data.cpf_cnpj}</p>
        <p><b>Telefone:</b> ${data.telefone || "-"}</p>
        <p><b>E-mail:</b> ${data.email || "-"}</p>
        <p><b>Endereço:</b> ${data.endereco || "-"}</p>

        <div class="grupo-botoes">
            <button class="btn-primary" onclick="editarCliente(${data.id})">Editar</button>
            <button class="btn-danger" onclick="excluirCliente(${data.id})">Excluir</button>
        </div>
    `;
};

/* ===============================
       EDITAR CLIENTE
=============================== */
window.editarCliente = function (id) {
    window.location.href = `clientes_editar.html?id=${id}`;
};

/* ===============================
       EXCLUIR CLIENTE
=============================== */
window.excluirCliente = async function (id) {
    if (!confirm("Deseja excluir este cliente?")) return;

    const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
        return;
    }

    alert("Cliente excluído!");
    location.reload();
};

carregarClientes();
