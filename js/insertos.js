import { supabase } from "./auth.js";

const modal = document.getElementById("modalMovimentacao");

// 1. Carregar lista principal
export async function carregarInsertos() {
    const { data, error } = await supabase.from('insertos').select('*').order('descricao');
    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody || error) return;

    tbody.innerHTML = data.map(ins => `
        <tr>
            <td>${ins.descricao}</td>
            <td>${ins.marca || '-'}</td>
            <td style="font-size: 1.1rem; font-weight: bold;">
                ${ins.quantidade} un
            </td>
            <td style="text-align: center;">
                <button class="btn-acao btn-entrada" onclick="abrirModal('${ins.id}', 'entrada', '${ins.descricao}')">Entrada</button>
                <button class="btn-acao btn-saida" onclick="abrirModal('${ins.id}', 'saida', '${ins.descricao}')">Baixa</button>
            </td>
        </tr>
    `).join('');
}

// 2. Abrir Modal
window.abrirModal = (id, tipo, nome) => {
    document.getElementById("modalId").value = id;
    document.getElementById("modalTipo").value = tipo;
    document.getElementById("modalTitulo").innerText = tipo === 'entrada' ? `Entrada: ${nome}` : `Baixa: ${nome}`;
    document.getElementById("mov_data").valueAsDate = new Date();
    document.getElementById("mov_qtd").value = 1;
    modal.style.display = "flex";
};

window.fecharModal = () => { modal.style.display = "none"; };

// 3. Salvar Movimentação e Atualizar Saldo
async function processarMovimentacao() {
    const id = document.getElementById("modalId").value;
    const tipo = document.getElementById("modalTipo").value;
    const qtd = parseInt(document.getElementById("mov_qtd").value);
    const dataMov = document.getElementById("mov_data").value;
    const obs = document.getElementById("mov_obs").value;

    if (!qtd || qtd <= 0) return alert("Quantidade inválida");

    const { data: inserto } = await supabase.from('insertos').select('quantidade').eq('id', id).single();
    let novoSaldo = tipo === 'entrada' ? inserto.quantidade + qtd : inserto.quantidade - qtd;

    if (novoSaldo < 0) return alert("Saldo insuficiente para essa baixa!");

    // Registrar no Histórico
    await supabase.from('insertos_movimentacoes').insert([{
        inserto_id: id,
        tipo: tipo,
        quantidade: qtd,
        data: dataMov,
        observacao: obs
    }]);

    // Atualizar Saldo
    await supabase.from('insertos').update({ quantidade: novoSaldo }).eq('id', id);

    fecharModal();
    carregarInsertos();
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    carregarInsertos();
    const btnConfirmar = document.getElementById("btnConfirmarMov");
    if (btnConfirmar) btnConfirmar.onclick = processarMovimentacao;
});
