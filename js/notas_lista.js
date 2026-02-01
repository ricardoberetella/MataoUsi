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

    // Vincula as funções ao objeto window para o HTML conseguir acessá-las
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
//   LÓGICA DE CÁLCULO DE FATURAMENTO
// ===============================================
async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Processando...";

    // Define o intervalo baseado na data_nf
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    try {
        console.log(`Buscando NFs entre ${dataInicio} e ${dataFim}`);

        // 1. Busca as notas fiscais na tabela notas_fiscais
        let queryNotas = supabase
            .from("notas_fiscais")
            .select("numero_nf")
            .gte("data_nf", dataInicio)
            .lte("data_nf", dataFim);

        if (tipo === "com_nf") {
            queryNotas = queryNotas.not("numero_nf", "eq", "Sem NF");
        } else if (tipo === "sem_nf") {
            queryNotas = queryNotas.eq("numero_nf", "Sem NF");
        }

        const { data: notas, error: erroNotas } = await queryNotas;
        
        if (erroNotas) throw erroNotas;

        if (!notas || notas.length === 0) {
            console.warn("Nenhuma nota fiscal encontrada para este período.");
            valorTotalTxt.innerText = "R$ 0,00 (Nenhuma NF)";
            return;
        }

        // Criamos uma lista limpa com os números das NFs (Ex: ["101", "102", "SEM NF"])
        const listaNumerosNF = notas.map(n => String(n.numero_nf).trim().toUpperCase());
        console.log("Números de NF detectados:", listaNumerosNF);

        // 2. Busca os dados na tabela contas_receber
        const { data: contas, error: erroContas } = await supabase
            .from("contas_receber")
            .select("descricao, valor");

        if (erroContas) throw erroContas;

        // 3. Soma cruzada: Verifica se o número da NF está dentro da descrição da conta
        let totalGeral = 0;
        let itensSomados = 0;

        contas.forEach(item => {
            const desc = item.descricao ? String(item.descricao).toUpperCase() : "";
            
            const encontrouMatch = listaNumerosNF.some(num => {
                if (num === "SEM NF") {
                    return desc === "SEM NF"; // Para "Sem NF", a descrição deve ser exata
                }
                // Para números de NF, verifica se o número está contido na descrição (Ex: "Boleto NF 101")
                return desc.includes(num);
            });

            if (encontrouMatch) {
                const v = parseFloat(item.valor) || 0;
                totalGeral += v;
                itensSomados++;
            }
        });

        console.log(`Cálculo finalizado. Itens somados: ${itensSomados}. Total: ${totalGeral}`);

        valorTotalTxt.innerText = totalGeral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    } catch (err) {
        console.error("Erro completo no cálculo:", err);
        valorTotalTxt.innerText = "Erro ao calcular. Veja o F12.";
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
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Erro ao carregar dados.</td></tr>`;
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

function formatarData(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};
