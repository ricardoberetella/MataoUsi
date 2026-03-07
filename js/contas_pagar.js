import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Define mês atual como padrão
    const hoje = new Date().toISOString().substring(0, 7);
    document.getElementById("filtroMes").value = hoje;

    carregarDados();

    // Eventos
    document.getElementById("filtroStatus").addEventListener("change", carregarDados);
    document.getElementById("filtroMes").addEventListener("change", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", agendarSaida);
    document.getElementById("btnReceitaManual").addEventListener("click", receberManual);
    document.getElementById("btnTransferir").addEventListener("click", transferirBancos);
});

async function carregarDados() {
    // 1. Carregar Bancos
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const containerBancos = document.getElementById("cardsBancos");
    containerBancos.innerHTML = bancos.map(b => `
        <div class="card-banco">
            <small style="color: #94a3b8">${b.nome}</small>
            <div class="saldo-valor">${b.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
    `).join('');

    // 2. Carregar Contas a Pagar
    const status = document.getElementById("filtroStatus").value;
    const mes = document.getElementById("filtroMes").value;
    
    let query = supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");

    if (status) query = query.eq("status", status);
    if (mes) {
        const [ano, m] = mes.split("-");
        const ultimoDia = new Date(ano, m, 0).getDate();
        query = query.gte("vencimento", `${mes}-01`).lte("vencimento", `${mes}-${ultimoDia}`);
    }

    const { data: contas } = await query;
    const tbody = document.getElementById("listaPagar");
    tbody.innerHTML = contas.map(item => `
        <tr>
            <td>${item.descricao}</td>
            <td style="color: #38bdf8">${item.bancos?.nome || 'Geral'}</td>
            <td style="font-weight: bold; color: #f87171">-${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td><span class="${item.status === 'PAGO' ? 'badge-pago' : 'badge-aberto'}">${item.status}</span></td>
            <td>
                ${item.status === 'ABERTO' ? `<button class="btn-primario" style="padding: 5px 10px; background: #ef4444;" onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')">Pagar</button>` : '✅'}
            </td>
        </tr>
    `).join('');
}

// Funções Globais de Movimentação
window.baixarConta = async (id, valor, bancoId) => {
    if(!confirm("Confirmar pagamento e saída do banco?")) return;
    
    // Baixa na conta
    await supabase.from("contas_pagar").update({ status: "PAGO" }).eq("id", id);
    
    // Subtrai do banco
    const { data: b } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    await supabase.from("bancos").update({ saldo: b.saldo - valor }).eq("id", bancoId);
    
    carregarDados();
};

async function agendarSaida() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const desc = prompt("Descrição da despesa:");
    const valor = prompt("Valor:");
    const data = prompt("Vencimento (AAAA-MM-DD):");
    const bSel = prompt("Escolha o Banco:\n" + bancos.map((b,i) => `${i+1}: ${b.nome}`).join('\n'));
    
    if(desc && valor && data && bancos[bSel-1]) {
        await supabase.from("contas_pagar").insert([{
            descricao: desc, valor: parseFloat(valor), vencimento: data, banco_id: bancos[bSel-1].id, status: 'ABERTO'
        }]);
        carregarDados();
    }
}

async function receberManual() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const desc = prompt("Origem do Recebimento:");
    const valor = parseFloat(prompt("Valor:"));
    const bSel = prompt("Entrar em qual Banco?\n" + bancos.map((b,i) => `${i+1}: ${b.nome}`).join('\n'));

    if(desc && valor && bancos[bSel-1]) {
        const banco = bancos[bSel-1];
        await supabase.from("bancos").update({ saldo: banco.saldo + valor }).eq("id", banco.id);
        await supabase.from("contas_receber_manual").insert([{ descricao: desc, valor, banco_id: banco.id }]);
        carregarDados();
    }
}

async function transferirBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const menu = bancos.map((b,i) => `${i+1}: ${b.nome} (${b.saldo})`).join('\n');
    const de = prompt("Sair de:\n" + menu);
    const para = prompt("Entrar em:\n" + menu);
    const valor = parseFloat(prompt("Valor da transferência:"));

    if(bancos[de-1] && bancos[para-1] && valor > 0) {
        await supabase.from("bancos").update({ saldo: bancos[de-1].saldo - valor }).eq("id", bancos[de-1].id);
        await supabase.from("bancos").update({ saldo: bancos[para-1].saldo + valor }).eq("id", bancos[para-1].id);
        carregarDados();
    }
}
