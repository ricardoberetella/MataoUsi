// ====================================================
// ITEM_EDITAR.JS — EDITAR ITEM DO PEDIDO (ROBUSTO)
// - Corrige data (DD/MM/AAAA na tela -> salva YYYY-MM-DD)
// - Evita "mensagem de erro" quando salvou com sucesso
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

let itemId = null;
let pedidoId = null;

let listaProdutos = [];
let produtoSelecionadoId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  const role = user.user_metadata?.role || "viewer";
  if (role === "viewer") {
    alert("Seu usuário não tem permissão para editar itens.");
    window.location.href = "pedidos_lista.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  itemId = params.get("idItem");
  pedidoId = params.get("idPedido");

  if (!itemId || !pedidoId) {
    alert("Parâmetros inválidos (idItem / idPedido).");
    window.location.href = "pedidos_lista.html";
    return;
  }

  // Ajusta link voltar
  const voltarLink = document.getElementById("voltarLink");
  if (voltarLink) voltarLink.href = `pedidos_editar.html?id=${pedidoId}`;

  await carregarProdutos();
  await carregarItem();
  configurarAutocomplete();
  configurarSalvar();
  configurarMascaraData();
});

// ===============================================
// HELPERS
// ===============================================
function parseDinheiroBR(valorTexto) {
  if (valorTexto == null) return 0;
  const s = String(valorTexto)
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatarValorBR(n) {
  const num = Number(n || 0);
  // Mantém simples (sem R$) porque é campo input
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function brParaISO(br) {
  if (!br) return null;
  const m = String(br).trim().match(/^([0-3]\d)\/([01]\d)\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1];
  const mm = m[2];
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function isoParaBR(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10); // garante YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

async function atualizarTotalPedido() {
  const { data, error } = await supabase
    .from("pedidos_itens")
    .select("total_item")
    .eq("pedido_id", pedidoId);

  if (error) {
    console.error("Erro ao somar itens:", error);
    return;
  }

  const total = (data || []).reduce((acc, it) => acc + Number(it.total_item || 0), 0);

  const { error: errUp } = await supabase
    .from("pedidos")
    .update({ total })
    .eq("id", pedidoId);

  if (errUp) console.error("Erro ao atualizar total do pedido:", errUp);
}

// ===============================================
// CARREGAR PRODUTOS (para autocomplete)
// ===============================================
async function carregarProdutos() {
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
}

// ===============================================
// CARREGAR ITEM
// ===============================================
async function carregarItem() {
  const { data, error } = await supabase
    .from("pedidos_itens")
    .select(
      `
      id,
      pedido_id,
      produto_id,
      quantidade,
      valor_unitario,
      data_entrega,
      produtos:produto_id ( codigo, descricao )
    `
    )
    .eq("id", itemId)
    .single();

  if (error || !data) {
    console.error("Erro ao carregar item:", error);
    alert("Erro ao carregar item do pedido.");
    return;
  }

  produtoSelecionadoId = data.produto_id;

  const busca = document.getElementById("busca_produto");
  const qtd = document.getElementById("quantidade");
  const valor = document.getElementById("valor_unitario");
  const dataEntrega = document.getElementById("data_entrega");

  if (busca) {
    const label = data?.produtos
      ? `${data.produtos.codigo} — ${data.produtos.descricao}`
      : "";
    busca.value = label;
  }

  if (qtd) qtd.value = data.quantidade ?? "";
  if (valor) valor.value = formatarValorBR(data.valor_unitario ?? 0);
  if (dataEntrega) dataEntrega.value = isoParaBR(data.data_entrega);
}

// ===============================================
// AUTOCOMPLETE
// ===============================================
function configurarAutocomplete() {
  const input = document.getElementById("busca_produto");
  const lista = document.getElementById("listaProdutos");
  if (!input || !lista) return;

  function renderLista(filtro) {
    const termo = (filtro || "").toLowerCase();
    const itens = listaProdutos
      .filter((p) => {
        const a = (p.codigo || "").toLowerCase();
        const b = (p.descricao || "").toLowerCase();
        return a.includes(termo) || b.includes(termo);
      })
      .slice(0, 30);

    if (itens.length === 0) {
      lista.style.display = "none";
      lista.innerHTML = "";
      return;
    }

    lista.innerHTML = itens
      .map(
        (p) => `
        <div class="autocomplete-item" data-id="${p.id}">
          <strong>${p.codigo}</strong> — ${p.descricao}
        </div>`
      )
      .join("");

    lista.style.display = "block";
  }

  input.addEventListener("input", () => {
    renderLista(input.value);
  });

  lista.addEventListener("click", (e) => {
    const item = e.target.closest("[data-id]");
    if (!item) return;

    const id = item.getAttribute("data-id");
    const prod = listaProdutos.find((p) => String(p.id) === String(id));
    if (!prod) return;

    produtoSelecionadoId = prod.id;
    input.value = `${prod.codigo} — ${prod.descricao}`;
    lista.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (!lista.contains(e.target) && e.target !== input) {
      lista.style.display = "none";
    }
  });
}

// ===============================================
// MÁSCARA DATA (DD/MM/AAAA)
// ===============================================
function configurarMascaraData() {
  const input = document.getElementById("data_entrega");
  if (!input) return;

  input.addEventListener("input", () => {
    let v = input.value.replace(/\D/g, "").slice(0, 8);
    if (v.length >= 5) input.value = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
    else if (v.length >= 3) input.value = `${v.slice(0,2)}/${v.slice(2)}`;
    else input.value = v;
  });
}

// ===============================================
// SALVAR
// ===============================================
function configurarSalvar() {
  const btn = document.getElementById("btnSalvarItem");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      const qtdEl = document.getElementById("quantidade");
      const valEl = document.getElementById("valor_unitario");
      const dtEl = document.getElementById("data_entrega");

      const quantidade = Number(qtdEl?.value || 0);
      const valorUnitario = parseDinheiroBR(valEl?.value || 0);
      const dataEntregaISO = brParaISO(dtEl?.value || "");

      if (!produtoSelecionadoId) {
        alert("Selecione um produto.");
        return;
      }
      if (!quantidade || quantidade <= 0) {
        alert("Informe a quantidade.");
        return;
      }
      if (!valorUnitario || valorUnitario <= 0) {
        alert("Informe o valor unitário.");
        return;
      }
      if (!dataEntregaISO) {
        alert("Informe a data de entrega no formato DD/MM/AAAA.");
        return;
      }

      const totalItem = quantidade * valorUnitario;

      const { error } = await supabase
        .from("pedidos_itens")
        .update({
          produto_id: produtoSelecionadoId,
          quantidade,
          valor_unitario: valorUnitario,
          total_item: totalItem,
          data_entrega: dataEntregaISO,
        })
        .eq("id", itemId);

      if (error) {
        console.error("Erro ao atualizar item:", error);
        alert("Erro ao atualizar item.");
        return;
      }

      // Atualiza total do pedido (sem alertar erro se der certo)
      await atualizarTotalPedido();

      // Sucesso: só UMA mensagem, e redireciona
      alert("Item atualizado com sucesso!");
      window.location.href = `pedidos_editar.html?id=${pedidoId}`;
    } catch (err) {
      console.error(err);
      alert("Erro inesperado ao salvar.");
    }
  });
}
