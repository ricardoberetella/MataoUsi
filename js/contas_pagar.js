import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Define a data atual no filtro de vencimento
    const dataHoje = new Date().toISOString().split('T')[0];
    const filtroData = document.getElementById("filtroDataAte");
    if(filtroData) filtroData.value = dataHoje;

    carregarDados();

    // Eventos dos botões baseados no seu layout
    document.getElementById("btnFiltrar").addEventListener("click", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", agendarSaida);
    document.getElementById("btnTransferir").addEventListener("click", transferirEntreBancos);
    document.getElementById("btnGerarPDF").addEventListener("click", gerarExtratoPDF);
});

async function carregarDados() {
    // Busca os saldos reais para os cards futuristas
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const containerBancos = document.getElementById("cardsBancos");
    
    if (containerBancos) {
        containerBancos.innerHTML = bancos.map(b => `
            <div class="card-banco-futuro" style="border: 1px solid ${b.nome === 'APLICAÇÃO' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.3)'}">
                <small class="label-futuro">${b.nome}</small>
                <div class="valor-principal" style="color: ${b.nome === 'APLICAÇÃO' ? '#a855f7' : '#38bdf8'}">
                    ${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>
        `).join('');
    }

    // Filtros de busca
    const status = document.getElementById("filtroStatus").value;
    const dataAte = document.getElementById("filtroDataAte").value;
    
    let query = supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento", { ascending: true });

    if (status && status !== "Todos") query = query.eq("status", status);
    if (dataAte) query = query.lte("vencimento", dataAte);

    const { data: contas } = await query;
    const tbody = document.getElementById("listaPagar");
    
    tbody.innerHTML = (contas || []).map(item => `
        <tr>
            <td style="color: #f87171; font-weight: bold;">${item.descricao}</td>
            <td style="color: #38bdf8; font-weight: bold;">${item.bancos?.nome || '--'}</td>
            <td style="color: #f87171; font-weight: bold;">-${parseFloat(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
            <td><span class="${item.status === 'PAGO' ? 'badge-pago' : 'badge-aberto'}">${item.status}</span></td>
            <td>
                ${item.status !== 'PAGO' ? `
                    <button class="btn-acao" style="background: #ef4444; padding: 5px 12px; font-size: 11px;" 
                    onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')">Pagar</button>
                ` : '✅'}
            </td>
        </tr>
    `).join('');
}

// Lançamento Manual restrito a SICOOB e CAIXA FEDERAL
async function agendarSaida() {
    // Filtra para remover a 'APLICAÇÃO' da lista de escolha de débito
    const { data: bancos } = await supabase.from("bancos")
        .select("*")
        .neq("nome", "APLICAÇÃO") 
        .order("nome");
    
    const desc = prompt("NF / Origem da Despesa:");
    const valor = prompt("Valor (Ex: 1500.50):");
    const data = prompt("Data de Vencimento (AAAA-MM-DD):");
    
    // Monta o menu de escolha excluindo a Aplicação
    const menuBancos = bancos.map((b, i) => `${i + 1}: ${b.nome}`).join('\n');
    const escolha = prompt("Selecione o Banco para o Débito:\n" + menuBancos);

    const bancoSelecionado = bancos[parseInt(escolha) - 1];

    if (desc && valor && data && bancoSelecionado) {
        await supabase.from("contas_pagar").insert([{
            descricao: desc,
            valor: parseFloat(valor.replace(',', '.')),
            vencimento: data,
            banco_id: bancoSelecionado.id,
            status: "ABERTO"
        }]);
        carregarDados();
    }
}

// Transferência entre contas (Pode incluir a Aplicação aqui para resgate)
async function transferirEntreBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const menu = bancos.map((b, i) => `${i + 1}: ${b.nome} (R$ ${parseFloat(b.saldo).toFixed(2)})`).join('\n');
    
    const de = prompt("Sair de qual conta?\n" + menu);
    const para = prompt("Entrar em qual conta?\n" + menu);
    const valor = parseFloat(prompt("Valor da transferência:").replace(',', '.'));

    const bancoDe = bancos[parseInt(de) - 1];
    const bancoPara = bancos[parseInt(para) - 1];

    if (bancoDe && bancoPara && valor > 0 && bancoDe.saldo >= valor) {
        await supabase.from("bancos").update({ saldo: bancoDe.saldo - valor }).eq("id", bancoDe.id);
        await supabase.from("bancos").update({ saldo: bancoPara.saldo + valor }).eq("id", bancoPara.id);
        alert("Transferência realizada!");
        carregarDados();
    } else {
        alert("Dados inválidos ou saldo insuficiente.");
    }
}

// Extrato PDF com o seu padrão de cores
async function gerarExtratoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const { data: movs } = await supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");

    doc.setFontSize(16);
    doc.text("MATÃO USINAGEM - EXTRATO FINANCEIRO", 14, 15);
    
    let y = 25;
    bancos.forEach(banco => {
        doc.setFontSize(12);
        doc.setTextColor(56, 189, 248);
        doc.text(`BANCO: ${banco.nome} | SALDO: R$ ${parseFloat(banco.saldo).toLocaleString('pt-BR')}`, 14, y);
        
        const rows = movs.filter(m => m.banco_id === banco.id).map(m => [
            new Date(m.vencimento).toLocaleDateString('pt-BR'),
            m.descricao,
            `- R$ ${parseFloat(m.valor).toFixed(2)}`,
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

    doc.save("Extrato_Financeiro.pdf");
}

window.baixarConta = async (id, valor, bancoId) => {
    if(!bancoId) return alert("Banco não definido.");
    if(!confirm("Confirmar pagamento?")) return;
    const { data: b } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
    await supabase.from("bancos").update({ saldo: b.saldo - valor }).eq("id", bancoId);
    carregarDados();
};
