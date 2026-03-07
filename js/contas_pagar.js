import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verifica se o usuário está logado antes de carregar a página
    await verificarLogin();
    
    // 2. Vincula os eventos aos botões apenas se eles existirem no HTML
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModalPagar;

    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = carregarDados;

    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar) btnSalvar.onclick = salvarLancamento;

    // 3. Define a data mínima no calendário (Hoje)
    const campoData = document.getElementById("m_data");
    if (campoData) {
        campoData.min = new Date().toISOString().split('T')[0];
    }

    // 4. Carrega os dados iniciais da tabela e dos cards
    carregarDados();
});

async function carregarDados() {
    // Carrega saldos dos bancos para os cards
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const containerBancos = document.getElementById("cardsBancos");
    
    if (containerBancos && bancos) {
        containerBancos.innerHTML = bancos.map(b => `
            <div class="card-banco-futuro" style="border: 1px solid ${b.nome === 'APLICAÇÃO' ? '#a855f7' : '#38bdf8'}; padding: 15px; border-radius: 10px; background: rgba(30, 41, 59, 0.5); flex: 1; text-align: center;">
                <small class="label-futuro">${b.nome}</small>
                <div style="font-size: 1.2rem; font-weight: bold; color: white;">
                    ${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>
        `).join('');
    }

    // Filtros de busca
    const status = document.getElementById("filtroStatus")?.value || "Todos";
    const dataAte = document.getElementById("filtroDataAte")?.value;

    let query = supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento", { ascending: true });
    
    if (status !== "Todos") query = query.eq("status", status);
    if (dataAte) query = query.lte("vencimento", dataAte);

    const { data: contas, error } = await query;
    const tbody = document.getElementById("listaPagar");

    if (tbody && contas) {
        tbody.innerHTML = contas.map(item => `
            <tr style="border-bottom: 1px solid rgba(56, 189, 248, 0.1);">
                <td style="padding: 12px; color: #f87171;">${item.descricao}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td style="font-weight: bold;">${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
                <td><span class="badge-${item.status.toLowerCase()}" style="padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; border: 1px solid;">${item.status}</span></td>
                <td>
                    ${item.status !== 'PAGO' ? `
                        <button onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn-acao" style="background: #ef4444; font-size: 11px;">Pagar</button>
                    ` : '✅'}
                </td>
            </tr>
        `).join('');
    }
}

async function abrirModalPagar() {
    // Busca bancos disponíveis para o select, excluindo APLICAÇÃO para pagamentos
    const { data: bancos } = await supabase.from("bancos").select("*").neq("nome", "APLICAÇÃO").order("nome");
    const select = document.getElementById("m_banco");
    
    if (select && bancos) {
        select.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
    }
    
    document.getElementById("modalLancamento").style.display = "flex";
}

async function salvarLancamento() {
    const desc = document.getElementById("m_descricao").value;
    const valorInput = document.getElementById("m_valor").value;
    const data = document.getElementById("m_data").value;
    const bancoId = document.getElementById("m_banco").value;

    if (!desc || !valorInput || !data) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    const valor = parseFloat(valorInput.replace(',', '.'));
    
    const { error } = await supabase.from("contas_pagar").insert([{
        descricao: desc,
        valor: valor,
        vencimento: data,
        banco_id: bancoId,
        status: "ABERTO"
    }]);

    if (!error) {
        document.getElementById("modalLancamento").style.display = "none";
        // Limpa os campos após salvar
        document.getElementById("m_descricao").value = "";
        document.getElementById("m_valor").value = "";
        carregarDados();
    } else {
        alert("Erro ao salvar: " + error.message);
    }
}

// Torna a função global para o botão 'Pagar' da tabela funcionar
window.baixarConta = async (id, valor, bancoId) => {
    if(!confirm("Deseja confirmar o pagamento desta conta?")) return;
    
    // Busca saldo atual do banco selecionado
    const { data: banco } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    
    if (banco) {
        // Atualiza o status da conta e subtrai do saldo do banco
        await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
        await supabase.from("bancos").update({ saldo: banco.saldo - valor }).eq("id", bancoId);
        carregarDados();
    }
};
