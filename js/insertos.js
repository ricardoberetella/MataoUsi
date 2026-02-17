import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Carrega a lista se estiver na página de listagem
    if (document.getElementById("corpoTabelaInsertos")) {
        carregarInsertos();
    }

    // Ativa o botão salvar se estiver na página de novo cadastro
    const btnSalvar = document.getElementById("btnSalvarInserto");
    if (btnSalvar) {
        btnSalvar.onclick = salvarNovoInserto;
    }
});

async function carregarInsertos() {
    const tbody = document.getElementById("corpoTabelaInsertos");
    try {
        const { data, error } = await supabase
            .from('insertos')
            .select('*')
            .order('descricao', { ascending: true });

        if (error) throw error;

        tbody.innerHTML = data.map(ins => `
            <tr>
                <td style="font-weight: bold;">${ins.descricao}</td>
                <td>${ins.marca || '-'}</td>
                <td><span class="badge-qtd ${ins.quantidade <= 2 ? 'qtd-baixa' : ''}">${ins.quantidade}</span></td>
                <td style="text-align: center;">
                    <button class="btn-tabela btn-entrada" onclick="window.abrirModal('${ins.id}', 'entrada', '${ins.descricao}')">↑ Entrada</button>
                    <button class="btn-tabela btn-saida" onclick="window.abrirModal('${ins.id}', 'saida', '${ins.descricao}')">↓ Saída</button>
                    <button class="btn-tabela btn-excluir" onclick="window.excluirInserto('${ins.id}')">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Erro ao carregar:", error.message);
    }
}

async function salvarNovoInserto() {
    // IDs sincronizados com o HTML corrigido para evitar erro de null
    const descricao = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const quantidade = parseInt(document.getElementById("ins_quantidade").value) || 0;

    if (!descricao) return alert("A descrição é obrigatória!");

    try {
        const { error } = await supabase.from('insertos').insert([{ descricao, marca, quantidade }]);
        if (error) throw error;
        alert("Inserto cadastrado!");
        window.location.href = "insertos_lista.html";
    } catch (error) {
        alert("Erro: " + error.message);
    }
}

// Funções do Modal
window.abrirModal = (id, tipo, descricao) => {
    document.getElementById("modalId").value = id;
    document.getElementById("modalTipo").value = tipo;
    document.getElementById("modalTitulo").innerText = tipo === 'entrada' ? `Entrada: ${descricao}` : `Saída: ${descricao}`;
    document.getElementById("modalMovimentacao").style.display = "flex";
};

window.fecharModalMov = () => {
    document.getElementById("modalMovimentacao").style.display = "none";
};

window.confirmarMovimento = async () => {
    const id = document.getElementById("modalId").value;
    const tipo = document.getElementById("modalTipo").value;
    const qtdMov = parseInt(document.getElementById("mov_qtd").value);

    try {
        const { data: ins } = await supabase.from('insertos').select('quantidade').eq('id', id).single();
        const novaQtd = tipo === 'entrada' ? ins.quantidade + qtdMov : ins.quantidade - qtdMov;

        if (novaQtd < 0) return alert("Estoque insuficiente!");

        await supabase.from('insertos').update({ quantidade: novaQtd }).eq('id', id);
        
        // Registra para o Relatório
        await supabase.from('insertos_movimentacoes').insert([{
            inserto_id: id,
            tipo: tipo,
            quantidade: qtdMov,
            data: new Date().toISOString()
        }]);

        window.fecharModalMov();
        carregarInsertos();
    } catch (error) {
        alert("Erro na movimentação");
    }
};

window.excluirInserto = async (id) => {
    if (!confirm("Excluir inserto?")) return;
    await supabase.from('insertos').delete().eq('id', id);
    carregarInsertos();
};
