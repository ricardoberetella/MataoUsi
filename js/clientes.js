import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let clienteSelecionado = null;

/* ===========================
   CARREGAR LISTA DE CLIENTES
=========================== */
document.addEventListener("DOMContentLoaded", () => {
    carregarClientes();
});

async function carregarClientes() {
    const lista = document.getElementById("listaClientes");
    lista.innerHTML = "<p>Carregando...</p>";

    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social", { ascending: true });

    if (error) {
        lista.innerHTML = "<p>Erro ao carregar clientes.</p>";
        console.log(error);
        return;
    }

    lista.innerHTML = "";

    data.forEach(c => {
        const div = document.createElement("div");
        div.classList.add("item-cliente");

        div.innerHTML = `
            <strong>${c.razao_social}</strong><br>
            <span>CNPJ: ${c.cnpj}</span>
        `;

        // 🔵 Evento para abrir detalhes
        div.addEventListener("click", () => abrirDetalhes(c));

        lista.appendChild(div);
    });
}

/* ===========================
        ABRIR DETALHES
=========================== */
function abrirDetalhes(cliente) {
    clienteSelecionado = cliente;

    const det = document.getElementById("detalhesCliente");
    det.classList.remove("hidden");

    det.innerHTML = `
        <h2 style="color:#00eaff;">${cliente.razao_social}</h2>

        <p><strong>CNPJ:</strong> ${cliente.cnpj}</p>
        <p><strong>Telefone:</strong> ${cliente.telefone || "-"}</p>
        <p><strong>Email:</strong> ${cliente.email || "-"}</p>
        <p><strong>Endereço:</strong> ${cliente.endereco || "-"}</p>

        <button class="btn-editar" onclick="editarCliente(${cliente.id})">Editar</button>
        <button class="btn-excluir" onclick="excluirCliente(${cliente.id})">Excluir</button>
    `;
}

/* ===========================
            EDITAR
=========================== */
window.editarCliente = function (id) {
    window.location.href = `clientes_editar.html?id=${id}`;
};

/* ===========================
            EXCLUIR
=========================== */
window.excluirCliente = async function (id) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir cliente.");
        return;
    }

    alert("Cliente excluído!");
    carregarClientes();
    document.getElementById("detalhesCliente").classList.add("hidden");
};
