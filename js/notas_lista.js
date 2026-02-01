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
//   CÁLCULO DE FATURAMENTO (SOMANDO BOLETOS)
// ===============================================
async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Calculando faturamento...";

    // Intervalo de data baseado na data_nf
    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;

    try {
        // 1. Busca as notas fiscais do período
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
            valorTotalTxt.innerText = "R$ 0,00";
            return;
        }

        const idsNotas = notas.map(n => n.id);

        // 2. Busca todos os boletos vinculados a essas notas
        // No print, vemos que boletos pertencem a uma nota específica.
        const { data: boletos, error: errBol } = await supabase
            .from("boletos")
            .select("valor, nota_id")
            .in("nota_id", idsNotas);

        if (errBol) throw errBol;

        // 3. Soma o valor de todos os boletos encontrados
        const totalFaturamento = boletos.reduce((acc, boleto) => {
            return acc + (parseFloat(boleto.valor) || 0);
        }, 0);

        // 4. Exibe o resultado final
        valorTotalTxt.innerHTML = `<span style="color: #10b981; font-weight: bold; font-size: 1.4rem;">
            ${totalFaturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>`;

    } catch (err) {
        console.error("Erro no faturamento:", err);
        valorTotalTxt.innerText = "Erro ao processar dados.";
    }
}

// ===============================================
//   CARREGAR LISTAGEM GERAL
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
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Erro ao carregar lista.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    data.forEach(nf => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${nf.numero_nf}</td>
            <td>${nf.clientes?.razao_social ?? "-"}</td>
            <td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
            <td><button class="btn-secundario" onclick="verNF(${nf.id})">Ver</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};
