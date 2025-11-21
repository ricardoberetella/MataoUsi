import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let itensPedido = [];
let produtoAtual = null;
let pedidoId = null;

function parseDecimalBR(str) {
  if (!str) return 0;
  const limpo = str.replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return isNaN(n) ? 0 : n;
}

function formatDecimalBR(valor) {
  if (valor == null) valor = 0;
  const n = Number(valor);
  if (isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const tituloPagina = document.getElementById("tituloPagina");
  const selectCliente = document.getElementById("cliente");
  const inputData = document.getElementById("data_pedido");
  const inputPcOc = document.getElementById("pc_oc");
  const inputNumero = document.getElementById("numero_pedido");
  const selectTipo = document.getElementById("tipo_pedido");
  const txtObs = document.getElementById("observacoes");

  const inputCodigo = document.getElementById("codigo_produto");
  const inputDescricao = document.getElementById("descricao_produto");
  const inputPreco = document.getElementById("preco_unitario");
  const inputQtd = document.getElementById("quantidade");
  const tbodyItens = document.getElementById("tbodyItens");
  const spanTotalPedido = document.getElementById("totalPedido");

  const btnBuscarProduto = document.getElementById("btnBuscarProduto");
  const btnAdicionarItem = document.getElementById("btnAdicionarItem");
  const btnSalvarPedido = document.getElementById("btnSalvarPedido");

  carregarClientes();

  const params = new URLSearchParams(window.location.search);
  if (params.has("id")) {
    pedidoId = Number(params.get("id"));
    tituloPagina.textContent = "Editar Pedido";
    carregarPedidoExistente(pedidoId);
  } else {
    const hoje = new Date();
    inputData.value = hoje.toISOString().slice(0, 10);
  }

  btnBuscarProduto.addEventListener("click", async () => {
    const codigo = inputCodigo.value.trim();
    if (!codigo) {
      alert("Digite o código do produto.");
      return;
    }
    await buscarProdutoPorCodigo(codigo, inputDescricao, inputPreco);
  });

  inputCodigo.addEventListener("keyup", async (e) => {
    if (e.key === "Enter") {
      const codigo = inputCodigo.value.trim();
      if (!codigo) return;
      await buscarProdutoPorCodigo(codigo, inputDescricao, inputPreco);
    }
  });

  btnAdicionarItem.addEventListener("click", () => {
    if (!produtoAtual) {
      alert("Busque um produto pelo código antes de adicionar.");
      return;
    }

    const qtd = Number(inputQtd.value);
    if (!qtd || qtd <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const precoUnit = parseDecimalBR(inputPreco.value);
    if (!precoUnit || precoUnit <= 0) {
      alert("Informe um preço unitário válido.");
      return;
    }

    const totalItem = qtd * precoUnit;

    itensPedido.push({
      produto_id: produtoAtual.id,
      codigo: produtoAtual.codigo,
      descricao: produtoAtual.descricao,
      quantidade: qtd,
      valor_unitario: precoUnit,
      total: totalItem
    });

    produtoAtual = null;
    inputCodigo.value = "";
    inputDescricao.value = "";
    inputPreco.value = "";
    inputQtd.value = "";

    renderItens(tbodyItens, spanTotalPedido);
    inputCodigo.focus();
  });

  tbodyItens.addEventListener("click", (e) => {
    const btn = e.target;
    if (btn.matches(".btn-remover-item")) {
      const index = Number(btn.dataset.index);
      if (!isNaN(index)) {
        itensPedido.splice(index, 1);
        renderItens(tbodyItens, spanTotalPedido);
      }
    }
  });

  btnSalvarPedido.addEventListener("click", async () => {
    const clienteId = Number(selectCliente.value);
    const dataPedido = inputData.value;
    const pcOc = inputPcOc.value.trim();
    const numeroPedido = inputNumero.value.trim();
    const tipo = selectTipo.value;
    const observacoes = txtObs.value.trim();

    if (!clienteId) {
      alert("Selecione um cliente.");
      return;
    }
    if (!dataPedido) {
      alert("Informe a data do pedido.");
      return;
    }
    if (!numeroPedido) {
      alert("Informe o número do pedido.");
      return;
    }
    if (!tipo) {
      alert("Selecione o tipo de pedido.");
      return;
    }
    if (itensPedido.length === 0) {
      alert("Inclua pelo menos um item no pedido.");
      return;
    }

    const { data: existente, error: erroCheck } = await supabase
      .from("pedidos")
      .select("id")
      .eq("numero_pedido", numeroPedido)
      .maybeSingle();

    if (erroCheck) {
      alert("Erro ao verificar duplicidade de número de pedido: " + erroCheck.message);
      return;
    }

    if (!pedidoId && existente) {
      alert("Já existe um pedido com este número. Escolha outro número.");
      return;
    }

    if (pedidoId && existente && existente.id !== pedidoId) {
      alert("Já existe outro pedido com este número. Escolha outro número.");
      return;
    }

    const totalPedido = itensPedido.reduce((acc, item) => acc + item.total, 0);

    if (!pedidoId) {
      const { data: novo, error } = await supabase
        .from("pedidos")
        .insert([
          {
            cliente_id: clienteId,
            data_pedido: dataPedido,
            pc_oc: pcOc,
            observacoes,
            tipo_pedido: tipo,
            numero_pedido: numeroPedido,
            total: totalPedido
          }
        ])
        .select("id")
        .single();

      if (error) {
        alert("Erro ao salvar pedido: " + error.message);
        return;
      }

      const novoId = novo.id;
      const itensToInsert = itensPedido.map(item => ({
        pedido_id: novoId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario
      }));

      const { error: errorItens } = await supabase
        .from("pedidos_itens")
        .insert(itensToInsert);

      if (errorItens) {
        alert("Pedido criado, mas houve erro ao salvar itens: " + errorItens.message);
        return;
      }

      alert("Pedido salvo com sucesso!");
      window.location.href = "pedidos.html";
    } else {
      const { error: errorUpd } = await supabase
        .from("pedidos")
        .update({
          cliente_id: clienteId,
          data_pedido: dataPedido,
          pc_oc: pcOc,
          observacoes,
          tipo_pedido: tipo,
          numero_pedido: numeroPedido,
          total: totalPedido
        })
        .eq("id", pedidoId);

      if (errorUpd) {
        alert("Erro ao atualizar pedido: " + errorUpd.message);
        return;
      }

      const { error: errorDel } = await supabase
        .from("pedidos_itens")
        .delete()
        .eq("pedido_id", pedidoId);

      if (errorDel) {
        alert("Erro ao limpar itens antigos: " + errorDel.message);
        return;
      }

      const itensToInsert = itensPedido.map(item => ({
        pedido_id: pedidoId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario
      }));

      const { error: errorIns } = await supabase
        .from("pedidos_itens")
        .insert(itensToInsert);

      if (errorIns) {
        alert("Erro ao salvar itens do pedido: " + errorIns.message);
        return;
      }

      alert("Pedido atualizado com sucesso!");
      window.location.href = "pedidos.html";
    }
  });

  function renderItens(tbody, spanTotal) {
    tbody.innerHTML = "";

    if (itensPedido.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhum item adicionado.</td></tr>`;
      spanTotal.textContent = "R$ 0,00";
      return;
    }

    let total = 0;

    itensPedido.forEach((item, index) => {
      total += item.total;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.codigo}</td>
        <td>${item.descricao}</td>
        <td>${item.quantidade}</td>
        <td>R$ ${formatDecimalBR(item.valor_unitario)}</td>
        <td>R$ ${formatDecimalBR(item.total)}</td>
        <td>
          <button class="btn btn-ghost btn-remover-item" type="button" data-index="${index}">
            Remover
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    spanTotal.textContent = "R$ " + formatDecimalBR(total);
  }
});

async function carregarClientes() {
  const selectCliente = document.getElementById("cliente");
  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social", { ascending: true });

  if (error) {
    alert("Erro ao carregar clientes: " + error.message);
    return;
  }

  if (!data) return;

  for (const c of data) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.razao_social;
    selectCliente.appendChild(opt);
  }
}

async function buscarProdutoPorCodigo(codigo, inputDescricao, inputPreco) {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, descricao, preco_venda")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) {
    alert("Erro ao buscar produto: " + error.message);
    return;
  }

  if (!data) {
    alert("Produto não encontrado com este código.");
    inputDescricao.value = "";
    inputPreco.value = "";
    return;
  }

  produtoAtual = {
    id: data.id,
    codigo: data.codigo,
    descricao: data.descricao,
    preco_venda: Number(data.preco_venda)
  };

  inputDescricao.value = data.descricao || "";
  inputPreco.value = formatDecimalBR(data.preco_venda || 0);

  const inputQtd = document.getElementById("quantidade");
  if (inputQtd) {
    inputQtd.focus();
  }
}

async function carregarPedidoExistente(id) {
  const inputData = document.getElementById("data_pedido");
  const inputPcOc = document.getElementById("pc_oc");
  const inputNumero = document.getElementById("numero_pedido");
  const selectTipo = document.getElementById("tipo_pedido");
  const txtObs = document.getElementById("observacoes");
  const selectCliente = document.getElementById("cliente");
  const tbodyItens = document.getElementById("tbodyItens");
  const spanTotal = document.getElementById("totalPedido");

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pedido) {
    alert("Erro ao carregar pedido: " + (error ? error.message : "Pedido não encontrado"));
    return;
  }

  selectCliente.value = pedido.cliente_id || "";
  inputData.value = pedido.data_pedido || "";
  inputPcOc.value = pedido.pc_oc || "";
  inputNumero.value = pedido.numero_pedido || "";
  selectTipo.value = pedido.tipo_pedido || "";
  txtObs.value = pedido.observacoes || "";

  const { data: itens, error: errorItens } = await supabase
    .from("pedidos_itens")
    .select("id, produto_id, quantidade, valor_unitario")
    .eq("pedido_id", id);

  if (errorItens) {
    alert("Erro ao carregar itens do pedido: " + errorItens.message);
    return;
  }

  itensPedido = [];

  if (itens && itens.length > 0) {
    for (const it of itens) {
      const { data: prod } = await supabase
        .from("produtos")
        .select("codigo, descricao")
        .eq("id", it.produto_id)
        .maybeSingle();

      const qtd = Number(it.quantidade);
      const vu = Number(it.valor_unitario);
      const total = qtd * vu;

      itensPedido.push({
        produto_id: it.produto_id,
        codigo: prod?.codigo || "",
        descricao: prod?.descricao || "",
        quantidade: qtd,
        valor_unitario: vu,
        total
      });
    }
  }

  const renderBody = tbodyItens;
  const renderTotal = spanTotal;

  renderBody.innerHTML = "";
  let totalGeral = 0;

  if (itensPedido.length === 0) {
    renderBody.innerHTML = `<tr><td colspan="6">Nenhum item adicionado.</td></tr>`;
    renderTotal.textContent = "R$ 0,00";
  } else {
    itensPedido.forEach((item, index) => {
      totalGeral += item.total;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.codigo}</td>
        <td>${item.descricao}</td>
        <td>${item.quantidade}</td>
        <td>R$ ${formatDecimalBR(item.valor_unitario)}</td>
        <td>R$ ${formatDecimalBR(item.total)}</td>
        <td>
          <button class="btn btn-ghost btn-remover-item" type="button" data-index="${index}">
            Remover
          </button>
        </td>
      `;
      renderBody.appendChild(tr);
    });
    renderTotal.textContent = "R$ " + formatDecimalBR(totalGeral);
  }
}
