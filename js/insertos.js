import { supabase } from "./auth.js";

// ... mantenha suas outras funções (carregarInsertos, ajustarEstoque) aqui ...

async function salvarNovoInserto() {
    const descricao = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const quantidade = parseInt(document.getElementById("ins_qtd").value) || 0;
    const estoque_minimo = parseInt(document.getElementById("ins_minimo").value) || 0;
    const cor = document.getElementById("ins_cor").value;

    if (!descricao) {
        alert("A descrição é obrigatória!");
        return;
    }

    const { error } = await supabase.from('insertos').insert([{
        descricao, 
        marca, 
        quantidade, 
        estoque_minimo, 
        cor_fundo: cor // Use o nome exato da coluna que você criou no Supabase
    }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        window.location.href = "insertos_lista.html";
    }
}

// ESTA PARTE VINCULA A FUNÇÃO AO BOTÃO SEM USAR ONCLICK NO HTML
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnSalvarInserto");
    if (btn) {
        btn.addEventListener("click", salvarNovoInserto);
    }
});
