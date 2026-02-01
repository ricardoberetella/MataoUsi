import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";

    // CONTROLE DE ACESSO: Esconde botão de incluir para visualizadores
    if (role === "viewer") {
        const btnNova = document.getElementById("linkNovaNF");
        if (btnNova) btnNova.style.display = "none";
    }

    carregarNotas(role);

    // Funções Globais expostas para o HTML
    window.abrirModalFaturamento = () => { 
        document.getElementById('modalFaturamento').style.display='block'; 
        document.getElementById('resFaturamento').style.display='none'; // Limpa resultado anterior
    };
    window.fecharModalFaturamento = () => { document.getElementById('modalFaturamento').style.display='none'; };
    window.fecharModalEdicao = () => { document.getElementById('modalEditar').style.display='none'; };
    window.verNF = (id) => { window.location.href = `notas_ver.html?id=${id}`; };
    window.editarNF = editarNF;
    window.salvarEdicao = salvarEdicao;
    window.calcularFaturamento = calcularFaturamento;
});

async function carregarNotas(role) {
    const tbody = document.getElementById("listaNotas");
    try {
        const { data, error } = await supabase.from("notas_fiscais")
            .select(`id, numero_nf, data_nf, total, clientes ( razao_social )`)
            .order("data_nf", { ascending: false });

        if (error) throw error;

        tbody.innerHTML = "";
        data.forEach(nf => {
            const tr = document.createElement("tr");
            
            // Botão EDITAR aparece apenas para não-viewers
            const btnEditarHTML = role !== "viewer" 
                ? `<button class="btn-primario" style="background:#f59e0b;" onclick="editarNF(${nf.id}, '${nf.numero_nf}', ${nf.total || 0})">Editar</button>`
                : "";

            tr.innerHTML = `
                <td>${nf.numero_nf}</td>
                <td>${nf.clientes?.razao_social || "N/A"}</td>
                <td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</td>
                <td style="font-weight:bold; color:#10b981;">
                    ${(nf.total || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                </td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="btn-secundario" onclick="verNF(${nf.id})">Ver</button>
                        ${btnEditarHTML}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados.</td></tr>";
    }
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
        alert("Erro ao atualizar!");
    } else {
        fecharModalEdicao();
        location.reload(); // Recarrega para atualizar a lista
    }
}

async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTxt = document.getElementById("valorTotalTxt");

    // Formata o intervalo de datas do mês (YYYY-MM-DD)
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, parseInt(mes), 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    try {
        const { data, error } = await supabase
            .from("notas_fiscais")
            .select("total")
            .gte("data_nf", dataInicio)
            .lte("data_nf", dataFim);

        if (error) throw error;

        // Soma robusta tratando possíveis valores nulos ou strings
        const totalGeral = data.reduce((acc, item) => {
            const v = parseFloat(item.total) || 0;
            return acc + v;
        }, 0);

        resDiv.style.display = "block";
        valorTxt.innerText = totalGeral.toLocaleString("pt-BR", { 
            style: "currency", 
            currency: "BRL" 
        });

    } catch (err) {
        console.error("Erro ao calcular:", err);
        alert("Não foi possível calcular o faturamento.");
    }
}
