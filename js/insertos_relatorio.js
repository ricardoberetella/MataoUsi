import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    carregarHistorico();
});

async function carregarHistorico() {
    const tbody = document.getElementById("corpoRelatorio");
    if (!tbody) return;

    try {
        // Busca as movimentações ordenadas pela data mais recente
        const { data: movimentacoes, error: errMov } = await supabase
            .from('insertos_movimentacoes')
            .select(`
                id,
                tipo,
                quantidade,
                data,
                observacao,
                inserto_id,
                insertos ( descricao )
            `)
            .order('data', { ascending: false });

        if (errMov) throw errMov;

        if (!movimentacoes || movimentacoes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma movimentação encontrada.</td></tr>`;
            return;
        }

        tbody.innerHTML = movimentacoes.map(mov => {
            const dataFormatada = new Date(mov.data).toLocaleDateString('pt-BR');
            const classeTipo = mov.tipo === 'entrada' ? 'entrada' : 'saida';
            const sinal = mov.tipo === 'entrada' ? '+' : '-';
            const nomeInserto = mov.insertos ? mov.insertos.descricao : "Inserto Removido";

            return `
                <tr>
                    <td>${dataFormatada}</td>
                    <td><strong style="color: #38bdf8;">${nomeInserto}</strong></td>
                    <td class="${classeTipo}">${sinal} ${mov.quantidade}</td>
                    <td style="text-transform: capitalize;">${mov.tipo}</td>
                    <td style="color: #9ca3af; font-size: 0.9em;">${mov.observacao || '-'}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro ao carregar relatório:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Erro ao carregar dados: ${error.message}</td></tr>`;
    }
}
