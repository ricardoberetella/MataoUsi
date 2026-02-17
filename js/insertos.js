import { supabase, verificarLogin } from "./auth.js";

// Função para carregar a lista na tabela
export async function carregarInsertos() {
    const { data, error } = await supabase
        .from('insertos')
        .select('*')
        .order('descricao', { ascending: true });

    if (error) {
        console.error("Erro ao carregar insertos:", error.message);
        return;
    }

    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody) return;

    tbody.innerHTML = data.map(ins => `
        <tr style="background-color: ${ins.cor_identificacao || 'transparent'}; color: ${ins.cor_identificacao ? '#000' : 'inherit'}">
            <td>${ins.descricao}</td>
            <td>${ins.marca || '-'}</td>
            <td class="${ins.quantidade <= ins.estoque_minimo ? 'qtd-baixa' : 'qtd-ok'}">
                ${ins.quantidade}
            </td>
            <td>${ins.estoque_minimo}</td>
            <td>
                <button class="btn-acao-tabela btn-entrada" onclick="ajustarEstoque('${ins.id}', 1)">+1</button>
                <button class="btn-acao-tabela btn-baixa" onclick="ajustarEstoque('${ins.id}', -1)">-1</button>
            </td>
        </tr>
    `).join('');
}

// Função para Inclusão/Baixa rápida
window.ajustarEstoque = async (id, delta) => {
    // Busca quantidade atual
    const { data } = await supabase.from('insertos').select('quantidade').eq('id', id).single();
    const novaQtd = (data.quantidade || 0) + delta;

    if (novaQtd < 0) return alert("Estoque não pode ser negativo!");

    const { error } = await supabase
        .from('insertos')
        .update({ quantidade: novaQtd })
        .eq('id', id);

    if (!error) carregarInsertos();
};

// Função para Salvar Novo Inserto
window.salvarNovoInserto = async () => {
    const descricao = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const quantidade = parseInt(document.getElementById("ins_qtd").value);
    const estoque_minimo = parseInt(document.getElementById("ins_minimo").value);
    const cor = document.getElementById("ins_cor").value;

    const { error } = await supabase.from('insertos').insert([{
        descricao, marca, quantidade, estoque_minimo, cor_identificacao: cor
    }]);

    if (error) alert("Erro: " + error.message);
    else window.location.href = "insertos_lista.html";
};
