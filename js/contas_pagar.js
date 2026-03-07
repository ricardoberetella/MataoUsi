import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    await verificarLogin();
    
    // Configura o filtro de data inicial
    const dataHoje = new Date().toISOString().split('T')[0];
    const filtroData = document.getElementById("filtroDataAte");
    if(filtroData) filtroData.value = dataHoje;

    carregarDados();

    // Eventos dos botões
    document.getElementById("btnFiltrar").addEventListener("click", carregarDados);
    document.getElementById("btnNovoPagar").addEventListener("click", abrirModalCadastro);
    document.getElementById("btnTransferir").addEventListener("click", transferirEntreBancos);
    document.getElementById("btnGerarPDF").addEventListener("click", gerarExtratoPDF);
});

async function carregarDados() {
    // Atualiza cards de saldo com visual futurista
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

// Abre interface de cadastro com calendário e seleção de banco
async function abrirModalCadastro() {
    const { data: bancos } = await supabase.from("bancos").select("*").neq("nome", "APLICAÇÃO").order("nome");
    const dataMinima = new Date().toISOString().split('T')[0];

    // Criamos um prompt personalizado ou usamos o sistema de modal do seu HTML
    // Aqui simulamos a entrada garantindo que a data seja futura e o banco selecionado
    
    const desc = prompt("Origem da Despesa:");
    if (!desc) return;

    const valorInput = prompt("Valor (Use vírgula para decimais):");
    if (!valorInput || isNaN(parseFloat(valorInput.replace(',', '.')))) {
        alert("Valor inválido! Use apenas números e vírgula.");
        return;
    }

    const dataInput = prompt("Data de Vencimento (DD/MM/AAAA):");
    // Validação de data retroativa
    const partes = dataInput.split('/');
    const dataFormatada = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
    if (dataFormatada < new Date(dataMinima)) {
        alert("Não é permitido lançar datas anteriores a hoje.");
        return;
    }

    const menuBancos = bancos.map((b, i) => `${i + 1}: ${b.nome}`).join('\n');
    const escolha = prompt("Selecione o Banco:\n" + menuBancos);
    const bancoSelecionado = bancos[parseInt(escolha) - 1];

    if (bancoSelecionado) {
        await supabase.from("contas_pagar").insert([{
            descricao: desc,
            valor: parseFloat(valorInput.replace(',', '.')),
            vencimento: dataFormatada.toISOString().split('T')[0],
            banco_id: bancoSelecionado.id,
            status: "ABERTO"
        }]);
        carregarDados();
    }
}

window.baixarConta = async (id, valor, bancoId) => {
    if(!confirm("Confirmar baixa do pagamento?")) return;
    const { data: b } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
    await supabase.from("bancos").update({ saldo: b.saldo - valor }).eq("id", bancoId);
    carregarDados();
};

async function transferirEntreBancos() {
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    const menu = bancos.map((b, i) => `${i + 1}: ${b.nome}`).join('\n');
    const de = prompt("Origem:\n" + menu);
    const para = prompt("Destino:\n" + menu);
    const valor = prompt("Valor:");
    
    if (de && para && valor) {
        const bDe = bancos[parseInt(de)-1];
        const bPara = bancos[parseInt(para)-1];
        const v = parseFloat(valor.replace(',', '.'));
        
        await supabase.from("bancos").update({ saldo: bDe.saldo - v }).eq("id", bDe.id);
        await supabase.from("bancos").update({ saldo: bPara.saldo + v }).eq("id", bPara.id);
        carregarDados();
    }
}

async function gerarExtratoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { data: movs } = await supabase.from("contas_pagar").select(`*, bancos(nome)`).order("vencimento");

    doc.text("MATÃO USINAGEM - RELATÓRIO", 14, 15);
    doc.autoTable({
        startY: 20,
        head: [['Data', 'Descrição', 'Banco', 'Valor']],
        body: movs.map(m => [new Date(m.vencimento).toLocaleDateString('pt-BR'), m.descricao, m.bancos?.nome, m.valor]),
        theme: 'grid'
    });
    doc.save("Financeiro.pdf");
}
