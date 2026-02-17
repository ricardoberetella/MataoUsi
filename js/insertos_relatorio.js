import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// --- 1. FUNÇÕES GLOBAIS PARA O HTML ---
window.abrirEdicao = (id, insertoId, tipo, qtdAtual, obs) => {
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

// --- 2. EXCLUIR COM REVERSÃO DE ESTOQUE ---
window.excluirMov = async (id, insertoId, tipo, quantidade) => {
    if (!confirm("Deseja excluir esta movimentação? O saldo do estoque será ajustado.")) return;

    try {
        // Buscar saldo atual usando a coluna correta 'quantidade'
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('quantidade')
            .eq('id', insertoId)
            .single();

        if (errFetch) throw errFetch;

        // Inverter a operação: se entrou, retira; se saiu, devolve
        let novoSaldo = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.quantidade) - Number(quantidade) 
            : Number(ins.quantidade) + Number(quantidade);

        // Deletar movimentação e atualizar estoque
        await supabase.from('insertos_movimentacoes').delete().eq('id', id);
        await supabase.from('insertos').update({ quantidade: novoSaldo }).eq('id', insertoId);

        alert("Movimentação removida e estoque atualizado!");
        carregarRelatorio();
    } catch (error) {
        alert("Erro ao excluir: " + error.message);
    }
};

// --- 3. SALVAR EDIÇÃO COM AJUSTE DE DIFERENÇA ---
async function processarEdicao() {
    const id = document.getElementById("edit_id").value;
    const insertoId = document.getElementById("edit_inserto_id").value;
    const tipo = document.getElementById("edit_tipo").value;
    const qtdAntiga = Number(document.getElementById("edit_qtd_antiga").value);
    const qtdNova = Number(document.getElementById("edit_qtd").value);
    const obs = document.getElementById("edit_obs").value;

    try {
        const diferenca = qtdNova - qtdAntiga;
        
        // Buscar saldo atual
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('quantidade')
            .eq('id', insertoId)
            .single();

        if (errFetch) throw errFetch;

        let novoSaldo = (tipo.toLowerCase() === 'entrada') 
            ? Number(ins.quantidade) + diferenca 
            : Number(ins.quantidade) - diferenca;

        // Atualizar ambos os registros
        const { error: errMov } = await supabase
            .from('insertos_movimentacoes')
            .update({ quantidade: qtdNova, observacao: obs })
            .eq('id', id);

        if (errMov) throw errMov;

        await supabase.from('insertos').update({ quantidade: novoSaldo }).eq('id', insertoId);

        alert("Alteração salva com sucesso!");
        window.fecharModal();
        carregarRelatorio();
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
}

// --- 4. CARREGAR TABELA ---
async function carregarRelatorio() {
    const dataInicio = document.getElementById("data_inicio").value;
    const dataFim = document.getElementById("data_fim").value;
    const tbody = document.getElementById("corpoRelatorio");

    const { data, error } = await supabase
        .from('insertos_movimentacoes')
        .select(`*, insertos(id, descricao)`)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

    if (error) return console.error(error);

    const isAdmin = (role === "admin");

    tbody.innerHTML = data.map(mov => `
        <tr>
            <td>${new Date(mov.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>${mov.insertos?.descricao || 'N/A'}</td>
            <td><span class="badge ${mov.tipo.toLowerCase() === 'entrada' ? 'badge-entrada' : 'badge-saida'}">${mov.tipo.toUpperCase()}</span></td>
            <td><b>${mov.quantidade}</b></td>
            <td>${mov.observacao || '-'}</td>
            <td style="display: ${isAdmin ? 'table-cell' : 'none'}">
                <button class="btn-mini btn-edit" onclick="window.abrirEdicao('${mov.id}', '${mov.inserto_id}', '${mov.tipo}', ${mov.quantidade}, '${mov.observacao || ''}')">Editar</button>
                <button class="btn-mini btn-del" onclick="window.excluirMov('${mov.id}', '${mov.inserto_id}', '${mov.tipo}', ${mov.quantidade})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

// --- 5. INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;
    role = await obterRole();

    // Datas padrão
    const hoje = new Date();
    document.getElementById("data_inicio").valueAsDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById("data_fim").valueAsDate = hoje;

    // Vincular botões
    document.getElementById("btnFiltrar").onclick = carregarRelatorio;
    document.getElementById("btnSalvarEdit").onclick = processarEdicao;

    carregarRelatorio();
});
