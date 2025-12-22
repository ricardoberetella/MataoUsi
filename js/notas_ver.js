// ===============================================
//   NOTAS_VER.JS - DETALHES DA NF + BAIXAS + BOLETOS
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let cacheProdutos = [];

// ================= BOLETOS ======================
let boletoEditandoId = null;

// ===============================================
// FORMATAR DATA PARA PT-BR (DD/MM/AAAA)
// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    const data = new Date(dataISO);
    return data.toLocaleDateString("pt-BR");
}

function formatarMoedaBR(valor) {
    const v = Number(valor || 0);
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ===============================================
// INICIAR TELA
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = obterIdDaURL();
    if (!nfId) {
        alert("Nota Fiscal não encontrada.");
        window.location.href = "notas_lista.html";
        return;
    }

    await carregarProdutosCache();
    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();

    // 🔹 inclusão segura
    configurarEventosBoletos();
    await carregarBoletos();
});

// ===============================================
// PEGAR ID DA URL
// ===============================================
function obterIdDaURL() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    return id ? Number(id) : null;
}

// ===============================================
// CARREGAR PRODUTOS (CACHE PARA NOME)
// ===============================================
async function carregarProdutosCache() {
    const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, descricao");

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        cacheProdutos = [];
        return;
    }

    cacheProdutos = data || [];
}

function nomeProduto(produtoId) {
    const p = cacheProdutos.find(pr => pr.id === produtoId);
    if (!p) return `ID ${produtoId}`;
    return `${p.codigo} - ${p.descricao}`;
}

// ===============================================
// CARREGAR DADOS DA NF
// ===============================================
async function carregarDadosNF() {
    const spanNumero = document.getElementById("nfNumero");
    const spanData = document.getElementById("nfData");
    const spanCliente = document.getElementById("nfCliente");

    const { data, error } = await supabase
        .from("notas_fiscais")
        .select(`
            id,
            numero_nf,
            data_nf,
            clientes(razao_social)
        `)
        .eq("id", nfId)
        .single();

    if (error) {
        console.error("Erro ao carregar NF:", error);
        alert("Erro ao carregar dados da NF.");
        return;
    }

    spanNumero.textContent = data.numero_nf;
    spanData.textContent = formatarDataBR(data.data_nf);
    spanCliente.textContent = data.clientes?.razao_social || "—";
}

// ===============================================
// CARREGAR ITENS DA NF
// ===============================================
async function carregarItensNF() {
    const tbody = document.getElementById("listaItens");
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">Carregando...</td></tr>`;

    const { data, error } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    if (error) {
        console.error("Erro ao carregar itens da NF:", error);
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">Erro ao carregar itens</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">Nenhum item encontrado</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${nomeProduto(item.produto_id)}</td>
                <td style="text-align:right;">${item.quantidade}</td>
            </tr>
        `;
    });
}

// ===============================================
// CARREGAR BAIXAS
// ===============================================
async function carregarBaixas() {
    const tbody = document.getElementById("listaBaixas");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>`;

    const { data: baixasNF, error } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id, produto_id, quantidade_baixada")
        .eq("nf_id", nfId);

    if (error) {
        console.error("Erro ao buscar baixas:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Erro ao carregar baixas</td></tr>`;
        return;
    }

    if (!baixasNF || baixasNF.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhuma baixa realizada</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    baixasNF.forEach(bx => {
        tbody.innerHTML += `
            <tr>
                <td>${bx.pedido_id}</td>
                <td>${nomeProduto(bx.produto_id)}</td>
                <td style="text-align:right;">${bx.quantidade_baixada}</td>
                <td style="text-align:center;">—</td>
            </tr>
        `;
    });
}

// =====================================================
// ===================== BOLETOS =======================
// =====================================================
function configurarEventosBoletos() {
    document.getElementById("btnNovoBoleto")?.addEventListener("click", abrirModalNovoBoleto);
    document.getElementById("btnCancelarBoleto")?.addEventListener("click", fecharModalBoleto);
    document.getElementById("btnSalvarBoleto")?.addEventListener("click", salvarBoleto);
    document.getElementById("filtroBoletos")?.addEventListener("change", carregarBoletos);

    document.querySelectorAll('input[name="vinculoBoleto"]').forEach(radio => {
        radio.addEventListener("change", () => {
            const area = document.getElementById("areaSemNF");
            const val = document.querySelector('input[name="vinculoBoleto"]:checked')?.value;
            if (area) area.style.display = val === "sem" ? "block" : "none";
        });
    });
}

function abrirModalNovoBoleto() {
    boletoEditandoId = null;
    document.getElementById("tituloModalBoleto").textContent = "Novo Boleto";
    document.getElementById("boletoOrigem").value = "";
    document.getElementById("boletoValor").value = "";
    document.getElementById("boletoVencimento").value = "";
    document.getElementById("boletoNumeroNFRef").value = "";
    document.getElementById("areaSemNF").style.display = "none";
    document.getElementById("modalBoleto").style.display = "flex";
}

function fecharModalBoleto() {
    document.getElementById("modalBoleto").style.display = "none";
}

async function carregarBoletos() {
    const tbody = document.getElementById("listaBoletos");
    const filtro = document.getElementById("filtroBoletos")?.value || "nf";

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Carregando...</td></tr>`;

    let query = supabase
        .from("boletos")
        .select("*")
        .order("data_vencimento", { ascending: true });

    if (filtro === "nf") query = query.eq("nota_fiscal_id", nfId);
    if (filtro === "sem") query = query.is("nota_fiscal_id", null);
    if (filtro === "todos") query = query.or(`nota_fiscal_id.eq.${nfId},nota_fiscal_id.is.null`);

    const { data, error } = await query;

    if (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar boletos</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">Nenhum boleto encontrado</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    data.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.origem || "—"}</td>
                <td>${b.nota_fiscal_id ? "COM NF" : "SEM NF"}</td>
                <td>${b.numero_nf_referencia || "—"}</td>
                <td style="text-align:right;">${formatarMoedaBR(b.valor)}</td>
                <td style="text-align:center;">${formatarDataBR(b.data_vencimento)}</td>
                <td>
                    <button class="btn-editar" onclick="editarBoleto(${b.id})">Editar</button>
                    <button class="btn-danger" onclick="excluirBoleto(${b.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

async function salvarBoleto() {
    const vinculo = document.querySelector('input[name="vinculoBoleto"]:checked')?.value;
    const payload = {
        nota_fiscal_id: vinculo === "com" ? nfId : null,
        origem: document.getElementById("boletoOrigem").value,
        tipo_nf: document.getElementById("boletoTipoNF").value,
        numero_nf_referencia: document.getElementById("boletoNumeroNFRef").value || null,
        valor: Number(document.getElementById("boletoValor").value),
        data_vencimento: document.getElementById("boletoVencimento").value
    };

    let resp;
    if (boletoEditandoId) {
        resp = await supabase.from("boletos").update(payload).eq("id", boletoEditandoId);
    } else {
        resp = await supabase.from("boletos").insert(payload);
    }

    if (resp.error) {
        alert("Erro ao salvar boleto");
        console.error(resp.error);
        return;
    }

    fecharModalBoleto();
    await carregarBoletos();
}

async function editarBoleto(id) {
    const { data } = await supabase.from("boletos").select("*").eq("id", id).single();
    if (!data) return;

    boletoEditandoId = id;
    document.getElementById("tituloModalBoleto").textContent = "Editar Boleto";
    document.getElementById("boletoOrigem").value = data.origem || "";
    document.getElementById("boletoValor").value = data.valor || "";
    document.getElementById("boletoVencimento").value = data.data_vencimento || "";
    document.getElementById("boletoNumeroNFRef").value = data.numero_nf_referencia || "";

    if (data.nota_fiscal_id) {
        document.querySelector('input[value="com"]').checked = true;
        document.getElementById("areaSemNF").style.display = "none";
    } else {
        document.querySelector('input[value="sem"]').checked = true;
        document.getElementById("areaSemNF").style.display = "block";
    }

    document.getElementById("modalBoleto").style.display = "flex";
}

async function excluirBoleto(id) {
    if (!confirm("Excluir este boleto?")) return;

    const { error } = await supabase.from("boletos").delete().eq("id", id);
    if (error) {
        alert("Erro ao excluir boleto");
        console.error(error);
        return;
    }

    await carregarBoletos();
}
