import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// 1. TORNAR AS FUNÇÕES DISPONÍVEIS NO NAVEGADOR (Escopo Global)
window.abrirEdicao = (id, insertoId, tipo, qtdAtual, obs) => {
    console.log("Abrindo modal para ID:", id);
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

// 2. FUNÇÃO DE SALVAMENTO (REVISADA)
async function salvarAlteracoes() {
    console.log("Iniciando processo de salvamento...");

    // Captura os valores dos inputs
    const id = document.getElementById("edit_id").value;
    const insertoId = document.getElementById("edit_inserto_id").value;
    const tipo = document.getElementById("edit_tipo").value;
    const qtdAntiga = Number(document.getElementById("edit_qtd_antiga").value);
    const qtdNova = Number(document.getElementById("edit_qtd").value);
    const obs = document.getElementById("edit_obs").value;

    if (!id) {
        alert("Erro crítico: ID não encontrado.");
        return;
    }

    try {
        // Bloquear botão para evitar cliques duplos
        const btn = document.getElementById("btnSalvarEdit");
        if(btn) btn.disabled = true;

        // A. Calcular a diferença
        const diferenca = qtdNova - qtdAntiga;

        // B. Buscar estoque atual para o cálculo
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('estoque_atual')
            .eq('id', insertoId)
            .single();

        if (errFetch) throw new Error("Erro ao buscar estoque: " + errFetch.message);

        // C. Calcular novo saldo (Se entrada: soma a diferença | Se saída: subtrai a diferença)
        let novoSaldo = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.estoque_atual) + diferenca 
            : Number(ins.estoque_atual) - diferenca;

        // D. Atualizar registro da movimentação
        const { error: errMov } = await supabase
            .from('insertos_movimentacoes')
            .update({ quantidade: qtdNova, observacao: obs })
            .eq('id', id);

        if (errMov) throw errMov;

        // E. Atualizar saldo na tabela principal
        const { error: errIns } = await supabase
            .from('insertos')
            .update({ estoque_atual: novoSaldo })
            .eq('id', insertoId);

        if (errIns) throw errIns;

        alert("Alterações salvas com sucesso!");
        window.fecharModal();
        carregarRelatorio();

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Falha ao salvar: " + error.message);
    } finally {
        const btn = document.getElementById("btnSalvarEdit");
        if(btn) btn.disabled = false;
    }
}

// 3. CARREGAR DADOS NA TABELA
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

    if (error) return;

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
            </td>
        </tr>
    `).join('');
}

// 4. INICIALIZAÇÃO E VINCULAÇÃO DE EVENTOS
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;
    role = await obterRole();

    // Configuração de datas
    const hoje = new Date();
    document.getElementById("data_inicio").valueAsDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById("data_fim").valueAsDate = hoje;

    // VINCULAÇÃO FORÇADA DOS BOTÕES
    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = carregarRelatorio;

    const btnSalvar = document.getElementById("btnSalvarEdit");
    if (btnSalvar) btnSalvar.onclick = salvarAlteracoes;

    carregarRelatorio();
});
