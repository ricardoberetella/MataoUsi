import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    carregarNotas();

    // Vinculação Global para o HTML
    window.abrirModalFaturamento = abrirModalFaturamento;
    window.fecharModalFaturamento = fecharModalFaturamento;
    window.calcularFaturamento = calcularFaturamento;
    window.corrigirTotaisNotas = corrigirTotaisNotas; // Função para preencher os zerados
});

async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;

    // Buscamos a coluna 'total' que agora você vai usar
    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`id, numero_nf, data_nf, total, clientes(razao_social)`)
        .order("data_nf", { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    data.forEach(nf => {
        const valorFormatado = (nf.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${nf.numero_nf}</td>
            <td>${nf.clientes?.razao_social ?? "-"}</td>
            <td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</td>
            <td style="font-weight: bold; color: #10b981;">${valorFormatado}</td>
            <td><button class="btn-secundario" onclick="window.location.href='notas_ver.html?id=${nf.id}'">Ver</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// FUNÇÃO PARA CORRIGIR OS TOTAIS ZERADOS NO BANCO
async function corrigirTotaisNotas() {
    if (!confirm("Deseja somar os boletos e atualizar o total de todas as notas agora?")) return;

    const { data: notas } = await supabase.from("notas_fiscais").select("id");

    for (const nf of notas) {
        const { data: boletos } = await supabase.from("boletos").select("valor").eq("nota_id", nf.id);
        const soma = boletos.reduce((acc, b) => acc + (parseFloat(b.valor) || 0), 0);

        await supabase.from("notas_fiscais").update({ total: soma }).eq("id", nf.id);
    }

    alert("Totais atualizados com sucesso!");
    carregarNotas();
}

// LÓGICA DO FATURAMENTO MENSAL (Lendo a coluna total corrigida)
async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const valorTotalTxt = document.getElementById("valorTotal");

    document.getElementById("resFaturamento").style.display = "block";
    valorTotalTxt.innerText = "Calculando...";

    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;

    let query = supabase.from("notas_fiscais").select("total").gte("data_nf", dataInicio).lte("data_nf", dataFim);

    if (tipo === "com_nf") query = query.not("numero_nf", "eq", "Sem NF");
    else if (tipo === "sem_nf") query = query.eq("numero_nf", "Sem NF");

    const { data, error } = await query;

    if (error) {
        valorTotalTxt.innerText = "Erro ao buscar.";
        return;
    }

    const totalGeral = data.reduce((acc, nf) => acc + (parseFloat(nf.total) || 0), 0);
    valorTotalTxt.innerText = totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
