import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Define a data atual no filtro de vencimento da tela principal
    const dataHoje = new Date().toISOString().split('T')[0];
    const filtroData = document.getElementById("filtroDataAte");
    if(filtroData) filtroData.value = dataHoje;

    carregarDados();

    // Eventos dos botões da interface
    document.getElementById("btnFiltrar").addEventListener("click", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", agendarSaida);
    document.getElementById("btnTransferir").addEventListener("click", transferirEntreBancos);
    document.getElementById("btnGerarPDF").addEventListener("click", gerarExtratoPDF);
});

async function carregarDados() {
    // Busca os saldos reais para os cards futuristas (SICOOB, CAIXA, APLICAÇÃO)
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

    // Filtros de busca da tabela
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

// Lançamento Manual com melhorias de UX solicitadas
async function agendarSaida() {
    // Filtra para exibir apenas bancos de débito (SICOOB e CAIXA FEDERAL)
    const { data: bancos } = await supabase.from("bancos")
        .select("*")
        .neq("nome", "APLICAÇÃO") 
        .order("nome");
    
    // 1. Apenas Origem da Despesa (sem NF)
    const desc = prompt("Origem da Despesa:");
    
    // 2. Aceita vírgula e converte para ponto
    const valorInput = prompt("Valor (Ex: 1500,50):");
    
    // 3. Padrão de data brasileiro DD/MM/AAAA
    const dataInput = prompt("Data de Vencimento (DD/MM/AAAA):");

    // 4. Seleção por número (apenas SICOOB ou CAIXA)
    const menuBancos = bancos.map((b, i) => `${i + 1}: ${b.nome}`).join('\n');
    const escolha = prompt("Selecione o Banco para o Débito:\n" + menuBancos);

    if (desc && valorInput && dataInput && escolha) {
        try {
            // Conversão de valor (vírgula para ponto)
            const valorFormatado = parseFloat(valorInput.replace(',', '.'));
            
            // Conversão de data (DD/MM/AAAA para AAAA-MM-DD para o banco de dados)
            const partesData = dataInput.split('/');
            const dataISO = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;

            const bancoSelecionado = bancos[parseInt(escolha) - 1];

            if (bancoSelecionado) {
                const { error } = await supabase.from("contas_pagar").insert([{
                    descricao: desc,
                    valor: valorFormatado,
                    vencimento: dataISO,
                    banco_id: bancoSelecionado.id,
                    status: "ABERTO"
                }]);

                if (error) throw error;
                carregarDados();
            } else {
                alert("Opção de banco inválida.");
            }
        } catch (err) {
            alert("Erro ao processar dados. Verifique o formato da data (DD/MM/AAAA) e do valor.");
        }
    }
}

// Transferência entre contas (Incluindo a APLICAÇÃO)
async function transferirEntreBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const menu = bancos.map((b, i) => `${i + 1}: ${b.nome} (Saldo: R$ ${parseFloat(b.saldo).toFixed(2)})`).join('\n');
    
    const de = prompt("Sair de qual conta?\n" + menu);
    const para = prompt("Entrar em qual conta?\n" + menu);
    const valorInput = prompt("Valor da transferência (Ex: 500,00):");

    const bancoDe = bancos[parseInt(de) - 1];
    const bancoPara = bancos[parseInt(para) - 1];

    if (bancoDe && bancoPara && valorInput) {
        const valor = parseFloat(valorInput.replace(',', '.'));
        if (valor > 0 && bancoDe.saldo >= valor) {
            await supabase.from("bancos").update({ saldo: bancoDe.saldo - valor }).eq("id", bancoDe.id);
            await supabase.from("bancos").update({ saldo: bancoPara.saldo + valor }).eq("id", bancoPara.id);
            alert("Transferência realizada com sucesso!");
            carregarDados();
        } else {
            alert("Operação cancelada: Saldo insuficiente ou valor inválido.");
        }
    }
}

// Baixa de pagamento no banco selecionado
window.baixarConta = async (id, valor, bancoId) => {
    if(!bancoId) return alert("Banco não definido para esta conta.");
    if(!confirm("Confirmar pagamento? O valor será debitado do saldo do banco.")) return;
    
    const { data: b } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    
    await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
    await supabase.from("bancos").update({ saldo: b.saldo - valor }).eq("id", bancoId);
    
    carregarDados();
};

// Gerar Extrato PDF
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

    doc.save("Extrato_Financeiro_Matao.pdf");
}
