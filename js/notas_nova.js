// ===============================================
//  NOTAS_NOVA.JS — SALVAR NF + BAIXA AUTOMÁTICA
//  • Baixa por ITEM individual (pedidos_itens.id)
//  • Ordem pela DATA DE ENTREGA (mais antiga -> mais nova)
//  • Usa pedido_item_id na tabela notas_pedidos_baixas
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let listaClientes = [];
let listaProdutos = [];
let itensNF = []; // [{ produto_id, quantidade }]

// ===============================================
//  INICIAR
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    await carregarClientes();
    await carregarProdutos();
    configurarEventos();

    console.log("Tela de Nova NF carregada.");
});

// ===============================================
//  CARREGAR CLIENTES
// ===============================================
async function carregarClientes() {
    const select = document.getElementById("clienteSelect");
    select.innerHTML = `<option value="">Selecione o cliente</option>`;

    const { data, error } = await supabase
        .from("clientes")
        .select("id, razao_social")
        .order("razao_social", { ascending: true });

    if (error) {
        console.error("Erro ao carregar clientes:", error);
        alert("Erro ao carregar clientes.");
        return;
    }

    listaClientes = data || [];

    listaClientes.forEach(cli => {
        const opt = document.createElement("option");
        opt.value = cli.id;
        opt.textContent = cli.razao_social;
        select.appendChild(opt);
    });
}

// ===============================================
//  CARREGAR PRODUTOS
// ===============================================
async function carregarProdutos() {
    const select = document.getElementById("produtoSelect");
    select.innerHTML = `<option value="">Selecione o produto</option>`;

    const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, descricao")
        .order("codigo", { ascending: true });

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        alert("Erro ao carregar produtos.");
        return;
    }

    listaProdutos = data || [];

    listaProdutos.forEach(prod => {
        const opt = document.createElement("option");
        opt.value = prod.id;
        opt.textContent = `${prod.codigo} - ${prod.descricao}`;
        select.appendChild(opt);
    });
}

// ===============================================
//  EVENTOS
// ===============================================
function configurarEventos() {
    const btnAdd = document.getElementById("btnAdicionarItem");
    const btnSalvar = document.getElementById("btnSalvarNF");

    if (btnAdd) btnAdd.addEventListener("click", adicionarItem);
    if (btnSalvar) btnSalvar.addEventListener("click", salvarNF);
}

// ===============================================
//  ADICIONAR ITEM NA NF
// ===============================================
function adicionarItem() {
    const produtoId = Number(document.getElementById("produtoSelect").value);
    const quantidade = Number(document.getElementById("quantidadeNF").value);

    if (!produtoId || quantidade <= 0) {
        alert("Selecione um produto e informe a quantidade.");
        return;
    }

    itensNF.push({ produto_id: produtoId, quantidade });
    atualizarTabelaItens();
}

function atualizarTabelaItens() {
    const tbody = document.getElementById("tbodyItensNF");
    tbody.innerHTML = "";

    itensNF.forEach((item, index) => {
        const produto = listaProdutos.find(p => p.id === item.produto_id);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${produto ? `${produto.codigo} - ${produto.descricao}` : item.produto_id}</td>
            <td style="text-align:right;">${item.quantidade}</td>
            <td style="text-align:center;">
                <button class="btn-secundario" onclick="removerItem(${index})">Remover</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.removerItem = function (index) {
    itensNF.splice(index, 1);
    atualizarTabelaItens();
};

// ===============================================
//  SALVAR NF + ITENS + BAIXA AUTOMÁTICA
// ===============================================
async function salvarNF() {
    const clienteId = Number(document.getElementById("clienteSelect").value);
    const numeroNF = document.getElementById("nfNumero").value.trim();
    const dataNF = document.getElementById("nfData").value;

    if (!clienteId || !numeroNF || !dataNF) {
        alert("Preencha cliente, número da NF e data.");
        return;
    }

    if (itensNF.length === 0) {
        alert("Adicione ao menos um item na NF.");
        return;
    }

    // ---------- Criar NF ----------
    const { data: nf, error: erroNF } = await supabase
        .from("notas_fiscais")
        .insert({
            cliente_id: clienteId,
            numero_nf: numeroNF,
            data_nf: dataNF,
            total: 0
        })
        .select()
        .single();

    if (erroNF) {
        console.error("Erro ao salvar NF:", erroNF);
        alert("Erro ao salvar Nota Fiscal.");
        return;
    }

    const nfId = nf.id;

    // ---------- Inserir itens da NF ----------
    const itensParaInserir = itensNF.map(it => ({
        nf_id: nfId,
        produto_id: it.produto_id,
        quantidade: it.quantidade
    }));

    const { error: erroItens } = await supabase
        .from("notas_fiscais_itens")
        .insert(itensParaInserir);

    if (erroItens) {
        console.error("Erro ao salvar itens da NF:", erroItens);
        alert("Erro ao salvar itens da Nota Fiscal.");
        return;
    }

    // ---------- Baixa automática ----------
    await realizarBaixaPorData(nfId, clienteId, itensParaInserir);

    alert("NF salva e baixas aplicadas com sucesso!");
    window.location.href = "notas_lista.html";
}

// ===============================================
//  BAIXA AUTOMÁTICA — POR ITEM E POR DATA
// ===============================================
//
//  Regras:
//  • Para cada item da NF (produto + quantidade)
//  • Busca TODOS os itens de pedido (pedidos_itens) desse cliente e produto
//  • Ordena por data_entrega asc (mais antiga primeiro)
//  • Para cada item: calcula saldo = quantidade do item - baixas anteriores
//  • Aplica baixa até acabar a quantidade da NF
//  • Salva em notas_pedidos_baixas com pedido_item_id
// ===============================================
async function realizarBaixaPorData(nfId, clienteId, itensNF) {
    for (const itemNF of itensNF) {
        let qtdRestante = Number(itemNF.quantidade);
        if (qtdRestante <= 0) continue;

        console.log("🔎 Iniciando baixa para produto", itemNF.produto_id, "Quantidade NF =", qtdRestante);

        // Buscar itens de pedido para esse cliente + produto
        const { data: itensPedido, error } = await supabase
            .from("pedidos_itens")
            .select(`
                id,
                pedido_id,
                produto_id,
                quantidade,
                data_entrega,
                pedidos!inner(id, cliente_id)
            `)
            .eq("produto_id", itemNF.produto_id)
            .eq("pedidos.cliente_id", clienteId)
            .order("data_entrega", { ascending: true });

        if (error) {
            console.error("Erro ao buscar itens de pedidos para baixa:", error);
            continue;
        }

        if (!itensPedido || itensPedido.length === 0) {
            console.log("Nenhum pedido encontrado para produto", itemNF.produto_id);
            continue;
        }

        console.log("📋 Itens de pedido encontrados:", itensPedido);

        // Processar item POR item, em ordem de data
        for (const pedItem of itensPedido) {
            if (qtdRestante <= 0) break;

            // Buscar baixas anteriores deste item específico
            const { data: baixasItem, error: erroBaixas } = await supabase
                .from("notas_pedidos_baixas")
                .select("quantidade_baixada")
                .eq("pedido_item_id", pedItem.id);

            if (erroBaixas) {
                console.error("Erro ao buscar baixas anteriores do item", pedItem.id, erroBaixas);
                continue;
            }

            const totalBaixadoItem = (baixasItem || []).reduce(
                (soma, b) => soma + Number(b.quantidade_baixada),
                0
            );

            const saldoItem = Number(pedItem.quantidade) - totalBaixadoItem;

            if (saldoItem <= 0) {
                console.log(`Item ${pedItem.id} já totalmente baixado. Saldo 0.`);
                continue;
            }

            // Quanto posso baixar neste item agora
            const baixarAgora = Math.min(qtdRestante, saldoItem);

            console.log(
                `⬇ Baixando ${baixarAgora} do item ${pedItem.id} (pedido ${pedItem.pedido_id}) ` +
                `| saldoItem=${saldoItem} | qtdRestante antes=${qtdRestante}`
            );

            // Inserir baixa neste item
            const { error: erroInsert } = await supabase
                .from("notas_pedidos_baixas")
                .insert({
                    nf_id: nfId,
                    pedido_id: pedItem.pedido_id,
                    produto_id: pedItem.produto_id,
                    pedido_item_id: pedItem.id,
                    quantidade_baixada: baixarAgora
                });

            if (erroInsert) {
                console.error("Erro ao registrar baixa do item", pedItem.id, erroInsert);
                // Se der erro, não desconta a quantidade — pra não desalinhar
                continue;
            }

            // Atualiza o restante da NF
            qtdRestante -= baixarAgora;
            console.log("qtdRestante após baixa =", qtdRestante);
        }

        console.log(
            "✅ Final da baixa para produto",
            itemNF.produto_id,
            "| Restante não alocado da NF =", qtdRestante
        );
    }

    console.log("🎉 Baixa automática concluída para todos os itens da NF", nfId);
}
