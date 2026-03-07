import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    carregarDados();

    document.getElementById("btnFiltrar").addEventListener("click", carregarDados);
    document.getElementById("btnNovoReceber").addEventListener("click", abrirModalReceber);
    document.getElementById("btnSalvarModal").addEventListener("click", salvarLancamentoReceber);
    document.getElementById("btnGerarPDF").addEventListener("click", gerarExtratoPDF);
});

async function carregarDados() {
    const status = document.getElementById("filtroStatus").value;
    const { data: contas } = await supabase.from("contas_receber").select(`*, bancos(nome)`).order("vencimento");
    
    const tbody = document.getElementById("listaReceber");
    tbody.innerHTML = (contas || []).map(item => `
        <tr>
            <td style="color: #22c55e; font-weight: bold;">${item.descricao}</td>
            <td>${item.bancos?.nome || '--'}</td>
            <td style="color: #22c55e;">+${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td><span class="badge-${item.status.toLowerCase()}">${item.status}</span></td>
            <td>
                ${item.status !== 'RECEBIDO' ? `<button onclick="receberConta('${item.id}', ${item.valor}, '${item.banco_id}')" class="btn-acao" style="background: #22c55e;">Receber</button>` : '✅'}
            </td>
        </tr>
    `).join('');
}

async function abrirModalReceber() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const selectBanco = document.getElementById("m_banco");
    selectBanco.innerHTML = bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
    document.getElementById("m_data").min = new Date().toISOString().split('T')[0];
    document.getElementById("modalLancamento").style.display = "flex";
}

async function salvarLancamentoReceber() {
    const desc = document.getElementById("m_descricao").value;
    const valorRaw = document.getElementById("m_valor").value;
    const data = document.getElementById("m_data").value;
    const bancoId = document.getElementById("m_banco").value;

    const valor = parseFloat(valorRaw.replace(',', '.'));
    await supabase.from("contas_receber").insert([{
        descricao: desc, valor: valor, vencimento: data, banco_id: bancoId, status: "ABERTO"
    }]);
    document.getElementById("modalLancamento").style.display = "none";
    carregarDados();
}

window.receberConta = async (id, valor, bancoId) => {
    if(!confirm("Confirmar recebimento?")) return;
    const { data: b } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    await supabase.from("contas_receber").update({ status: 'RECEBIDO' }).eq("id", id);
    await supabase.from("bancos").update({ saldo: b.saldo + valor }).eq("id", bancoId);
    carregarDados();
};

async function gerarExtratoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: movs } = await supabase.from("contas_receber").select(`*, bancos(nome)`).order("vencimento");
    doc.text("MATÃO USINAGEM - CONTAS A RECEBER", 14, 15);
    doc.autoTable({
        startY: 20,
        head: [['Data', 'Descrição', 'Banco', 'Valor']],
        body: movs.map(m => [new Date(m.vencimento).toLocaleDateString('pt-BR'), m.descricao, m.bancos?.nome, `R$ ${m.valor}`]),
    });
    doc.save("Receber_Matao.pdf");
}
