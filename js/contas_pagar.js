import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    const hoje = new Date().toISOString().substring(0, 7);
    document.getElementById("filtroMes").value = hoje;
    
    carregarDados();
    document.getElementById("filtroMes").addEventListener("change", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", agendarConta);
});

async function carregarDados() {
    // 1. Buscar saldos de todos os bancos
    const { data: bancos } = await supabase.from("bancos").select("*");
    renderizarSaldos(bancos);

    // 2. Buscar contas com o nome do banco vinculado
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

function renderizarSaldos(bancos) {
    const container = document.getElementById("cardsBancos");
    container.innerHTML = bancos.map(b => `
        <div class="mini-card">
            <h3>${b.nome}</h3>
            <p class="valor-caixa">${b.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
    `).join('');
}

function renderizarTabela(contas) {
    const tbody = document.getElementById("listaPagar");
    tbody.innerHTML = contas.map(item => `
        <tr>
            <td>${item.descricao}</td>
            <td><strong style="color: #38bdf8">${item.bancos?.nome || 'Não definido'}</strong></td>
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

async function agendarConta() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    
    // Lista de bancos para o usuário escolher
    const listaBancos = bancos.map((b, i) => `${i + 1} - ${b.nome}`).join('\n');
    
    const desc = prompt("Descrição:");
    const valor = prompt("Valor:");
    const data = prompt("Vencimento (AAAA-MM-DD):");
    const bancoEscolha = prompt(`Escolha o banco pelo número:\n${listaBancos}`);
    
    const bancoSelecionado = bancos[parseInt(bancoEscolha) - 1];

    if (desc && valor && data && bancoSelecionado) {
        await supabase.from("contas_pagar").insert([{ 
            descricao: desc, 
            valor: parseFloat(valor), 
            vencimento: data, 
            banco_id: bancoSelecionado.id,
            status: "ABERTO" 
        }]);
        carregarDados();
    }
}

window.confirmarPagamento = async (id, valor, bancoId) => {
    if (!confirm("Confirmar pagamento usando o saldo deste banco?")) return;

    // 1. Atualiza status da conta
    await supabase.from("contas_pagar").update({ status: "PAGO" }).eq("id", id);

    // 2. Subtrai apenas do banco direcionado
    const { data: banco } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    const novoSaldo = banco.saldo - valor;
    await supabase.from("bancos").update({ saldo: novoSaldo }).eq("id", bancoId);

    carregarDados();
};
