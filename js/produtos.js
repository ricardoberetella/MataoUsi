import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lista completa (sem filtro) em memória
let listaCompletaProdutos = [];

/* ===========================
   INICIALIZAÇÃO
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  carregarListaProdutos();
  configurarModalFiltros();
  configurarImpressao();
});

/* ===========================
   CARREGAR PRODUTOS
=========================== */
async function carregarListaProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    alert("Erro ao carregar produtos.");
    return;
  }

  listaCompletaProdutos = data || [];
  renderizarTabela(listaCompletaProdutos);
  preencherFiltroCodigo(listaCompletaProdutos);
}

/* ===========================
   RENDERIZAR TABELA
=========================== */
function renderizarTabela(lista) {
  const tbody = document.getElementById("listaProdutos");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;">
          Nenhum produto encontrado.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.codigo ?? ""}</td>
      <td>${p.descricao ?? ""}</td>
      <td>${formatNumero(p.comprimento_mm)}</td>
      <td>${formatNumero(p.peso_liquido)}</td>
      <td>${formatNumero(p.peso_bruto)}</td>
      <td>${formatNumero(p.valor_unitario)}</td>
      <td>${p.acabamento ?? ""}</td>
      <td>
        <button class="btn-primario btn-acao" data-tipo="editar" data-id="${p.id}">
          Editar
        </button>
        <button class="btn-excluir btn-acao" data-tipo="excluir" data-id="${p.id}">
          Excluir
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Eventos dos botões Editar/Excluir
  tbody.querySelectorAll(".btn-acao").forEach((btn) => {
    btn.addEventListener("click", onClickAcaoProduto);
  });
}

/* ===========================
   FORMATAÇÃO NÚMEROS
=========================== */
function formatNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  const num = Number(valor);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ===========================
   PREENCHER FILTRO CÓDIGO
=========================== */
function preencherFiltroCodigo(lista) {
  const select = document.getElementById("filtroCodigo");
  if (!select) return;

  // limpa e coloca "Todos"
  select.innerHTML = `<option value="todos">Todos</option>`;

  const codigosUnicos = [
    ...new Set(
      lista
        .map((p) => p.codigo)
        .filter((c) => c !== null && c !== undefined && c !== "")
    ),
  ];

  codigosUnicos.forEach((codigo) => {
    const opt = document.createElement("option");
    opt.value = codigo;
    opt.textContent = codigo;
    select.appendChild(opt);
  });
}

/* ===========================
   MODAL DE FILTROS
=========================== */
function configurarModalFiltros() {
  const modal = document.getElementById("modalFiltros");
  const btnAbrir = document.getElementById("btnFiltros");
  const btnFechar = document.getElementById("btnFecharFiltros");
  const btnAplicar = document.getElementById("btnAplicarFiltros");
  const btnLimpar = document.getElementById("btnLimparFiltros");

  if (!modal) return;

  if (btnAbrir) {
    btnAbrir.addEventListener("click", () => {
      modal.style.display = "flex";
    });
  }

  if (btnFechar) {
    btnFechar.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // Fechar clicando fora do conteúdo
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  if (btnAplicar) {
    btnAplicar.addEventListener("click", aplicarFiltros);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      const selCodigo = document.getElementById("filtroCodigo");
      const selAcab = document.getElementById("filtroAcabamento");
      if (selCodigo) selCodigo.value = "todos";
      if (selAcab) selAcab.value = "todos";
      renderizarTabela(listaCompletaProdutos);
    });
  }
}

/* ===========================
   APLICAR FILTROS
=========================== */
function aplicarFiltros() {
  const selCodigo = document.getElementById("filtroCodigo");
  const selAcab = document.getElementById("filtroAcabamento");

  const codigoFiltro = selCodigo ? selCodigo.value : "todos";
  const acabamentoFiltro = selAcab ? selAcab.value : "todos";

  let filtrados = [...listaCompletaProdutos];

  if (codigoFiltro && codigoFiltro !== "todos") {
    filtrados = filtrados.filter((p) => p.codigo === codigoFiltro);
  }

  if (acabamentoFiltro && acabamentoFiltro !== "todos") {
    filtrados = filtrados.filter(
      (p) => (p.acabamento || "") === acabamentoFiltro
    );
  }

  renderizarTabela(filtrados);

  const modal = document.getElementById("modalFiltros");
  if (modal) modal.style.display = "none";
}

/* ===========================
   IMPRESSÃO (USA FILTRO ATUAL)
=========================== */
function configurarImpressao() {
  const btn = document.getElementById("btnImprimir");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const printTable = document.getElementById("printTable");
    const corpoLista = document.getElementById("listaProdutos");
    if (!printTable || !corpoLista) return;

    // Monta cabeçalho da tabela de impressão
    printTable.innerHTML = `
      <thead>
        <tr>
          <th>Código</th>
          <th>Descrição</th>
          <th>Comp. (mm)</th>
          <th>Peso Líq.</th>
          <th>Peso Bruto</th>
          <th>Valor Unit.</th>
          <th>Acabamento</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbodyPrint = printTable.querySelector("tbody");

    // Pega as linhas atualmente exibidas (já filtradas)
    const linhas = corpoLista.querySelectorAll("tr");
    linhas.forEach((linha) => {
      const clone = linha.cloneNode(true);

      // remove coluna de Ações (última)
      while (clone.cells.length > 7) {
        clone.deleteCell(clone.cells.length - 1);
      }

      tbodyPrint.appendChild(clone);
    });

    // Data/hora já é atualizada no inline script do HTML,
    // mas reforçamos aqui para garantir
    const spanDataHora = document.getElementById("printDataHora");
    if (spanDataHora) {
      spanDataHora.textContent = new Date().toLocaleString("pt-BR");
    }

    // Mostra área de impressão, chama print, depois esconde
    const printArea = document.getElementById("printArea");
    if (printArea) {
      printArea.style.display = "block";
      window.print();
      printArea.style.display = "none";
    }
  });
}

/* ===========================
   AÇÕES: EDITAR / EXCLUIR
=========================== */
async function onClickAcaoProduto(event) {
  const btn = event.currentTarget;
  const tipo = btn.dataset.tipo;
  const id = btn.dataset.id;

  if (!id) return;

  if (tipo === "editar") {
    // abre cadastro com ID para edição
    window.location.href = `produtos_novo.html?id=${id}`;
    return;
  }

  if (tipo === "excluir") {
    const ok = confirm("Confirma a exclusão deste produto?");
    if (!ok) return;

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto.");
      return;
    }

    await carregarListaProdutos();
  }
}
