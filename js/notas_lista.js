import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";

    // Controle de acesso ao botão principal
    const btnNova = document.getElementById("linkNovaNF");
    if (role === "viewer" && btnNova) {
        btnNova.style.display = "none";
    }

    carregarNotas(role);

    // Funções expostas ao Window
    window.abrirModalFaturamento = () => { 
        document.getElementById('modalFaturamento').style.display='block';
        document.getElementById('resFaturamento').style.display='none';
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
            .select(`id, numero_nf, tipo, data_nf, total, clientes ( razao_social )`)
            .order("data_nf", { ascending: false });

        if (error) throw error;

        tbody.innerHTML = "";
        data.forEach(nf => {
            const tr = document.createElement("tr");
            const tipoNota = nf.tipo || "NF"; // Fallback se estiver vazio
            const corTag = tipoNota === "NF" ? "#0ea5e9" : "#64748b";
            
            const btnEditarHTML = role !== "viewer" 
                ? `<button class="btn-primario" style="background:#f59e0b;" onclick="editarNF(${nf.id}, '${nf.numero_nf}', '${tipoNota}', ${nf.total || 0})">Editar</button>`
                : "";

            tr.innerHTML = `
                <td>${nf.numero_nf}</td>
                <td><span class="tag-tipo" style="background:${corTag}; color:white;">${tipoNota}</span></td>
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
        tbody.innerHTML = "<tr><td colspan='6'>Erro ao carregar dados.</td></tr>";
    }
}

function editarNF(id, numero, tipo, total) {
    document.getElementById('editId').value = id;
    document.getElementById('editNumero').value = numero;
    document.getElementById('editTipo').value = tipo;
    document.getElementById('editTotal').value = total;
    document.getElementById('modalEditar').style.display = 'block';
}

async function salvarEdicao() {
    const id = document.getElementById('editId').value;
    const numero = document.getElementById('editNumero').value;
    const tipo = document.getElementById('editTipo').value;
    const total = parseFloat(document.getElementById('editTotal').value);

    const { error } = await supabase.from("notas_fiscais")
        .update({ numero_nf: numero, tipo: tipo, total: total })
        .eq("id", id);

    if (error) {
        alert("Erro ao atualizar!");
    } else {
        document.getElementById('modalEditar').style.display = 'none';
        location.reload();
    }
}

async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipoFiltro = document.getElementById("fatTipo").value;

    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, parseInt(mes), 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    try {
        let consulta = supabase.from("notas_fiscais").select("total, tipo")
            .gte("data_nf", dataInicio)
            .lte("data_nf", dataFim);

        if (tipoFiltro !== "TODOS") {
            consulta = consulta.eq("tipo", tipoFiltro);
        }

        const { data, error } = await consulta;
        if (error) throw error;

        const soma = data.reduce((acc, n) => acc + (parseFloat(n.total) || 0), 0);

        document.getElementById("resFaturamento").style.display = "block";
        document.getElementById("valorTotalTxt").innerText = soma.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        document.getElementById("labelFaturamento").innerText = `Total (${tipoFiltro}):`;

    } catch (err) {
        alert("Erro no cálculo.");
    }
}
