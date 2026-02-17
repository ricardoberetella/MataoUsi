import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// --- FUNÇÃO EXCLUIR COM REVERSÃO DE SALDO (GLOBAL) ---
window.excluirMov = async (id, insertoId, tipo, quantidade) => {
    if (!confirm(`Deseja excluir esta movimentação? O saldo do estoque será ajustado automaticamente.`)) return;

    try {
        // 1. Buscar saldo atual do inserto para calcular a reversão
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('estoque_atual')
            .eq('id', insertoId)
            .single();

        if (errFetch) throw errFetch;

        // 2. Calcular novo saldo (Inverter a operação: se entrou, retira; se saiu, devolve)
        let novoSaldo = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.estoque_atual) - Number(quantidade) 
            : Number(ins.estoque_atual) + Number(quantidade);

        // 3. Eliminar o registo da movimentação
        const { error: errDel } = await supabase
            .from('insertos_movimentacoes')
            .delete()
            .eq('id', id);

        if (errDel) throw errDel;

        // 4. Atualizar o estoque principal
        await supabase
            .from('insertos')
            .update({ estoque_atual: novoSaldo })
            .eq('id', insertoId);

        alert("Movimentação eliminada e stock atualizado!");
        carregarRelatorio(); // Recarregar a lista

    } catch (error) {
        console.error("Erro na exclusão:", error);
        alert("Erro ao excluir: " + error.message);
    }
};

// --- FUNÇÃO PARA ABRIR O MODAL DE EDIÇÃO (GLOBAL) ---
window.abrirEdicao = (id, insertoId, tipo, qtdAtual, obs) => {
    document.getElementById("edit_id").value = id;
    document.getElementById("edit_inserto_id").value = insertoId;
    document.getElementById("edit_tipo").value = tipo;
    document.getElementById("edit_qtd_antiga").value = qtdAtual;
    document.getElementById("edit_qtd").value = qtdAtual;
    document.getElementById("edit_obs").value = obs;
    document.getElementById("modalEditMov").style.display = "flex";
};

async function carregarRelatorio() {
    const dataInicio = document.getElementById("data_inicio").value;
    const dataFim = document.getElementById("data_fim").value;
    const tbody = document.getElementById("corpoRelatorio");

    const { data, error } = await supabase
        .from('insertos_movimentacoes')
        .select(`*, insertos ( id, descricao )`)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

    if (error) return;

    const isAdmin = (role === "admin");
    document.querySelectorAll(".col-acoes").forEach(el => el.style.display = isAdmin ? "table-cell" : "none");

    tbody.innerHTML = data.map(mov => `
        <tr>
            <td>${new Date(mov.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>${mov.insertos?.descricao || 'N/A'}</td>
            <td><span class="badge ${mov.tipo.toLowerCase() === 'entrada' ? 'badge-entrada' : 'badge-saida'}">${mov.tipo.toUpperCase()}</span></td>
            <td><b>${mov.quantidade}</b></td>
            <td>${mov.observacao || '-'}</td>
            <td class="col-acoes" style="display: ${isAdmin ? 'table-cell' : 'none'}">
                <button class="btn-mini btn-edit" onclick="abrirEdicao('${mov.id}', '${mov.insertos.id}', '${mov.tipo}', ${mov.quantidade}, '${mov.observacao || ''}')">Editar</button>
                <button class="btn-mini btn-del" onclick="excluirMov('${mov.id}', '${mov.insertos.id}', '${mov.tipo}', ${mov.quantidade})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

// Lógica de Salvar Edição
document.getElementById("btnSalvarEdit").onclick = async () => {
    const id = document.getElementById("edit_id").value;
    const insertoId = document.getElementById("edit_inserto_id").value;
    const tipo = document.getElementById("edit_tipo").value;
    const qtdAntiga = Number(document.getElementById("edit_qtd_antiga").value);
    const qtdNova = Number(document.getElementById("edit_qtd").value);
    const obs = document.getElementById("edit_obs").value;

    const diferenca = qtdNova - qtdAntiga;
    const { data: ins } = await supabase.from('insertos').select('estoque_atual').eq('id', insertoId).single();
    
    let ajusteSaldo = (tipo.toLowerCase() === 'entrada') 
        ? Number(ins.estoque_atual) + diferenca 
        : Number(ins.estoque_atual) - diferenca;

    const { error } = await supabase.from('insertos_movimentacoes').update({ quantidade: qtdNova, observacao: obs }).eq('id', id);

    if (!error) {
        await supabase.from('insertos').update({ estoque_atual: ajusteSaldo }).eq('id', insertoId);
        document.getElementById("modalEditMov").style.display = "none";
        carregarRelatorio();
    }
};

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
