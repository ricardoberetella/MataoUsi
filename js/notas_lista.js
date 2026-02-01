import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";

    if (role === "viewer") {
        const btnNovaNF = document.getElementById("btnNovaNF");
        if (btnNovaNF) btnNovaNF.style.display = "none";
    }

    carregarNotas();

    // Importante: Vincular a função ao objeto window para o HTML conseguir chamá-la
    window.calcularFaturamento = calcularFaturamento;
    window.fecharModalFaturamento = () => {
        document.getElementById('modalFaturamento').style.display = 'none';
    };
});

async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Carregando notas fiscais...</td></tr>`;

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`id, numero_nf, data_nf, total, clientes ( razao_social )`)
        .order("data_nf", { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Erro ao carregar notas</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Nenhuma nota encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    data.forEach(nf => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${nf.numero_nf}</td>
            <td>${nf.clientes?.razao_social ?? "-"}</td>
            <td>${formatarData(nf.data_nf)}</td>
            <td><button class="btn-secundario" onclick="verNF(${nf.id})">Ver</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// ===============================================
//   LOGICA DE CALCULO CORRIGIDA
// ===============================================
async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    // Mostra o feedback de carregamento
    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Calculando...";

    // Criar o intervalo de busca para o mês inteiro
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    let query = supabase
        .from("notas_fiscais")
        .select("total, numero_nf")
        .gte("data_nf", dataInicio)
        .lte("data_nf", dataFim);

    // Aplicar filtros de tipo (Baseado no valor do select)
    if (tipo === "com_nf") {
        query = query.not("numero_nf", "eq", "Sem NF");
    } else if (tipo === "sem_nf") {
        query = query.eq("numero_nf", "Sem NF");
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erro Supabase:", error);
        valorTotalTxt.innerText = "Erro na busca";
        return;
    }

    // Soma os valores tratando nulos e strings
    const totalGeral = data.reduce((acc, item) => {
        const valor = parseFloat(item.total) || 0;
        return acc + valor;
    }, 0);

    // Formata o valor final para Real Brasileiro
    valorTotalTxt.innerText = totalGeral.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};
