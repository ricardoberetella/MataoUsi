import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    carregarContas();

    document.getElementById("btnNovoPagar").addEventListener("click", novoLancamento);
    document.getElementById("filtroStatus").addEventListener("change", carregarContas);
});

async function carregarContas() {
    const status = document.getElementById("filtroStatus").value;
    const tbody = document.getElementById("listaPagar");
    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

    let query = supabase.from("contas_pagar").select("*").order("vencimento", { ascending: true });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return console.error(error);

    tbody.innerHTML = "";
    let somaAberto = 0;

    data.forEach(item => {
        if (item.status === "ABERTO") somaAberto += parseFloat(item.valor);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.descricao}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td>R$ ${parseFloat(item.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td><span class="${item.status === 'PAGO' ? 'badge-pago' : 'badge-aberto'}">${item.status}</span></td>
            <td>
                ${item.status === 'ABERTO' ? `<button class="btn-pagar" onclick="darBaixa('${item.id}')">Pagar</button>` : '-'}
                <button style="background:none; border:none; cursor:pointer; margin-left:10px;" onclick="excluir('${item.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("totalPagar").innerText = `R$ ${somaAberto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

async function novoLancamento() {
    const desc = prompt("Descrição da despesa:");
    const valor = prompt("Valor (ex: 150.00):");
    const venc = prompt("Vencimento (AAAA-MM-DD):");

    if (desc && valor && venc) {
        const { error } = await supabase.from("contas_pagar").insert([{ 
            descricao: desc, 
            valor: parseFloat(valor), 
            vencimento: venc, 
            status: 'ABERTO' 
        }]);
        if (error) alert("Erro ao salvar");
        else carregarContas();
    }
}

window.darBaixa = async (id) => {
    await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
    carregarContas();
};

window.excluir = async (id) => {
    if(confirm("Deseja excluir este registro?")) {
        await supabase.from("contas_pagar").delete().eq("id", id);
        carregarContas();
    }
};
