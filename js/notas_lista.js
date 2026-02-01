import { supabase, verificarLogin } from "./auth.js";

// Captura o ID da URL para saber se é Edição ou Nova Nota
const urlParams = new URLSearchParams(window.location.search);
const notaId = urlParams.get('id');

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    await carregarClientes();

    // Se houver ID na URL, estamos em modo EDIÇÃO
    if (notaId) {
        document.querySelector(".topbar-title").innerText = "Editar Nota Fiscal";
        document.getElementById("btnSalvar").innerText = "Atualizar Nota";
        await carregarDadosEdicao(notaId);
    }
});

async function carregarClientes() {
    const select = document.getElementById("cliente_id");
    const { data, error } = await supabase.from("clientes").select("id, razao_social").order("razao_social");
    
    if (data) {
        data.forEach(cliente => {
            const opt = document.createElement("option");
            opt.value = cliente.id;
            opt.text = cliente.razao_social;
            select.appendChild(opt);
        });
    }
}

async function carregarDadosEdicao(id) {
    const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Erro ao carregar nota:", error);
        alert("Erro ao buscar dados da nota.");
        return;
    }

    if (data) {
        document.getElementById("numero_nf").value = data.numero_nf;
        document.getElementById("cliente_id").value = data.cliente_id;
        document.getElementById("data_nf").value = data.data_nf;
        document.getElementById("total").value = data.total || 0;
    }
}

document.getElementById("formNota").addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("btnSalvar");
    btn.disabled = true;
    btn.innerText = "Salvando...";

    const dados = {
        numero_nf: document.getElementById("numero_nf").value,
        cliente_id: document.getElementById("cliente_id").value,
        data_nf: document.getElementById("data_nf").value,
        total: parseFloat(document.getElementById("total").value)
    };

    try {
        let erro;
        if (notaId) {
            // Lógica de UPDATE
            const { error } = await supabase
                .from("notas_fiscais")
                .update(dados)
                .eq("id", notaId);
            erro = error;
        } else {
            // Lógica de INSERT
            const { error } = await supabase
                .from("notas_fiscais")
                .insert([dados]);
            erro = error;
        }

        if (erro) throw erro;

        alert(notaId ? "Nota atualizada com sucesso!" : "Nota cadastrada com sucesso!");
        window.location.href = "notas_lista.html";

    } catch (err) {
        alert("Erro ao salvar: " + err.message);
        btn.disabled = false;
        btn.innerText = "Salvar Nota";
    }
});
