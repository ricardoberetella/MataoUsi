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

    // Exposição global das funções do modal
    window.abrirModalFaturamento = () => {
        document.getElementById('modalFaturamento').style.display = 'block';
        document.getElementById('resFaturamento').style.display = 'none';
    };
    window.fecharModalFaturamento = () => {
        document.getElementById('modalFaturamento').style.display = 'none';
    };
    window.calcularFaturamento = calcularFaturamento;
});

// ... (função carregarNotas e formatarData permanecem as mesmas) ...

async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Calculando boletos...";

    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    try {
        // 1. Buscamos as notas do período para filtrar os boletos depois
        let queryNotas = supabase
            .from("notas_fiscais")
            .select("id, numero_nf")
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

        // 2. Extraímos os IDs das notas encontradas
        const idsNotas = notas.map(n => n.id);

        // 3. Buscamos os BOLETOS vinculados a essas notas
        const { data: boletos, error: erroBoletos } = await supabase
            .from("boletos")
            .select("valor")
            .in("nota_id", idsNotas); // Assumindo que a coluna de vínculo chama-se nota_id

        if (erroBoletos) throw erroBoletos;

        // 4. Somamos os valores dos boletos
        const totalGeral = boletos.reduce((acc, b) => {
            return acc + (parseFloat(b.valor) || 0);
        }, 0);

        valorTotalTxt.innerText = totalGeral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    } catch (err) {
        console.error("Erro detalhado:", err);
        valorTotalTxt.innerText = "Erro ao buscar boletos";
    }
}

async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>`;

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`id, numero_nf, data_nf, clientes ( razao_social )`)
        .order("data_nf", { ascending: false });

    if (error) return;

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
