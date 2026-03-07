import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Definir o mês atual como padrão no filtro
    const hoje = new Date();
    const mesAtual = hoje.toISOString().substring(0, 7); // Formato YYYY-MM
    document.getElementById("filtroMes").value = mesAtual;

    carregarDados();

    document.getElementById("filtroMes").addEventListener("change", carregarDados);
    document.getElementById("filtroStatus").addEventListener("change", carregarDados);
    
    document.getElementById("btnNovoPagar").addEventListener("click", cadastrarConta);
});

async function carregarDados() {
    const mesSelecionado = document.getElementById("filtroMes").value; // Ex: "2024-05"
    const statusFiltro = document.getElementById("filtroStatus").value;

    // 1. Buscar Saldo do Caixa (Suposta tabela 'configuracoes' ou 'caixa')
    const { data: caixa } = await supabase.from("caixa").select("saldo").single();
    if (caixa) {
        document.getElementById("caixaAtual").innerText = caixa.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // 2. Buscar Contas a Pagar com filtro de data
    let query = supabase.from("contas_pagar").select("*").order("vencimento", { ascending: true });

    if (mesSelecionado) {
        const [ano, mes] = mesSelecionado.split("-");
        const ultimoDia = new Date(ano, mes, 0).getDate();
        query = query.gte("vencimento", `${mesSelecionado}-01`).lte("vencimento", `${mesSelecionado}-${ultimoDia}`);
    }

    if (statusFiltro) {
        query = query.eq("status", statusFiltro);
    }

    const { data, error } = await query;
    if (error) return;

    renderizarTabela(data);
}

function renderizarTabela(contas) {
    const tbody = document.getElementById("listaPagar");
    tbody.innerHTML = "";
    let totalMes = 0;

    contas.forEach(item => {
        const valor = parseFloat(item.valor);
        if (item.status === "ABERTO") totalMes += valor;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.descricao}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td>${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td><span class="${item.status === 'PAGO' ? 'badge-pago' : 'badge-aberto'}">${item.status}</span></td>
            <td>
                ${item.status === 'ABERTO' ? `<button class="btn-pagar" onclick="quitarConta('${item.id}', ${valor})">Pagar</button>` : '✅'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("totalMes").innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para dar baixa e subtrair do caixa automaticamente
window.quitarConta = async (id, valor) => {
    if (!confirm("Confirmar pagamento desta conta?")) return;

    // 1. Marcar como pago
    await supabase.from("contas_pagar").update({ status: "PAGO" }).eq("id", id);

    // 2. Subtrair do caixa (Lógica simples de atualização)
    const { data: caixa } = await supabase.from("caixa").select("saldo").single();
    const novoSaldo = caixa.saldo - valor;
    await supabase.from("caixa").update({ saldo: novoSaldo }).eq("id", caixa.id);

    carregarDados();
};

async function cadastrarConta() {
    const desc = prompt("Descrição:");
    const valor = prompt("Valor (Ex: 100.00):");
    const data = prompt("Vencimento (AAAA-MM-DD):");
    
    if (desc && valor && data) {
        await supabase.from("contas_pagar").insert([{ 
            descricao: desc, 
            valor: parseFloat(valor), 
            vencimento: data, 
            status: "ABERTO" 
        }]);
        carregarDados();
    }
}
