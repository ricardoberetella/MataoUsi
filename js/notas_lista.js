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
});

// ===============================================
//   CARREGAR LISTAGEM DAS NOTAS FISCAIS
// ===============================================
async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center;color:#94a3b8;">
                Carregando notas fiscais...
            </td>
        </tr>
    `;

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
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:red;">
                    Erro ao carregar notas
                </td>
            </tr>
        `;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:#94a3b8;">
                    Nenhuma nota encontrada.
                </td>
            </tr>
        `;
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
//   FORMATORES
// ===============================================
function formatarData(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// ===============================================
//   ABRIR DETALHES DA NF
// ===============================================
window.verNF = (id) => {
    window.location.href = `notas_ver.html?id=${id}`;
};
