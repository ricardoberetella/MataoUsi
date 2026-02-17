import { supabase } from "./auth.js";

// Função para Salvar o PRIMEIRO inserto
async function salvarNovoInserto() {
    const desc = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const qtd = parseInt(document.getElementById("ins_quantidade").value) || 0;

    if (!desc) return alert("Preencha a descrição!");

    try {
        const { error } = await supabase
            .from('insertos')
            .insert([{ 
                descricao: desc, 
                marca: marca, 
                quantidade: qtd 
            }]);

        if (error) throw error;

        alert("Cadastrado com sucesso!");
        window.location.href = "insertos_lista.html";
    } catch (err) {
        alert("Erro no Supabase: " + err.message);
    }
}

// Vincula o botão (Certifique-se que o ID no HTML é este)
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnSalvarInserto");
    if (btn) btn.onclick = salvarNovoInserto;
});
