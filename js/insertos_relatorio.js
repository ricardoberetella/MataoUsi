import { supabase } from "./auth.js";

async function carregarRelatorio() {
    const dataInicio = document.getElementById("data_inicio").value;
    const dataFim = document.getElementById("data_fim").value;

    if (!dataInicio || !dataFim) {
        alert("Por favor, selecione o período inicial e final.");
        return;
    }

    const tbody = document.getElementById("corpoRelatorio");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Buscando dados...</td></tr>`;

    // Busca movimentações com os dados do inserto relacionado (join)
    const { data, error } = await supabase
        .from('insertos_movimentacoes')
        .select(`
            *,
            insertos ( descricao )
        `)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar relatório.</td></tr>`;
        return;
    }

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma movimentação encontrada neste período.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(mov => `
        <tr>
            <td>${new Date(mov.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>${mov.insertos?.descricao || 'N/A'}</td>
            <td>
                <span class="badge ${mov.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'}">
                    ${mov.tipo.toUpperCase()}
                </span>
            </td>
            <td><b>${mov.quantidade}</b></td>
            <td style="color: #94a3b8;">${mov.observacao || '-'}</td>
        </tr>
    `).join('');
}

document.addEventListener("DOMContentLoaded", () => {
    // Definir datas padrão (mês atual)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    document.getElementById("data_inicio").valueAsDate = primeiroDia;
    document.getElementById("data_fim").valueAsDate = hoje;

    document.getElementById("btnFiltrar").onclick = carregarRelatorio;
    
    carregarRelatorio();
});
