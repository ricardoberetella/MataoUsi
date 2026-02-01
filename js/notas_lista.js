import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";

    // 🔒 Visualizador não pode lançar NF
    if (role === "viewer") {
        const btnNovaNF = document.getElementById("btnNovaNF");
        if (btnNovaNF) btnNovaNF.style.display = "none";
    }

    carregarNotas();

    // EXPOSTO PARA O WINDOW: Garante que o HTML encontre as funções
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
//   CÁLCULO DE FATURAMENTO CRUZADO
// ===============================================
async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Buscando dados...";

    // 1. Define o período baseado na data_nf
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    try {
        // 2. Busca as notas fiscais emitidas no período
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
            valorTotalTxt.innerText = "R$ 0,00";
            return;
        }

        // Criamos uma lista de números para busca (ex: ["123", "124", "SEM NF"])
        const listaNumerosNF = notas.map(n => n.numero_nf?.toString().trim().toUpperCase());

        // 3. Busca os valores no contas_receber
        const { data: contas, error: erroContas } = await supabase
            .from("contas_receber")
            .select("descricao, valor");

        if (erroContas) throw erroContas;

        // 4. Soma os valores cruzando a descrição
        let totalGeral = 0;

        contas.forEach(conta => {
            const desc = conta.descricao ? conta.descricao.toUpperCase() : "";
            
            const match = listaNumerosNF.some(num => {
                if (!num) return false;
                if (num === "SEM NF") return desc === "SEM NF";
                return desc.includes(num);
            });

            if (match) {
                totalGeral += (parseFloat(conta.valor) || 0);
            }
        });

        valorTotalTxt.innerText = totalGeral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    } catch (err) {
        console.error("Erro no cálculo:", err);
        valorTotalTxt.innerText = "Erro ao processar";
    }
}

// ===============================================
//   CARREGAR LISTAGEM DAS NOTAS FISCAIS
// ===============================================
async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Carregando notas...</td></tr>`;

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`
            id,
            numero_nf,
            data_nf,
            total,
            clientes ( razao_social )
        `)
        .order("data_nf", { ascending: false });

    if (error) {
        console.error("Erro ao carregar notas:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Erro ao carregar</td></tr>`;
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
            <td>
                <button class="btn-secundario" onclick="verNF(${nf.id})">Ver</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ===============================================
//   FORMATORES E AUXILIARES
// ===============================================
function formatarData(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};
