import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Vinculação dos botões (IDs devem bater com o HTML)
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModalPagar;

    const btnTransferir = document.getElementById("btnTransferir");
    if (btnTransferir) btnTransferir.onclick = abrirModalTransferencia;

    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = carregarDados;

    carregarDados();
});

// --- FUNÇÃO PARA CARREGAR BANCOS NO SELECT (PRINT 2) ---
async function carregarSelectBancos(idSelect) {
    const { data: bancos, error } = await supabase.from("bancos").select("*").order("nome");
    const select = document.getElementById(idSelect);
    
    if (select && bancos) {
        select.innerHTML = '<option value="">Selecione...</option>' + 
            bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
    }
}

async function carregarDados() {
    // Atualiza os Cards de Saldo
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const container = document.getElementById("cardsBancos");
    if (container && bancos) {
        container.innerHTML = bancos.map(b => `
            <div class="card-banco-futuro">
                <small>${b.nome}</small>
                <div class="valor">${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
        `).join('');
    }

    // Carrega a Tabela
    const { data: contas } = await supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");
    const tbody = document.getElementById("listaPagar");
    if (tbody && contas) {
        tbody.innerHTML = contas.map(item => `
            <tr>
                <td>${item.descricao}</td>
                <td>${item.bancos?.nome || '--'}</td>
                <td style="color: #f87171;">-${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
                <td><span class="badge">${item.status}</span></td>
                <td><button onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn-acao">Pagar</button></td>
            </tr>
        `).join('');
    }
}

// --- NOVO LANÇAMENTO ---
async function abrirModalPagar() {
    await carregarSelectBancos("m_banco"); // Garante que os bancos apareçam no print 2
    document.getElementById("modalLancamento").style.display = "flex";
}

// --- TRANSFERÊNCIA ENTRE BANCOS (PRINT 1) ---
async function abrirModalTransferencia() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const menu = bancos.map((b, i) => `${i + 1}: ${b.nome} (Saldo: R$ ${b.saldo})`).join('\n');
    
    const deIdx = prompt("Selecione o número da CONTA DE ORIGEM:\n" + menu);
    const paraIdx = prompt("Selecione o número da CONTA DE DESTINO:\n" + menu);
    const valorRaw = prompt("Valor da Transferência (Use vírgula para centavos):");

    if (deIdx && paraIdx && valorRaw) {
        const bDe = bancos[parseInt(deIdx) - 1];
        const bPara = bancos[parseInt(paraIdx) - 1];
        const valor = parseFloat(valorRaw.replace(',', '.'));

        if (bDe.saldo < valor) return alert("Saldo insuficiente no " + bDe.nome);

        // Processa a transferência no banco de dados
        await supabase.from("bancos").update({ saldo: bDe.saldo - valor }).eq("id", bDe.id);
        await supabase.from("bancos").update({ saldo: bPara.saldo + valor }).eq("id", bPara.id);
        
        alert("Transferência realizada com sucesso!");
        carregarDados();
    }
}
