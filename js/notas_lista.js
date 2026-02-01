import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    // Bloqueia acesso de visualizadores nesta página por segurança
    const role = user.user_metadata?.role || "viewer";
    if (role === "viewer") {
        alert("Acesso negado.");
        window.location.href = "notas_lista.html";
        return;
    }

    await carregarClientes();
    
    // Define a data de hoje como padrão
    document.getElementById('data_nf').valueAsDate = new Date();

    const form = document.getElementById("formNota");
    form.addEventListener("submit", salvarNota);
});

async function carregarClientes() {
    const select = document.getElementById("cliente_id");
    try {
        const { data, error } = await supabase
            .from("clientes")
            .select("id, razao_social")
            .order("razao_social");

        if (error) throw error;

        select.innerHTML = '<option value="">Selecione um cliente...</option>';
        data.forEach(cliente => {
            const option = document.createElement("option");
            option.value = cliente.id;
            option.textContent = cliente.razao_social;
            select.appendChild(option);
        });
    } catch (err) {
        select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    }
}

async function salvarNota(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Salvando...";

    const nota = {
        numero_nf: document.getElementById("numero_nf").value,
        tipo: document.getElementById("tipo").value,
        cliente_id: document.getElementById("cliente_id").value,
        data_nf: document.getElementById("data_nf").value,
        total: parseFloat(document.getElementById("total").value)
    };

    try {
        const { error } = await supabase
            .from("notas_fiscais")
            .insert([nota]);

        if (error) throw error;

        alert("Nota lançada com sucesso!");
        window.location.href = "notas_lista.html";
    } catch (err) {
        alert("Erro ao salvar nota: " + err.message);
        btn.disabled = false;
        btn.innerText = "Salvar Nota";
    }
}
