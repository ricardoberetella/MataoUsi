import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// 1. TORNAR FUNÇÕES GLOBAIS (Para o onclick do HTML funcionar)
window.abrirEdicao = (id, insertoId, tipo, qtdAtual, obs) => {
    document.getElementById("edit_id").value = id;
    document.getElementById("edit_inserto_id").value = insertoId;
    document.getElementById("edit_tipo").value = tipo;
    document.getElementById("edit_qtd_antiga").value = qtdAtual;
    document.getElementById("edit_qtd").value = qtdAtual;
    document.getElementById("edit_obs").value = obs;
    document.getElementById("modalEditMov").style.display = "flex";
};

// 2. FUNÇÃO SALVAR (CORRIGIDA)
// Atribuímos diretamente ao onclick do botão de salvar no modal
const btnSalvar = document.getElementById("btnSalvarEdit");
if (btnSalvar) {
    btnSalvar.onclick = async () => {
        const id = document.getElementById("edit_id").value;
        const insertoId = document.getElementById("edit_inserto_id").value;
        const tipo = document.getElementById("edit_tipo").value;
        const qtdAntiga = Number(document.getElementById("edit_qtd_antiga").value);
        const qtdNova = Number(document.getElementById("edit_qtd").value);
        const obs = document.getElementById("edit_obs").value;

        if (!id || isNaN(qtdNova)) {
            alert("Dados inválidos para salvar.");
            return;
        }

        try {
            // A. Calcular a diferença para ajustar o estoque principal
            const diferenca = qtdNova - qtdAntiga;

            // B. Buscar o estoque atual do inserto
            const { data: ins, error: errFetch } = await supabase
                .from('insertos')
                .select('estoque_atual')
                .eq('id', insertoId)
                .single();

            if (errFetch) throw new Error("Erro ao buscar estoque: " + errFetch.message);

            // C. Lógica de ajuste de saldo
            let novoSaldoPrincipal = (tipo.toLowerCase() === 'entrada') 
                ? Number(ins.estoque_atual) + diferenca 
                : Number(ins.estoque_atual) - diferenca;

            // D. Atualizar a movimentação
            const { error: errUpdateMov } = await supabase
                .from('insertos_movimentacoes')
                .update({ 
                    quantidade: qtdNova, 
                    observacao: obs 
                })
                .eq('id', id);

            if (errUpdateMov) throw errUpdateMov;

            // E. Atualizar o estoque na tabela de insertos
            const { error: errUpdateIns } = await supabase
                .from('insertos')
                .update({ estoque_atual: novoSaldoPrincipal })
                .eq('id', insertoId);

            if (errUpdateIns) throw errUpdateIns;

            // Sucesso
            alert("Alterações salvas com sucesso!");
            document.getElementById("modalEditMov").style.display = "none";
            carregarRelatorio();

        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Falha ao salvar: " + error.message);
        }
    };
}

// 3. CARREGAR RELATÓRIO
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
        console.error(error);
        return;
    }

    const isAdmin = (role === "admin");

    tbody.innerHTML = data.map(mov => {
        const insertoNome = mov.insertos?.descricao || "N/A";
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

// 4. INICIALIZAÇÃO
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
