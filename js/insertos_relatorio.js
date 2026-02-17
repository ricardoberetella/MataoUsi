import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// --- 1. FUNÇÕES GLOBAIS (Acessíveis pelo HTML) ---
window.abrirEdicao = (id, insertoId, tipo, qtdAtual, obs) => {
    console.log("Abrindo edição para ID:", id);
    document.getElementById("edit_id").value = id;
    document.getElementById("edit_inserto_id").value = insertoId;
    document.getElementById("edit_tipo").value = tipo;
    document.getElementById("edit_qtd_antiga").value = qtdAtual;
    document.getElementById("edit_qtd").value = qtdAtual;
    document.getElementById("edit_obs").value = obs || "";
    document.getElementById("modalEditMov").style.display = "flex";
};

window.fecharModal = () => {
    document.getElementById("modalEditMov").style.display = "none";
};

window.excluirMov = async (id, insertoId, tipo, quantidade) => {
    if (!confirm("Deseja excluir esta movimentação? O stock será ajustado.")) return;
    try {
        const { data: ins } = await supabase.from('insertos').select('estoque_atual').eq('id', insertoId).single();
        let novoSaldo = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.estoque_atual) - Number(quantidade) 
            : Number(ins.estoque_atual) + Number(quantidade);

        await supabase.from('insertos_movimentacoes').delete().eq('id', id);
        await supabase.from('insertos').update({ estoque_atual: novoSaldo }).eq('id', insertoId);

        alert("Excluído com sucesso!");
        carregarRelatorio();
    } catch (e) {
        alert("Erro ao excluir: " + e.message);
    }
};

// --- 2. LOGICA DE SALVAR (CORRIGIDA E TESTADA) ---
async function processarSalvar() {
    console.log("Botão Salvar clicado!"); // Log para teste

    const id = document.getElementById("edit_id").value;
    const insertoId = document.getElementById("edit_inserto_id").value;
    const tipo = document.getElementById("edit_tipo").value;
    const qtdAntiga = Number(document.getElementById("edit_qtd_antiga").value);
    const qtdNova = Number(document.getElementById("edit_qtd").value);
    const obs = document.getElementById("edit_obs").value;

    if (!id) {
        alert("Erro: ID da movimentação não encontrado.");
        return;
    }

    try {
        // 1. Calcular diferença
        const diferenca = qtdNova - qtdAntiga;
        console.log("Diferença calculada:", diferenca);

        // 2. Buscar stock atual
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('estoque_atual')
            .eq('id', insertoId)
            .single();

        if (errFetch) throw errFetch;

        // 3. Calcular novo saldo do inserto
        let novoSaldoPrincipal = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.estoque_atual) + diferenca 
            : Number(ins.estoque_atual) - diferenca;

        // 4. Atualizar Movimentação
        const { error: errUpdMov } = await supabase
            .from('insertos_movimentacoes')
            .update({ quantidade: qtdNova, observacao: obs })
            .eq('id', id);

        if (errUpdMov) throw errUpdMov;

        // 5. Atualizar Stock Principal
        const { error: errUpdIns } = await supabase
            .from('insertos')
            .update({ estoque_atual: novoSaldoPrincipal })
            .eq('id', insertoId);

        if (errUpdIns) throw errUpdIns;

        alert("Atualizado com sucesso!");
        window.fecharModal();
        carregarRelatorio();

    } catch (error) {
        console.error("Erro completo:", error);
        alert("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    }
}

// --- 3. CARREGAR TABELA ---
async function carregarRelatorio() {
    const dataInicio = document.getElementById("data_inicio").value;
    const dataFim = document.getElementById("data_fim").value;
    const tbody = document.getElementById("corpoRelatorio");
    if (!tbody) return;

    const { data, error } = await supabase
        .from('insertos_movimentacoes')
        .select(`*, insertos(id, descricao)`)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

    if (error) {
        console.error("Erro ao carregar lista:", error);
        return;
    }

    const isAdmin = (role === "admin");

    tbody.innerHTML = data.map(mov => `
        <tr>
            <td>${new Date(mov.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>${mov.insertos?.descricao || 'N/A'}</td>
            <td><span class="badge ${mov.tipo.toLowerCase() === 'entrada' ? 'badge-entrada' : 'badge-saida'}">${mov.tipo.toUpperCase()}</span></td>
            <td><b>${mov.quantidade}</b></td>
            <td>${mov.observacao || '-'}</td>
            <td class="col-acoes" style="display: ${isAdmin ? 'table-cell' : 'none'}">
                <button class="btn-mini btn-edit" onclick="window.abrirEdicao('${mov.id}', '${mov.inserto_id}', '${mov.tipo}', ${mov.quantidade}, '${mov.observacao || ''}')">Editar</button>
                <button class="btn-mini btn-del" onclick="window.excluirMov('${mov.id}', '${mov.inserto_id}', '${mov.tipo}', ${mov.quantidade})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

// --- 4. INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;
    role = await obterRole();

    // Configura datas iniciais
    const hoje = new Date();
    document.getElementById("data_inicio").valueAsDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById("data_fim").valueAsDate = hoje;

    // Vincular cliques
    document.getElementById("btnFiltrar").onclick = carregarRelatorio;
    
    const btnSalvar = document.getElementById("btnSalvarEdit");
    if (btnSalvar) {
        btnSalvar.onclick = processarSalvar;
    }

    carregarRelatorio();
});
