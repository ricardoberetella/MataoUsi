// ===============================================
//  NOTAS.JS  - LISTA + DETALHES DE NOTAS FISCAIS
// ===============================================

import { supabase, verificarLogin, obterRole } from "./auth.js";

let role = "viewer";

// ===============================================
//  INICIAR CONFORME A PÁGINA
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    role = (await obterRole()) || "viewer";

    const path = window.location.pathname;

    if (path.endsWith("notas_lista.html")) {
        await iniciarListaNotas();
    } else if (path.endsWith("notas_detalhes.html")) {
        await iniciarDetalhesNota();
    }
});

// ===============================================
//  LISTA DE NOTAS FISCAIS
// ===============================================
async function iniciarListaNotas() {
    // Se não for admin, esconde botão "Lançar Nova NF"
    if (role !== "admin") {
        const areaBotoes = document.getElementById("areaBotoes");
        if (areaBotoes) areaBotoes.style.display = "none";
    }

    await carregarNotas();
}

async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;

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
            cliente_id,
            clientes (
                razao_social
            )
        `)
        .order("data_nf", { ascending: false })
        .order("id", { ascending: false });

    if (error) {
        console.error("Erro ao carregar notas fiscais:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="color:red;text-align:center;">
                    Erro ao carregar notas fiscais.
                </td>
            </tr>
        `;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:#94a3b8;">
                    Nenhuma nota fiscal lançada.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";

    for (const nf of data) {
        const dataFormatada = nf.data_nf
            ? new Date(nf.data_nf).toLocaleDateString("pt-BR")
            : "-";

        const nomeCliente =
            nf.clientes?.razao_social ||
            `Cliente ${nf.cliente_id ?? ""}`;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${nf.numero_nf}</td>
            <td>${nomeCliente}</td>
            <td>${dataFormatada}</td>
            <td>
                <button class="btn-azul" onclick="verDetalhesNF(${nf.id})">
                    Ver detalhes
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    }
}

// Torna função acessível no HTML
window.verDetalhesNF = (id) => {
    window.location.href = `notas_detalhes.html?id=${id}`;
};

// ===============================================
//  DETALHES DA NF
// ===============================================
async function iniciarDetalhesNota() {
    const nfId = obterIdNFUrl();
    if (!nfId) {
        alert("Nota fiscal não encontrada.");
        window.location.href = "notas_lista.html";
        return;
    }

    await carregarCabecalhoNF(nfId);
    await carregarItensNF(nfId);
    await carregarBaixasNF(nfId);
}

function obterIdNFUrl() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    return id ? Number(id) : null;
}

// -------- CABEÇALHO NF --------
async function carregarCabecalhoNF(nfId) {
    const spanNumero = document.getElementById("nf_numero");
    const spanCliente = document.getElementById("nf_cliente");
    const spanData = document.getElementById("nf_data");

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`
            id,
            numero_nf,
            data_nf,
            cliente_id,
            clientes (
                razao_social
            )
        `)
        .eq("id", nfId)
        .single();

    if (error || !data) {
        console.error("Erro ao carregar cabeçalho da NF:", error);
        alert("Erro ao carregar dados da nota fiscal.");
        return;
    }

    if (spanNumero) spanNumero.textContent = data.numero_nf || data.id;
    if (spanCliente) {
        spanCliente.textContent =
            data.clientes?.razao_social ||
            `Cliente ${data.cliente_id ?? ""}`;
    }
    if (spanData) {
        spanData.textContent = data.data_nf
            ? new Date(data.data_nf).toLocaleDateString("pt-BR")
            : "-";
    }
}

// -------- ITENS DA NF --------
async function carregarItensNF(nfId) {
    const tbody = document.getElementById("listaItensNF");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="2" style="text-align:center;color:#94a3b8;">
                Carregando itens...
            </td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("notas_fiscais_itens")
        .select(`
            id,
            nf_id,
            produto_id,
            quantidade
        `)
        .eq("nf_id", nfId)
        .order("id", { ascending: true });

    if (error) {
        console.error("Erro ao carregar itens da NF:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="2" style="color:red;text-align:center;">
                    Erro ao carregar itens da nota fiscal.
                </td>
            </tr>
        `;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align:center;color:#94a3b8;">
                    Nenhum item registrado para esta NF.
                </td>
            </tr>
        `;
        return;
    }

    // Para mostrar o nome dos produtos, buscamos a tabela de produtos
    const idsProdutos = [...new Set(data.map(d => d.produto_id).filter(Boolean))];

    let mapaProdutos = {};
    if (idsProdutos.length > 0) {
        const { data: produtos, error: prodError } = await supabase
            .from("produtos")
            .select("id, descricao, codigo")
            .in("id", idsProdutos);

        if (prodError) {
            console.error("Erro ao carregar produtos:", prodError);
        } else if (produtos) {
            for (const p of produtos) {
                mapaProdutos[p.id] = p;
            }
        }
    }

    tbody.innerHTML = "";

    for (const item of data) {
        const prod = mapaProdutos[item.produto_id];

        const nomeProd = prod
            ? (prod.codigo ? `${prod.codigo} - ${prod.descricao}` : prod.descricao)
            : `Produto ${item.produto_id}`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${nomeProd}</td>
            <td>${item.quantidade}</td>
        `;
        tbody.appendChild(tr);
    }
}

// -------- BAIXAS GERADAS PELA NF --------
async function carregarBaixasNF(nfId) {
    const tbody = document.getElementById("listaBaixasNF");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center;color:#94a3b8;">
                Carregando baixas...
            </td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("notas_pedidos_baixas")
        .select(`
            id,
            nf_id,
            pedido_id,
            produto_id,
            quantidade_baixada,
            created_at
        `)
        .eq("nf_id", nfId)
        .order("id", { ascending: true });

    if (error) {
        console.error("Erro ao carregar baixas da NF:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="color:red;text-align:center;">
                    Erro ao carregar baixas da NF.
                </td>
            </tr>
        `;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:#94a3b8;">
                    Nenhuma baixa registrada para esta NF.
                </td>
            </tr>
        `;
        return;
    }

    // Opcional: buscar nomes de produtos para exibir
    const idsProdutos = [...new Set(data.map(d => d.produto_id).filter(Boolean))];

    let mapaProdutos = {};
    if (idsProdutos.length > 0) {
        const { data: produtos, error: prodError } = await supabase
            .from("produtos")
            .select("id, descricao, codigo")
            .in("id", idsProdutos);

        if (prodError) {
            console.error("Erro ao carregar produtos (baixas):", prodError);
        } else if (produtos) {
            for (const p of produtos) {
                mapaProdutos[p.id] = p;
            }
        }
    }

    tbody.innerHTML = "";

    for (const b of data) {
        const prod = mapaProdutos[b.produto_id];

        const nomeProd = prod
            ? (prod.codigo ? `${prod.codigo} - ${prod.descricao}` : prod.descricao)
            : `Produto ${b.produto_id}`;

        const dataBaixa = b.created_at
            ? new Date(b.created_at).toLocaleString("pt-BR")
            : "-";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>Pedido ${b.pedido_id}</td>
            <td>${nomeProd}</td>
            <td>${b.quantidade_baixada}</td>
            <td>${dataBaixa}</td>
        `;
        tbody.appendChild(tr);
    }
}
