import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";

    if (role === "viewer") {
        const btn = document.getElementById("linkNovaNF");
        if (btn) btn.style.display = "none";
    }

    carregarNotas(role);

    // Funções para os botões do HTML
    window.abrirModalFaturamento = () => { document.getElementById('modalFaturamento').style.display='block'; };
    window.fecharModalFaturamento = () => { document.getElementById('modalFaturamento').style.display='none'; };
    window.fecharModalEdicao = () => { document.getElementById('modalEditar').style.display='none'; };
    window.verNF = (id) => { window.location.href = `notas_ver.html?id=${id}`; };
    window.editarNF = (id, num, tipo, tot) => {
        document.getElementById('editId').value = id;
        document.getElementById('editNumero').value = num;
        document.getElementById('editTipo').value = tipo || "NF";
        document.getElementById('editTotal').value = tot;
        document.getElementById('modalEditar').style.display = 'block';
    };
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
            const tipo = nf.tipo || "NF";
            const corTag = tipo === "NF" ? "#0ea5e9" : "#64748b";
            
            const btnEdit = role !== "viewer" 
                ? `<button class="btn-primario" style="background:#f59e0b;" onclick="editarNF(${nf.id}, '${nf.numero_nf}', '${tipo}', ${nf.total || 0})">Editar</button>`
                : "";

            tr.innerHTML = `
                <td>${nf.numero_nf}</td>
                <td><span class="tag-tipo" style="background:${corTag}; color:white;">${tipo}</span></td>
                <td>${nf.clientes?.razao_social || "N/A"}</td>
                <td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</td>
                <td style="font-weight:bold; color:#10b981;">${(nf.total || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="btn-secundario" onclick="verNF(${nf.id})">Ver</button>
                        ${btnEdit}
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (e) { tbody.innerHTML = "<tr><td colspan='6'>Erro ao carregar.</td></tr>"; }
}

async function salvarEdicao() {
    const id = document.getElementById('editId').value;
    const body = {
        numero_nf: document.getElementById('editNumero').value,
        tipo: document.getElementById('editTipo').value,
        total: parseFloat(document.getElementById('editTotal').value)
    };
    const { error } = await supabase.from("notas_fiscais").update(body).eq("id", id);
    if (error) alert("Erro ao salvar!"); else location.reload();
}

async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    
    const inicio = `${ano}-${mes}-01`;
    const fim = `${ano}-${mes}-${new Date(ano, parseInt(mes), 0).getDate()}`;

    let rpc = supabase.from("notas_fiscais").select("total").gte("data_nf", inicio).lte("data_nf", fim);
    if (tipo !== "TODOS") rpc = rpc.eq("tipo", tipo);

    const { data, error } = await rpc;
    if (error) return alert("Erro no cálculo");

    const total = data.reduce((acc, n) => acc + (parseFloat(n.total) || 0), 0);
    document.getElementById("resFaturamento").style.display = "block";
    document.getElementById("valorTotalTxt").innerText = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
