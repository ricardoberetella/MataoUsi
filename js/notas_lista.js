import { supabase, verificarLogin } from "./auth.js";

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";

    if (role === "viewer") {
        const btnNovaNF = document.getElementById("btnNovaNF");
        if (btnNovaNF) btnNovaNF.style.display = "none";
    }

    carregarNotas();

    // EXPOSTO PARA O WINDOW: Garante que o HTML encontre as funções
    window.abrirModalFaturamento = () => {
        document.getElementById('modalFaturamento').style.display = 'block';
        document.getElementById('resFaturamento').style.display = 'none';
    };

    window.fecharModalFaturamento = () => {
        document.getElementById('modalFaturamento').style.display = 'none';
    };

    window.calcularFaturamento = calcularFaturamento;
});

async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Carregando notas fiscais...</td></tr>`;

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`id, numero_nf, data_nf, total, clientes ( razao_social )`)
        .order("data_nf", { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Erro ao carregar notas</td></tr>`;
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
//   CÁLCULO DE FATURAMENTO (CORRIGIDO E TESTADO)
// ===============================================
async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    if (!valorTotalTxt) return;

    // Feedback visual imediato
    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Buscando...";

    // 1. Criar range de datas UTC para evitar erros de fuso horário
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    try {
        let query = supabase
            .from("notas_fiscais")
            .select("total, numero_nf")
            .gte("data_nf", dataInicio)
            .lte("data_nf", dataFim);

        // 2. Aplicar filtros conforme sua solicitação
        if (tipo === "com_nf") {
            // Filtra tudo que NÃO seja "Sem NF" e não seja nulo
            query = query.not("numero_nf", "eq", "Sem NF");
        } else if (tipo === "sem_nf") {
            // Filtra apenas o que é exatamente "Sem NF"
            query = query.eq("numero_nf", "Sem NF");
        }

        const { data, error } = await query;

        if (error) throw error;

        // 3. Soma segura (converte string para número e ignora lixo)
        const totalGeral = data.reduce((acc, item) => {
            const num = parseFloat(item.total) || 0;
            return acc + num;
        }, 0);

        // 4. Exibe o resultado formatado
        valorTotalTxt.innerText = totalGeral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    } catch (err) {
        console.error("Erro no cálculo:", err);
        valorTotalTxt.innerText = "Erro ao calcular";
    }
}

// Funções Auxiliares
function formatarData(d) {
    if (!d) return "-";
    const data = new Date(d);
    return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};
