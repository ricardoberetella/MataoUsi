import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;
    carregarNotas();

    // Funções Globais
    window.abrirModalFaturamento = () => { document.getElementById('modalFaturamento').style.display='block'; };
    window.fecharModalFaturamento = () => { document.getElementById('modalFaturamento').style.display='none'; };
    window.fecharModalEdicao = () => { document.getElementById('modalEditar').style.display='none'; };
    window.editarNF = editarNF;
    window.salvarEdicao = salvarEdicao;
    window.calcularFaturamento = calcularFaturamento;
});

async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    const { data, error } = await supabase.from("notas_fiscais")
        .select(`id, numero_nf, data_nf, total, clientes ( razao_social )`)
        .order("data_nf", { ascending: false });

    if (error) return;

    tbody.innerHTML = "";
    data.forEach(nf => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${nf.numero_nf}</td>
            <td>${nf.clientes?.razao_social || "N/A"}</td>
            <td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</td>
            <td style="font-weight:bold; color:#10b981;">${(nf.total || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
            <td>
                <button class="btn-primario" style="background:#f59e0b;" onclick="editarNF(${nf.id}, '${nf.numero_nf}', ${nf.total || 0})">Editar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarNF(id, numero, total) {
    document.getElementById('editId').value = id;
    document.getElementById('editNumero').value = numero;
    document.getElementById('editTotal').value = total;
    document.getElementById('modalEditar').style.display = 'block';
}

async function salvarEdicao() {
    const id = document.getElementById('editId').value;
    const numero = document.getElementById('editNumero').value;
    const total = parseFloat(document.getElementById('editTotal').value);

    const { error } = await supabase.from("notas_fiscais")
        .update({ numero_nf: numero, total: total })
        .eq("id", id);

    if (error) {
        alert("Erro ao salvar!");
    } else {
        fecharModalEdicao();
        carregarNotas();
    }
}

async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;

    const { data } = await supabase.from("notas_fiscais")
        .select("total").gte("data_nf", dataInicio).lte("data_nf", dataFim);

    const total = data?.reduce((acc, n) => acc + (parseFloat(n.total) || 0), 0) || 0;
    document.getElementById("resFaturamento").style.display = "block";
    document.getElementById("valorTotal").innerText = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
