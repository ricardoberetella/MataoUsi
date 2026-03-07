import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Vinculação segura para evitar erros de 'null' no console
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModalPagar;

    const btnTransferir = document.getElementById("btnTransferir");
    if (btnTransferir) btnTransferir.onclick = realizarTransferencia;

    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = carregarDados;

    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar) btnSalvar.onclick = salvarLancamento;

    carregarDados();
});

// Busca bancos no Supabase e preenche o select
async function carregarSelectBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const select = document.getElementById("m_banco");
    if (select && bancos) {
        select.innerHTML = '<option value="">Selecione o Banco...</option>' + 
            bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
    }
}

async function abrirModalPagar() {
    await carregarSelectBancos(); // Correção: Carrega os bancos antes de mostrar o modal
    document.getElementById("modalLancamento").style.display = "flex";
}

async function carregarDados() {
    // 1. Atualiza Cards de Saldo
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const container = document.getElementById("cardsBancos");
    if (container && bancos) {
        container.innerHTML = bancos.map(b => `
            <div style="background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; flex: 1;">
                <div class="label-futuro" style="font-size: 0.6rem;">${b.nome}</div>
                <div style="color: white; font-weight: bold; font-size: 1.1rem; margin-top: 5px;">
                    ${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>
        `).join('');
    }

    // 2. Carrega Tabela de Contas
    const filtroData = document.getElementById("filtroDataAte")?.value;
    let query = supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento", { ascending: true });
    
    if (filtroData) query = query.lte("vencimento", filtroData);

    const { data: contas } = await query;
    const tbody = document.getElementById("listaPagar");
    if (tbody && contas) {
        tbody.innerHTML = contas.map(item => `
            <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 12px; color: #f87171;">${item.descricao}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td style="font-weight: bold;">R$ ${item.valor}</td>
                <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
                <td><span style="color: ${item.status === 'PAGO' ? '#10b981' : '#facc15'}">${item.status}</span></td>
                <td>
                    ${item.status !== 'PAGO' ? `<button onclick="window.baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn-acao" style="font-size: 10px; padding: 5px 10px;">Baixar</button>` : '✅'}
                </td>
            </tr>
        `).join('');
    }
}

async function realizarTransferencia() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const lista = bancos.map((b, i) => `${i + 1} - ${b.nome} (Saldo: R$ ${b.saldo})`).join('\n');
    
    const de = prompt("Origem (Digite o número):\n" + lista);
    const para = prompt("Destino (Digite o número):\n" + lista);
    const valorRaw = prompt("Valor (Ex: 500,00):");

    if (de && para && valorRaw) {
        const bOrigem = bancos[parseInt(de) - 1];
        const bDestino = bancos[parseInt(para) - 1];
        const valor = parseFloat(valorRaw.replace(',', '.'));

        if (bOrigem.saldo >= valor) {
            await supabase.from("bancos").update({ saldo: bOrigem.saldo - valor }).eq("id", bOrigem.id);
            await supabase.from("bancos").update({ saldo: bDestino.saldo + valor }).eq("id", bDestino.id);
            alert("Transferência OK!");
            carregarDados();
        } else { alert("Saldo insuficiente!"); }
    }
}

async function salvarLancamento() {
    const desc = document.getElementById("m_descricao").value;
    const valor = parseFloat(document.getElementById("m_valor").value.replace(',', '.'));
    const data = document.getElementById("m_data").value;
    const banco = document.getElementById("m_banco").value;

    if (!desc || isNaN(valor) || !data || !banco) return alert("Preencha todos os campos!");

    await supabase.from("contas_pagar").insert([{ descricao: desc, valor, vencimento: data, banco_id: banco, status: "ABERTO" }]);
    document.getElementById("modalLancamento").style.display = "none";
    carregarDados();
}

window.baixarConta = async (id, valor, bancoId) => {
    const { data: banco } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    if (banco) {
        await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
        await supabase.from("bancos").update({ saldo: banco.saldo - valor }).eq("id", bancoId);
        carregarDados();
    }
};
