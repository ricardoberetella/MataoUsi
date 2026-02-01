import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";

    // Ocultar botão de nova NF para visualizadores
    if (role === "viewer") {
        const btnNovaNF = document.getElementById("btnNovaNF");
        if (btnNovaNF) btnNovaNF.style.display = "none";
    }

    carregarNotas();

    // Exposição global para funcionamento dos botões HTML
    window.abrirModalFaturamento = () => {
        const modal = document.getElementById('modalFaturamento');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('resFaturamento').style.display = 'none';
        }
    };

    window.fecharModalFaturamento = () => {
        const modal = document.getElementById('modalFaturamento');
        if (modal) modal.style.display = 'none';
    };

    window.calcularFaturamento = calcularFaturamento;
});

// ===============================================
//   CÁLCULO DE FATURAMENTO (VIA TABELA BOLETOS)
// ===============================================
async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Calculando valores...";

    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;

    try {
        // 1. Buscar as notas fiscais do período para obter os IDs
        let queryNF = supabase.from("notas_fiscais")
            .select("id, numero_nf")
            .gte("data_nf", dataInicio)
            .lte("data_nf", dataFim);
        
        if (tipo === "com_nf") {
            queryNF = queryNF.not("numero_nf", "eq", "Sem NF");
        } else if (tipo === "sem_nf") {
            queryNF = queryNF.eq("numero_nf", "Sem NF");
        }

        const { data: notas, error: errNF } = await queryNF;
        if (errNF) throw errNF;

        if (!notas || notas.length === 0) {
            valorTotalTxt.innerHTML = "R$ 0,00";
            return;
        }

        // Pegamos todos os IDs das notas encontradas
        const idsNotas = notas.map(n => n.id);

        // 2. Buscar e somar os boletos vinculados a esses IDs
        // NOTA: Certifique-se que o nome da coluna na tabela boletos é 'nota_id'
        const { data: boletos, error: errBol } = await supabase
            .from("boletos")
            .select("valor")
            .in("nota_id", idsNotas);

        if (errBol) throw errBol;

        // Soma todos os valores dos boletos encontrados
        const totalGeral = boletos.reduce((acc, b) => {
            return acc + (parseFloat(b.valor) || 0);
        }, 0);

        // Exibe o resultado formatado
        valorTotalTxt.innerHTML = `<strong style="color: #10b981; font-size: 1.25rem;">${totalGeral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        })}</strong>`;

    } catch (err) {
        console.error("Erro no cálculo:", err);
        valorTotalTxt.innerText = "Erro ao processar valores.";
    }
}

// ===============================================
//   LISTAGEM DE NOTAS NA TABELA PRINCIPAL
// ===============================================
async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Carregando notas...</td></tr>`;

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`id, numero_nf, data_nf, clientes ( razao_social )`)
        .order("data_nf", { ascending: false });

    if (error) {
        console.error("Erro ao listar:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: red;">Erro ao carregar dados.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhuma nota fiscal lançada.</td></tr>`;
        return;
    }

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

function formatarData(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};
