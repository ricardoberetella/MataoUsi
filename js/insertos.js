import { supabase } from "./auth.js";

// 1. Carregar os insertos na tela
export async function carregarInsertos() {
    const { data, error } = await supabase.from('insertos').select('*').order('descricao');
    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody || error) return;

    tbody.innerHTML = data.map(ins => `
        <tr>
            <td>${ins.descricao}</td>
            <td>${ins.marca || '-'}</td>
            <td style="font-size: 1.2rem; font-weight: bold;">${ins.quantidade}</td>
            <td style="text-align: center;">
                <button class="btn-acao btn-mais" onclick="ajustarEstoque('${ins.id}', 1)">+1</button>
                <button class="btn-acao btn-menos" onclick="ajustarEstoque('${ins.id}', -1)">-1</button>
            </td>
        </tr>
    `).join('');
}

// 2. Ajustar quantidade (+1 ou -1)
window.ajustarEstoque = async (id, delta) => {
    const { data } = await supabase.from('insertos').select('quantidade').eq('id', id).single();
    const novaQtd = (data.quantidade || 0) + delta;
    if (novaQtd < 0) return;

    await supabase.from('insertos').update({ quantidade: novaQtd }).eq('id', id);
    carregarInsertos();
};

// 3. Salvar novo registro
async function salvarNovoInserto() {
    const payload = {
        descricao: document.getElementById("ins_descricao").value,
        marca: document.getElementById("ins_marca").value,
        quantidade: parseInt(document.getElementById("ins_qtd").value) || 0
    };

    if (!payload.descricao) return alert("Preencha a descrição!");

    const { error } = await supabase.from('insertos').insert([payload]);
    if (error) alert("Erro ao salvar");
    else window.location.href = "insertos_lista.html";
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    carregarInsertos();
    const btn = document.getElementById("btnSalvarInserto");
    if (btn) btn.addEventListener("click", salvarNovoInserto);
});
