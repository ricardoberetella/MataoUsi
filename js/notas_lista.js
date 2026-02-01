import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    // Garante que o botão de nova NF respeite permissões
    const role = user.user_metadata?.role || "viewer";
    if (role === "viewer") {
        const btn = document.getElementById("btnNovaNF");
        if (btn) btn.style.display = "none";
    }

    carregarNotas();
});

// Funções Globais para o HTML
window.abrirModalFaturamento = () => {
    document.getElementById('modalFaturamento').style.display = 'block';
    document.getElementById('fatAno').value = new Date().getFullYear();
    document.getElementById('resFaturamento').style.display = 'none';
};

window.fecharModalFaturamento = () => {
    document.getElementById('modalFaturamento').style.display = 'none';
};

// --- CARREGAR LISTA ---
async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;

    try {
        const { data, error } = await supabase
            .from("notas_fiscais")
            .select(`id, numero_nf, data_nf, total, clientes ( razao_social )`)
            .order("data_nf", { ascending: false });

        if (error) throw error;

        tbody.innerHTML = "";
        data.forEach(nf => {
            // Se o total for nulo/zerado, exibe R$ 0,00 amigavelmente
            const valorTotal = nf.total ? parseFloat(nf.total) : 0;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nf.numero_nf}</td>
                <td>${nf.clientes?.razao_social || "N/A"}</td>
                <td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</td>
                <td style="font-weight:bold; color:#10b981;">
                    ${valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td>
                    <button class="btn-secundario" onclick="verNF(${nf.id})">Ver</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Erro ao carregar notas:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar dados.</td></tr>`;
    }
}

window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};

// --- CÁLCULO DE FATURAMENTO ---
window.calcularFaturamento = async () => {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Calculando...";

    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;

    try {
        // Buscamos as notas do período
        let query = supabase.from("notas_fiscais").select("id").gte("data_nf", dataInicio).lte("data_nf", dataFim);
        
        if (tipo === "com_nf") query = query.not("numero_nf", "eq", "Sem NF");
        else if (tipo === "sem_nf") query = query.eq("numero_nf", "Sem NF");

        const { data: notas, error: errNF } = await query;
        if (errNF) throw errNF;

        if (!notas || notas.length === 0) {
            valorTotalTxt.innerText = "R$ 0,00";
            return;
        }

        // Somamos os boletos dessas notas para ser 100% fiel ao print
        const ids = notas.map(n => n.id);
        const { data: boletos, error: errBol } = await supabase.from("boletos").select("valor").in("nota_id", ids);
        if (errBol) throw errBol;

        const total = boletos.reduce((acc, b) => acc + (parseFloat(b.valor) || 0), 0);
        valorTotalTxt.innerText = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    } catch (err) {
        console.error("Erro no faturamento:", err);
        valorTotalTxt.innerText = "Erro no cálculo.";
    }
};
