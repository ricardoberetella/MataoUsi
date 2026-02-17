import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", carregarRelatorio);

async function carregarRelatorio() {
    const tbody = document.getElementById("corpoRelatorio");
    try {
        const { data, error } = await supabase
            .from('insertos_movimentacoes')
            .select('*, insertos(descricao)')
            .order('data', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = data.map(mov => `
            <tr>
                <td>${new Date(mov.data).toLocaleDateString('pt-BR')}</td>
                <td style="color: #38bdf8; font-weight: bold;">${mov.insertos?.descricao || 'N/A'}</td>
                <td style="text-transform: capitalize; color: ${mov.tipo === 'entrada' ? '#10b981' : '#f59e0b'}">
                    ${mov.tipo}
                </td>
                <td style="font-weight: bold;">${mov.tipo === 'entrada' ? '+' : '-'}${mov.quantidade}</td>
                <td style="color: #9ca3af;">${mov.observacao || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Erro ao carregar relatório:", error.message);
    }
}
