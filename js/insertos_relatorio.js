import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// --- FUNÇÕES GLOBAIS ---
window.abrirEdicao = (id, insertoId, tipo, qtdAtual, obs) => {
    document.getElementById("edit_id").value = id;
    document.getElementById("edit_inserto_id").value = insertoId;
    document.getElementById("edit_tipo").value = tipo;
    document.getElementById("edit_qtd_antiga").value = qtdAtual;
    document.getElementById("edit_qtd").value = qtdAtual;
    document.getElementById("edit_obs").value = obs || "";
    document.getElementById("modalEditMov").style.display = "flex";
};

window.fecharModal = () => { document.getElementById("modalEditMov").style.display = "none"; };

// --- SALVAR ALTERAÇÃO (CORRIGIDO) ---
async function salvarAlteracoes() {
    const id = document.getElementById("edit_id").value;
    const insertoId = document.getElementById("edit_inserto_id").value;
    const tipo = document.getElementById("edit_tipo").value;
    const qtdAntiga = Number(document.getElementById("edit_qtd_antiga").value);
    const qtdNova = Number(document.getElementById("edit_qtd").value);
    const obs = document.getElementById("edit_obs").value;

    try {
        const diferenca = qtdNova - qtdAntiga;

        // 1. Buscar estoque usando o UUID correto (insertoId)
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('quantidade') // Verifique se no seu banco o nome é 'quantidade' ou 'estoque_atual'
            .eq('id', insertoId)
            .single();

        if (errFetch || !ins) throw new Error("Inserto não encontrado no estoque principal.");

        // 2. Calcular novo saldo
        let saldoAtual = Number(ins.quantidade);
        let novoSaldo = (tipo.toLowerCase() === 'entrada') 
            ? saldoAtual + diferenca 
            : saldoAtual - diferenca;

        // 3. Update na Movimentação
        const { error: errMov } = await supabase
            .from('insertos_movimentacoes')
            .update({ quantidade: qtdNova, observacao: obs })
            .eq('id', id);

        if (errMov) throw errMov;

        // 4. Update no Estoque Principal
        const { error: errIns } = await supabase
            .from('insertos')
            .update({ quantidade: novoSaldo })
            .eq('id', insertoId);

        if (errIns) throw errIns;

        alert("Atualizado com sucesso!");
        window.fecharModal();
        carregarRelatorio();
    } catch (error) {
        alert("Erro: " + error.message);
    }
}

// --- CARREGAR RELATÓRIO ---
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

    if (error) return;

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
            </td>
        </tr>
    `).join('');
}

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;
    role = await obterRole();

    document.getElementById("btnFiltrar").onclick = carregarRelatorio;
    document.getElementById("btnSalvarEdit").onclick = salvarAlteracoes;

    // Datas padrão
    const hoje = new Date();
    document.getElementById("data_inicio").valueAsDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById("data_fim").valueAsDate = hoje;
    
    carregarRelatorio();
});
