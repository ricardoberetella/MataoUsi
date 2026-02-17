import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// 1. Tornar as funções globais para o HTML conseguir chamá-las
window.excluirMov = async (id, insertoId, tipo, quantidade) => {
    if (!confirm(`Deseja excluir esta movimentação? O saldo do estoque será ajustado automaticamente.`)) return;

    try {
        // Buscar saldo atual do inserto
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('estoque_atual')
            .eq('id', insertoId)
            .single();

        if (errFetch) throw errFetch;

        // Calcular novo saldo (Inverter a operação original)
        let novoSaldo = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.estoque_atual) - Number(quantidade) 
            : Number(ins.estoque_atual) + Number(quantidade);

        // Deletar a movimentação
        const { error: errDel } = await supabase
            .from('insertos_movimentacoes')
            .delete()
            .eq('id', id);

        if (errDel) throw errDel;

        // Atualizar o estoque principal
        await supabase
            .from('insertos')
            .update({ estoque_atual: novoSaldo })
            .eq('id', insertoId);

        alert("Excluído com sucesso!");
        carregarRelatorio(); // Recarregar a tabela

    } catch (error) {
        console.error("Erro na exclusão:", error);
        alert("Erro ao excluir: " + error.message);
    }
};

window.abrirEdicao = (id, insertoId, tipo, qtdAtual, obs) => {
    document.getElementById("edit_id").value = id;
    document.getElementById("edit_inserto_id").value = insertoId;
    document.getElementById("edit_tipo").value = tipo;
    document.getElementById("edit_qtd_antiga").value = qtdAtual;
    document.getElementById("edit_qtd").value = qtdAtual;
    document.getElementById("edit_obs").value = obs;
    document.getElementById("modalEditMov").style.display = "flex";
};

// 2. Função para carregar os dados na tabela
async function carregarRelatorio() {
    const dataInicio = document.getElementById("data_inicio").value;
    const dataFim = document.getElementById("data_fim").value;
    const tbody = document.getElementById("corpoRelatorio");

    if (!tbody) return;

    const { data, error } = await supabase
        .from('insertos_movimentacoes')
        .select(`
            id, 
            data, 
            tipo, 
            quantidade, 
            observacao, 
            inserto_id,
            insertos ( id, descricao )
        `)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

    if (error) {
        console.error("Erro ao carregar:", error);
        return;
    }

    const isAdmin = (role === "admin");
    
    // Mostra/Esconde a coluna de ações no cabeçalho
    document.querySelectorAll(".col-acoes").forEach(el => {
        el.style.display = isAdmin ? "table-cell" : "none";
    });

    tbody.innerHTML = data.map(mov => {
        const insertoNome = mov.insertos?.descricao || 'N/A';
        const insertoId = mov.insertos?.id || mov.inserto_id;

        return `
        <tr>
            <td>${new Date(mov.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>${insertoNome}</td>
            <td><span class="badge ${mov.tipo.toLowerCase() === 'entrada' ? 'badge-entrada' : 'badge-saida'}">${mov.tipo.toUpperCase()}</span></td>
            <td><b>${mov.quantidade}</b></td>
            <td>${mov.observacao || '-'}</td>
            <td class="col-acoes" style="display: ${isAdmin ? 'table-cell' : 'none'}">
                <button class="btn-mini btn-edit" onclick="abrirEdicao('${mov.id}', '${insertoId}', '${mov.tipo}', ${mov.quantidade}, '${mov.observacao || ''}')">Editar</button>
                <button class="btn-mini btn-del" onclick="excluirMov('${mov.id}', '${insertoId}', '${mov.tipo}', ${mov.quantidade})">Excluir</button>
            </td>
        </tr>
        `;
    }).join('');
}

// 3. Salvar Edição
document.getElementById("btnSalvarEdit").onclick = async () => {
    const id = document.getElementById("edit_id").value;
    const insertoId = document.getElementById("edit_inserto_id").value;
    const tipo = document.getElementById("edit_tipo").value;
    const qtdAntiga = Number(document.getElementById("edit_qtd_antiga").value);
    const qtdNova = Number(document.getElementById("edit_qtd").value);
    const obs = document.getElementById("edit_obs").value;

    try {
        const diferenca = qtdNova - qtdAntiga;
        
        const { data: ins } = await supabase.from('insertos').select('estoque_atual').eq('id', insertoId).single();
        let ajusteSaldo = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.estoque_atual) + diferenca 
            : Number(ins.estoque_atual) - diferenca;

        const { error } = await supabase
            .from('insertos_movimentacoes')
            .update({ quantidade: qtdNova, observacao: obs })
            .eq('id', id);

        if (error) throw error;

        await supabase.from('insertos').update({ estoque_atual: ajusteSaldo }).eq('id', insertoId);

        document.getElementById("modalEditMov").style.display = "none";
        carregarRelatorio();
        alert("Atualizado com sucesso!");

    } catch (error) {
        alert("Erro ao atualizar: " + error.message);
    }
};

// 4. Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;
    
    role = await obterRole();

    const hoje = new Date();
    document.getElementById("data_inicio").valueAsDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById("data_fim").valueAsDate = hoje;

    document.getElementById("btnFiltrar").onclick = carregarRelatorio;
    carregarRelatorio();
});
