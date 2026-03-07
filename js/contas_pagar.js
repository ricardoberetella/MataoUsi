import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Define data de hoje no filtro por padrão
    const dataPadrao = new Date().toISOString().split('T')[0];
    const filtroData = document.getElementById("filtroDataAte");
    if(filtroData) filtroData.value = dataPadrao;

    carregarDados();

    // Eventos dos botões
    document.getElementById("btnFiltrar").addEventListener("click", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", agendarSaida);
    document.getElementById("btnTransferir").addEventListener("click", transferirEntreBancos);
    document.getElementById("btnGerarPDF").addEventListener("click", gerarExtratoPDF);
});

async function carregarDados() {
    // 1. Atualizar Painéis de Bancos (SICOOB, CAIXA, APLICAÇÃO)
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const containerBancos = document.getElementById("cardsBancos");
    
    if (containerBancos) {
        containerBancos.innerHTML = bancos.map(b => `
            <div class="card-banco">
                <small style="color: #94a3b8; font-weight: bold; text-transform: uppercase;">${b.nome}</small>
                <div class="saldo-valor" style="color: ${b.nome === 'APLICAÇÃO' ? '#a855f7' : '#38bdf8'}">
                    ${parseFloat(b.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>
        `).join('');
    }

    // 2. Aplicar Filtros na Tabela
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
                ${item.status !== 'PAGO' ? `
                    <button class="btn-acao" style="background: #ef4444; padding: 5px 12px; font-size: 11px;" 
                    onclick="baixarConta('${item.id}', ${item.valor}, '${item.banco_id}')">Pagar</button>
                ` : '✅'}
            </td>
        </tr>
    `).join('');
}

// Função para dar baixa no pagamento
window.baixarConta = async (id, valor, bancoId) => {
    if(!bancoId) return alert("Erro: Esta conta não possui um banco de origem definido.");
    if(!confirm("Confirmar pagamento? O valor será debitado do saldo do banco selecionado.")) return;

    const { data: banco } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    
    if (banco.saldo < valor) {
        if(!confirm("Saldo insuficiente no banco. Deseja prosseguir mesmo assim?")) return;
    }

    await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
    await supabase.from("bancos").update({ saldo: banco.saldo - valor }).eq("id", bancoId);
    
    carregarDados();
};

// Lançamento Manual (Restrito a SICOOB e CAIXA)
async function agendarSaida() {
    const { data: bancos } = await supabase.from("bancos").select("*").neq("nome", "APLICAÇÃO").order("nome");
    
    const desc = prompt("NF / Origem da Despesa:");
    const valor = prompt("Valor (Ex: 1500.50):");
    const data = prompt("Data de Vencimento (AAAA-MM-DD):");
    const menuBancos = bancos.map((b, i) => `${i + 1}: ${b.nome}`).join('\n');
    const escolha = prompt("Selecione o Banco para o Débito:\n" + menuBancos);

    const bancoSelecionado = bancos[parseInt(escolha) - 1];

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

// Lógica de Transferência (Inclui Resgate da Aplicação)
async function transferirEntreBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const menu = bancos.map((b, i) => `${i + 1}: ${b.nome} (Saldo: R$ ${b.saldo})`).join('\n');
    
    const de = prompt("Sair de qual conta?\n" + menu);
    const para = prompt("Entrar em qual conta?\n" + menu);
    const valor = parseFloat(prompt("Valor da transferência:"));

    const bancoDe = bancos[parseInt(de) - 1];
    const bancoPara = bancos[parseInt(para) - 1];

    if (bancoDe && bancoPara && valor > 0 && bancoDe.saldo >= valor) {
        await supabase.from("bancos").update({ saldo: bancoDe.saldo - valor }).eq("id", bancoDe.id);
        await supabase.from("bancos").update({ saldo: bancoPara.saldo + valor }).eq("id", bancoPara.id);
        alert("Transferência realizada com sucesso!");
        carregarDados();
    } else {
        alert("Operação cancelada: Verifique os dados ou saldo insuficiente.");
    }
}

// Geração de Extrato PDF Futurista
async function gerarExtratoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const { data: movs } = await supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("MATÃO USINAGEM - RELATÓRIO FINANCEIRO", 14, 15);
    
    let y = 25;
    bancos.forEach(banco => {
        doc.setFontSize(12);
        doc.setTextColor(56, 189, 248);
        doc.text(`BANCO: ${banco.nome} | SALDO ATUAL: R$ ${parseFloat(banco.saldo).toLocaleString('pt-BR')}`, 14, y);
        
        const linhas = movs.filter(m => m.banco_id === banco.id).map(m => [
            new Date(m.vencimento).toLocaleDateString('pt-BR'),
            m.descricao,
            `- R$ ${parseFloat(m.valor).toFixed(2)}`,
            m.status
        ]);

        doc.autoTable({
            startY: y + 5,
            head: [['Data', 'Descrição', 'Valor', 'Status']],
            body: linhas,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 9 }
        });
        y = doc.lastAutoTable.finalY + 15;
        if (y > 270) { doc.addPage(); y = 20; }
    });

    doc.save("Extrato_Matao_Usinagem.pdf");
}
