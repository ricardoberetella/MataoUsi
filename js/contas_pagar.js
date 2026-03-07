import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Vinculação segura dos botões para evitar o erro de 'null'
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModalPagar;

    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = carregarDados;

    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar) btnSalvar.onclick = salvarLancamento;

    carregarDados();
});

async function carregarDados() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const containerBancos = document.getElementById("cardsBancos");
    
    // Só tenta definir o HTML se o container existir
    if (containerBancos) {
        containerBancos.innerHTML = (bancos || []).map(b => `
            <div class="card-banco-futuro">
                <small>${b.nome}</small>
                <div>${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
        `).join('');
    }

    const tbody = document.getElementById("listaPagar");
    if (!tbody) return; // Evita erro se a tabela não estiver na tela

    const status = document.getElementById("filtroStatus")?.value || "Todos";
    const dataAte = document.getElementById("filtroDataAte")?.value;

    let query = supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");
    if (status !== "Todos") query = query.eq("status", status);
    if (dataAte) query = query.lte("vencimento", dataAte);

    const { data: contas } = await query;
    tbody.innerHTML = (contas || []).map(item => `
        <tr>
            <td>${item.descricao}</td>
            <td>${item.bancos?.nome || '--'}</td>
            <td>R$ ${item.valor}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td>${item.status}</td>
            <td><button onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')">Pagar</button></td>
        </tr>
    `).join('');
}

async function abrirModalPagar() {
    const { data: bancos } = await supabase.from("bancos").select("*").neq("nome", "APLICAÇÃO");
    const select = document.getElementById("m_banco");
    if (select) {
        select.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
    }
    document.getElementById("modalLancamento").style.display = "flex";
}

window.fecharModal = () => {
    document.getElementById("modalLancamento").style.display = "none";
};

window.validarMoeda = (input) => {
    input.value = input.value.replace(/[^0-9,]/g, '');
};

async function salvarLancamento() {
    const desc = document.getElementById("m_descricao").value;
    const valor = parseFloat(document.getElementById("m_valor").value.replace(',', '.'));
    const data = document.getElementById("m_data").value;
    const banco = document.getElementById("m_banco").value;

    if (!desc || isNaN(valor) || !data) return alert("Preencha tudo!");

    await supabase.from("contas_pagar").insert([{
        descricao: desc, valor, vencimento: data, banco_id: banco, status: "ABERTO"
    }]);

    fecharModal();
    carregarDados();
}
