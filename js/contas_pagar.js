import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    carregarDados();

    document.getElementById("btnFiltrar").addEventListener("click", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", agendarSaida);
    document.getElementById("btnTransferir").addEventListener("click", transferirBancos);
    document.getElementById("btnGerarPDF").addEventListener("click", gerarExtratoPDF);
});

async function carregarDados() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const containerBancos = document.getElementById("cardsBancos");
    containerBancos.innerHTML = bancos.map(b => `
        <div class="card-banco">
            <small style="color: #94a3b8; font-weight: bold;">${b.nome}</small>
            <div class="saldo-valor">${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
    `).join('');

    const status = document.getElementById("filtroStatus").value;
    const dataAte = document.getElementById("filtroDataAte").value;
    
    let query = supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento", { ascending: true });
    if (status) query = query.eq("status", status);
    if (dataAte) query = query.lte("vencimento", dataAte);

    const { data: contas } = await query;
    const tbody = document.getElementById("listaPagar");
    tbody.innerHTML = contas.map(item => `
        <tr>
            <td style="color: #f87171; font-weight: bold;">${item.descricao}</td>
            <td style="color: #38bdf8; font-weight: bold;">${item.bancos?.nome || '--'}</td>
            <td style="color: #f87171; font-weight: bold;">-${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td><span class="${item.status === 'PAGO' ? 'badge-pago' : 'badge-aberto'}">${item.status}</span></td>
            <td>
                ${item.status !== 'PAGO' ? `<button class="btn-acao" style="background: #ef4444; padding: 5px 12px; font-size: 11px;" onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')">Pagar</button>` : '✅'}
            </td>
        </tr>
    `).join('');
}

window.baixarConta = async (id, valor, bancoId) => {
    if(!bancoId) return alert("Vincule um banco a esta conta antes de pagar!");
    if(!confirm("Confirmar baixa bancária?")) return;

    const { data: banco } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
    await supabase.from("bancos").update({ saldo: banco.saldo - valor }).eq("id", bancoId);
    
    carregarDados();
};

async function agendarSaida() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const desc = prompt("NF / Origem:");
    const valor = prompt("Valor:");
    const data = prompt("Vencimento (AAAA-MM-DD):");
    const bSel = prompt("Banco Destino:\n1: SICOOB\n2: CAIXA FEDERAL");

    if(desc && valor && data && bancos[bSel-1]) {
        await supabase.from("contas_pagar").insert([{
            descricao: desc, valor: parseFloat(valor), vencimento: data, banco_id: bancos[bSel-1].id, status: 'ABERTO'
        }]);
        carregarDados();
    }
}

async function transferirBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const de = prompt("Sair de:\n1: " + bancos[0].nome + "\n2: " + bancos[1].nome);
    const para = (de == "1") ? "2" : "1";
    const valor = parseFloat(prompt("Valor da Transferência:"));

    if(bancos[de-1] && valor > 0 && bancos[de-1].saldo >= valor) {
        await supabase.from("bancos").update({ saldo: bancos[de-1].saldo - valor }).eq("id", bancos[de-1].id);
        await supabase.from("bancos").update({ saldo: bancos[para-1].saldo + valor }).eq("id", bancos[para-1].id);
        carregarDados();
    }
}

async function gerarExtratoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const { data: movs } = await supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");

    doc.setFontSize(14);
    doc.text("EXTRATO DE MOVIMENTAÇÃO - MATÃO USINAGEM", 14, 15);
    
    let y = 25;
    bancos.forEach(banco => {
        doc.setFontSize(11);
        doc.setTextColor(56, 189, 248);
        doc.text(`BANCO: ${banco.nome} | SALDO: R$ ${parseFloat(banco.saldo).toFixed(2)}`, 14, y);
        
        const rows = movs.filter(m => m.banco_id === banco.id).map(m => [
            new Date(m.vencimento).toLocaleDateString('pt-BR'),
            m.descricao,
            `-R$ ${parseFloat(m.valor).toFixed(2)}`,
            m.status
        ]);

        doc.autoTable({
            startY: y + 5,
            head: [['Data', 'Descrição', 'Valor Saída', 'Status']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });
        y = doc.lastAutoTable.finalY + 12;
    });

    doc.save("Extrato_Bancario_Matao.pdf");
}
