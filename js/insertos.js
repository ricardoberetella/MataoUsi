import { supabase } from "./auth.js";

// Inicialização ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    // Se estiver na página de lista
    if (document.getElementById("corpoTabelaInsertos")) {
        carregarInsertos();
    }

    // Se estiver na página de novo cadastro
    const btnSalvar = document.getElementById("btnSalvarInserto");
    if (btnSalvar) {
        btnSalvar.addEventListener("click", salvarNovoInserto);
    }
});

// --- FUNÇÕES DE LISTAGEM ---

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
                <td>${ins.descricao}</td>
                <td>${ins.marca || '-'}</td>
                <td style="font-weight: bold; color: ${ins.quantidade <= 2 ? '#ef4444' : '#34d399'}">
                    ${ins.quantidade}
                </td>
                <td style="text-align: center;">
                    <button class="btn-mini btn-entrada" onclick="window.abrirModal('${ins.id}', 'entrada', '${ins.descricao}')">↑ Entrada</button>
                    <button class="btn-mini btn-saida" onclick="window.abrirModal('${ins.id}', 'saida', '${ins.descricao}')">↓ Saída</button>
                    <button class="btn-mini btn-del" onclick="window.excluirInserto('${ins.id}')">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Erro ao carregar:", error.message);
    }
}

// --- FUNÇÕES DE CADASTRO ---

async function salvarNovoInserto() {
    // IDs sincronizados com o insertos_novo.html para evitar erro de 'null'
    const descricao = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const quantidade = parseInt(document.getElementById("ins_quantidade").value) || 0;

    if (!descricao) {
        alert("A descrição é obrigatória!");
        return;
    }

    try {
        const { error } = await supabase
            .from('insertos')
            .insert([{ descricao, marca, quantidade }]);

        if (error) throw error;

        alert("Inserto cadastrado com sucesso!");
        window.location.href = "insertos_lista.html";
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
}

// --- FUNÇÕES DO MODAL (ENTRADA/SAÍDA) ---

window.abrirModal = (id, tipo, descricao) => {
    document.getElementById("modalId").value = id;
    document.getElementById("modalTipo").value = tipo;
    document.getElementById("modalTitulo").innerText = tipo === 'entrada' ? `Entrada: ${descricao}` : `Saída: ${descricao}`;
    document.getElementById("mov_data").value = new Date().toISOString().split('T')[0];
    document.getElementById("modalMovimentacao").style.display = "flex";
};

window.fecharModalMov = () => {
    document.getElementById("modalMovimentacao").style.display = "none";
};

window.confirmarMovimento = async () => {
    const id = document.getElementById("modalId").value;
    const tipo = document.getElementById("modalTipo").value;
    const qtdMov = parseInt(document.getElementById("mov_qtd").value);
    const dataMov = document.getElementById("mov_data").value;
    const obs = document.getElementById("mov_obs").value;

    if (qtdMov <= 0) return alert("Quantidade inválida");

    try {
        // 1. Busca quantidade atual
        const { data: ins } = await supabase.from('insertos').select('quantidade').eq('id', id).single();
        const novaQtd = tipo === 'entrada' ? ins.quantidade + qtdMov : ins.quantidade - qtdMov;

        if (novaQtd < 0) return alert("Saldo insuficiente para esta saída!");

        // 2. Atualiza estoque principal
        await supabase.from('insertos').update({ quantidade: novaQtd }).eq('id', id);

        // 3. Registra no histórico (Relatórios)
        await supabase.from('insertos_movimentacoes').insert([{
            inserto_id: id,
            tipo: tipo,
            quantidade: qtdMov,
            data: dataMov,
            observacao: obs
        }]);

        window.fecharModalMov();
        carregarInsertos();
    } catch (error) {
        alert("Erro na movimentação: " + error.message);
    }
};

window.excluirInserto = async (id) => {
    if (!confirm("Deseja realmente excluir este inserto?")) return;
    try {
        await supabase.from('insertos').delete().eq('id', id);
        carregarInsertos();
    } catch (error) {
        alert("Erro ao excluir: " + error.message);
    }
};
