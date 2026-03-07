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
    // 1. Atualizar Cards de Bancos no Topo
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const containerBancos = document.getElementById("cardsBancos");
    containerBancos.innerHTML = bancos.map(b => `
        <div class="card-banco">
            <small style="color: #94a3b8; font-weight: 600; text-transform: uppercase;">${b.nome}</small>
            <div class="saldo-valor">${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
    `).join('');

    // 2. Filtrar Lançamentos
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
            <td style="color: #38bdf8">${item.bancos?.nome || 'Pendente'}</td>
            <td style="color: #f87171; font-weight: bold;">-${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td><span class="${item.status === 'PAGO' ? 'badge-pago' : 'badge-aberto'}">${item.status}</span></td>
            <td>
                ${item.status !== 'PAGO' ? `
                    <button class="btn-acao" style="background: #ef4444; padding: 5px 12px; font-size: 12px;" 
                    onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')">Pagar</button>
                ` : '✅'}
            </td>
        </tr>
    `).join('');
}

window.baixarConta = async (id, valor, bancoId) => {
    if(!bancoId) return alert("Esta conta não tem um banco destino definido!");
    if(!confirm("Deseja confirmar o pagamento? O valor será subtraído do saldo do banco.")) return;

    // Baixa na conta e subtração no saldo do banco
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
    const bSel = prompt("Bancos:\n" + bancos.map((b,i) => `${i+1}: ${b.nome}`).join('\n'));

    if(desc && valor && data && bancos[bSel-1]) {
        await supabase.from("contas_pagar").insert([{
            descricao: desc, valor: parseFloat(valor), vencimento: data, banco_id: bancos[bSel-1].id, status: 'ABERTO'
        }]);
        carregarDados();
    }
}

async function transferirBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const menu = bancos.map((b,i) => `${i+1}: ${b.nome} (${b.saldo})`).join('\n');
    const de = prompt("Sair de:\n" + menu);
    const para = prompt("Entrar em:\n" + menu);
    const valor = parseFloat(prompt("Valor:"));

    if(bancos[de-1] && bancos[para-1] && valor > 0) {
        await supabase.from("bancos").update({ saldo: bancos[de-1].saldo - valor }).eq("id", bancos[de-1].id);
        await supabase.from("bancos").update({ saldo: bancos[para-1].saldo + valor }).eq("id", bancos[para-1].id);
        carregarDados();
    }
}

async function gerarExtratoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: bancos } = await supabase.from("bancos").select("*");
    const { data: movs } = await supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");

    doc.setFontSize(16);
    doc.text("MATÃO USINAGEM - EXTRATO BANCÁRIO", 14, 15);
    
    let y = 25;
    bancos.forEach(banco => {
        doc.setFontSize(12);
        doc.setTextColor(56, 189, 248);
        doc.text(`BANCO: ${banco.nome} | SALDO ATUAL: R$ ${parseFloat(banco.saldo).toFixed(2)}`, 14, y);
        
        const rows = movs.filter(m => m.banco_id === banco.id).map(m => [
            new Date(m.vencimento).toLocaleDateString('pt-BR'),
            m.descricao,
            `R$ ${parseFloat(m.valor).toFixed(2)}`,
            m.status
        ]);

        doc.autoTable({
            startY: y + 5,
            head: [['Data', 'Descrição', 'Valor', 'Status']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });
        y = doc.lastAutoTable.finalY + 15;
    });

    doc.save("Extrato_Matao_Usinagem.pdf");
}
