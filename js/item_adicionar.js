import { supabase, verificarLogin } from "./auth.js";

let pedidoId = null;
let listaProdutos = [];
let produtoSelecionado = null;

/* ==========================================================
      INICIAR
========================================================== */
document.addEventListener("DOMContentLoaded", async () => {

    // 🔐 Proteção ao abrir
    const user = await verificarLogin();
    if (!user) return;

    const params = new URLSearchParams(window.location.search);

    // ✅ CORREÇÃO PRINCIPAL
    pedidoId = params.get("id");

    if (!pedidoId) {
        alert("Pedido não encontrado!");
        window.location.href = "pedidos_lista.html";
        return;
    }

    document.getElementById("voltarLink").href = `pedidos_editar.html?id=${pedidoId}`;

    await carregarProdutos();
    configurarBusca();
});

/* ==========================================================
      CARREGAR PRODUTOS
========================================================== */
async function carregarProdutos() {

    await verificarLogin();

    const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, descricao, valor_unitario")
        .order("codigo");

    if (error) {
        alert("Erro ao carregar produtos!");
        return;
    }

    listaProdutos = data;
}

/* ==========================================================
      AUTOCOMPLETE
========================================================== */
function configurarBusca() {
    const input = document.getElementById("busca_produto");
    const lista = document.getElementById("listaProdutos");

    input.addEventListener("input", async () => {

        await verificarLogin();

        const termo = input.value.toLowerCase();
        lista.innerHTML = "";
        lista.style.display = "block";

        const filtrados = listaProdutos.filter(p =>
            p.codigo.toLowerCase().includes(termo) ||
            p.descricao.toLowerCase().includes(termo)
        );

        filtrados.forEach(prod => {
            const div = document.createElement("div");
            div.classList.add("autocomplete-item");
            div.textContent = `${prod.codigo} — ${prod.descricao}`;

            div.addEventListener("click", async () => {

                await verificarLogin();

                produtoSelecionado = prod;

                input.value = `${prod.codigo} — ${prod.descricao}`;
                lista.style.display = "none";

                document.getElementById("valor_unitario").value =
                    prod.valor_unitario.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
            });

            lista.appendChild(div);
        });
    });

    document.addEventListener("click", (e) => {
        if (e.target !== input) {
            lista.style.display = "none";
        }
    });
}

/* ==========================================================
      SALVAR ITEM
========================================================== */
document.getElementById("btnSalvarItem").addEventListener("click", async () => {

    await verificarLogin();

    if (!produtoSelecionado) {
        alert("Selecione um produto!");
        return;
    }

    const quantidade = Number(document.getElementById("quantidade").value);
    const dataEntrega = document.getElementById("data_entrega").value;

    let valorDigitado = document.getElementById("valor_unitario").value;
    valorDigitado = valorDigitado.replace('.', '').replace(',', '.');

    if (isNaN(parseFloat(valorDigitado))) {
        alert("Valor unitário inválido!");
        return;
    }

    const { error } = await supabase
        .from("pedidos_itens")
        .insert({
            pedido_id: pedidoId,             // 👍 AGORA FUNCIONA
            produto_id: produtoSelecionado.id,
            quantidade,
            valor_unitario: parseFloat(valorDigitado),
            data_entrega: dataEntrega
        });

    if (error) {
        console.log(error);
        alert("Erro ao salvar item!");
        return;
    }

    alert("Item adicionado com sucesso!");
    window.location.href = `pedidos_editar.html?id=${pedidoId}`;
});
