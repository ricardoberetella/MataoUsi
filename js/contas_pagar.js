import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    const hoje = new Date().toISOString().substring(0, 7);
    document.getElementById("filtroMes").value = hoje;
    
    carregarDados();
    document.getElementById("filtroMes").addEventListener("change", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", agendarConta);
    document.getElementById("btnReceitaManual").addEventListener("click", receberManual);
    document.getElementById("btnTransferir").addEventListener("click", transferirEntreBancos);
});

async function carregarDados() {
    const { data: bancos } = await supabase.from("bancos").select("*").order('nome');
    renderizarSaldos(bancos);

    const mes = document.getElementById("filtroMes").value;
    const [ano, mesNum] = mes.split("-");
    const ultimoDia = new Date(ano, mesNum, 0).getDate();

    const { data: contas } = await supabase
        .from("contas_pagar")
        .select(`*, bancos(nome)`)
        .gte("vencimento", `${mes}-01`)
        .lte("vencimento", `${mes}-${ultimoDia}`)
        .order("vencimento", { ascending: true });

    renderizarTabela(contas);
}

// --- FUNÇÃO: RECEBIMENTO MANUAL ---
async function receberManual() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const desc = prompt("Origem do Recebimento (Ex: Venda Direta):");
    const valor = parseFloat(prompt("Valor Recebido:"));
    const bancoEscolha = prompt("Bancos:\n" + bancos.map((b,i) => `${i+1} - ${b.nome}`).join('\n'));
    
    const bancoIdx = parseInt(bancoEscolha) - 1;
    if (desc && valor > 0 && bancos[bancoIdx]) {
        const banco = bancos[bancoIdx];
        
        // 1. Registra a entrada
        await supabase.from("contas_receber_manual").insert([{
            descricao: desc, valor, banco_id: banco.id
        }]);

        // 2. Soma ao saldo do banco
        const novoSaldo = banco.saldo + valor;
        await supabase.from("bancos").update({ saldo: novoSaldo }).eq("id", banco.id);
        
        alert("Recebimento registrado com sucesso!");
        carregarDados();
    }
}

// --- FUNÇÃO: TRANSFERÊNCIA ---
async function transferirEntreBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const menu = bancos.map((b,i) => `${i+1} - ${b.nome} (Saldo: ${b.saldo})`).join('\n');
    
    const de = parseInt(prompt("SAIR DE (Número):\n" + menu)) - 1;
    const para = parseInt(prompt("PARA (Número):\n" + menu)) - 1;
    const valor = parseFloat(prompt("Valor da Transferência:"));

    if (bancos[de] && bancos[para] && valor > 0 && bancos[de].saldo >= valor) {
        // Tira de um
        await supabase.from("bancos").update({ saldo: bancos[de].saldo - valor }).eq("id", bancos[de].id);
        // Coloca no outro
        await supabase.from("bancos").update({ saldo: bancos[para].saldo + valor }).eq("id", bancos[para].id);
        
        alert("Transferência concluída!");
        carregarDados();
    } else {
        alert("Erro: Verifique saldos ou bancos selecionados.");
    }
}

// --- FUNÇÕES DE APOIO (SALDOS E TABELA) ---
function renderizarSaldos(bancos) {
    const container = document.getElementById("cardsBancos");
    container.innerHTML = bancos.map(b => `
        <div class="mini-card">
            <small style="color: #94a3b8">Saldo em Conta</small>
            <h3 style="margin: 5px 0">${b.nome}</h3>
            <p class="valor-caixa">${b.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
    `).join('');
}

function renderizarTabela(contas) {
    const tbody = document.getElementById("listaPagar");
    tbody.innerHTML = contas.map(item => `
        <tr>
            <td>${item.descricao}</td>
            <td><span style="color: #38bdf8">${item.bancos?.nome || '--'}</span></td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td>${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td><span class="${item.status === 'PAGO' ? 'badge-pago' : 'badge-aberto'}">${item.status}</span></td>
            <td>
                ${item.status === 'ABERTO' ? 
                `<button class="btn-pagar" onclick="confirmarPagamento('${item.id}', ${item.valor}, '${item.banco_id}')">Quitar</button>` 
                : '✅'}
            </td>
        </tr>
    `).join('');
}

// (Manter as funções agendarConta e confirmarPagamento da resposta anterior)
