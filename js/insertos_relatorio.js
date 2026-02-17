import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

async function carregarRelatorio() {
    const dataInicio = document.getElementById("data_inicio").value;
    const dataFim = document.getElementById("data_fim").value;
    const tbody = document.getElementById("corpoRelatorio");

    const { data, error } = await supabase
        .from('insertos_movimentacoes')
        .select(`*, insertos ( descricao )`)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

    if (error) return;

    // Mostrar coluna de ações apenas para Admin
    if (role === "admin") {
        document.querySelectorAll(".col-acoes").forEach(el => el.style.display = "table-cell");
    }

    tbody.innerHTML = data.map(mov => `
        <tr>
            <td>${new Date(mov.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>${mov.insertos?.descricao || 'N/A'}</td>
            <td><span class="badge ${mov.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}">${mov.tipo.toUpperCase()}</span></td>
            <td><b>${mov.quantidade}</b></td>
            <td>${mov.observacao || '-'}</td>
            <td class="col-acoes" style="display: ${role === 'admin' ? 'table-cell' : 'none'}">
                <button class="btn-mini btn-edit" onclick="abrirEdicao('${mov.id}', '${mov.quantidade}', '${mov.observacao || ''}')">Editar</button>
                <button class="btn-mini btn-del" onclick="excluirMov('${mov.id}')">Excluir</button>
            </td>
        </tr>
    `).join('');
}

// --- FUNÇÕES DE AÇÃO (EXPOSTAS AO WINDOW) ---

window.excluirMov = async (id) => {
    if (!confirm("Deseja realmente excluir este registro de movimentação? Isso não alterará o saldo atual do inserto automaticamente.")) return;
    
    const { error } = await supabase.from('insertos_movimentacoes').delete().eq('id', id);
    if (error) alert("Erro ao excluir");
    else carregarRelatorio();
};

window.abrirEdicao = (id, qtd, obs) => {
    document.getElementById("edit_id").value = id;
    document.getElementById("edit_qtd").value = qtd;
    document.getElementById("edit_obs").value = obs;
    document.getElementById("modalEditMov").style.display = "flex";
};

document.getElementById("btnSalvarEdit").onclick = async () => {
    const id = document.getElementById("edit_id").value;
    const qtd = document.getElementById("edit_qtd").value;
    const obs = document.getElementById("edit_obs").value;

    const { error } = await supabase
        .from('insertos_movimentacoes')
        .update({ quantidade: qtd, observacao: obs })
        .eq('id', id);

    if (error) alert("Erro ao atualizar");
    else {
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
