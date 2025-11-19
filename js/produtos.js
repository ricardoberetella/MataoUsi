import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;
let listaProdutos = [];
let paginaAtual = 1;
const itensPorPagina = 20;

/* -------------------------------------------------------
   Conversão BR → Número
------------------------------------------------------- */
function toNumberBR(valor) {
  if (!valor || valor.trim() === "") return 0;
  valor = valor.replace(/\./g, "");
  valor = valor.replace(",", ".");
  return Number(valor);
}

/* -------------------------------------------------------
   Formatar exibição BR
------------------------------------------------------- */
function formatBR(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  return String(valor).replace(".", ",");
}

/* -------------------------------------------------------
   Formatar preço R$
------------------------------------------------------- */
function formatPreco(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* -------------------------------------------------------
   Alertas
------------------------------------------------------- */
function alerta(msg, tipo = "info") {
  const box = document.createElement("div");
  box.className = "alert " + tipo;
  box.innerText = msg;

  document.body.appendChild(box);
  setTimeout(() => box.classList.add("show"), 50);

  setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.remove(), 300);
  }, 3000);
}

/* -------------------------------------------------------
   Botão: salvando...
------------------------------------------------------- */
function setLoading(btn, estado) {
  btn.disabled = estado;
  btn.innerHTML = estado ? "⏳ Salvando..." : "Salvar";
}

/* -------------------------------------------------------
   FILTROS / PAGINAÇÃO
------------------------------------------------------- */
function obterProdutosFiltrados() {
  const cod = document.getElementById("filtroCodigo")?.value.trim().toLowerCase() || "";
  const desc = document.getElementById("filtroDescricao")?.value.trim().toLowerCase() || "";
  const uni = document.getElementById("filtroUnidade")?.value.trim().toLowerCase() || "";

  return listaProdutos.filter((p) => {
    const c = (p.codigo || "").toLowerCase();
    const d = (p.descricao || "").toLowerCase();
    const u = (p.unidade || "").toLowerCase();

    if (cod && !c.includes(cod)) return false;
    if (desc && !d.includes(desc)) return false;
    if (uni && u !== uni) return false;
    return true;
  });
}

function renderTabela() {
  const tbody = document.getElementById("listaProdutos");
  if (!tbody) return;

  const filtrados = obterProdutosFiltrados();
  const totalItens = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const pagina = filtrados.slice(inicio, inicio + itensPorPagina);

  tbody.innerHTML = "";

  if (pagina.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="10" style="text-align:center;">Nenhum produto encontrado.</td></tr>
    `;
  } else {
    pagina.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.codigo ?? ""}</td>
        <td>${p.descricao ?? ""}</td>
        <td>${p.unidade ?? ""}</td>
        <td class="numero">${formatBR(p.comprimento_mm)}</td>
        <td>${p.acabamento ?? ""}</td>
        <td class="numero">${formatBR(p.peso_bruto)}</td>
        <td class="numero">${formatBR(p.peso_liquido)}</td>
        <td class="numero">${formatPreco(p.preco_custo)}</td>
        <td class="numero">${formatPreco(p.preco_venda)}</td>
        <td>
          <button class="btn-editar" onclick="editarProduto(${p.id})">Editar</button>
          <button class="btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const info = document.getElementById("infoPagina");
  if (info) {
    info.textContent = `Página ${paginaAtual} de ${totalPaginas} (${totalItens} itens)`;
  }
}

/* -------------------------------------------------------
   SUGESTÕES (AUTOCOMPLETE DESCRIÇÃO)
------------------------------------------------------- */
function atualizarSugestoesDescricao() {
  const datalist = document.getElementById("sugestoesDescricao");
  if (!datalist) return;

  const descricoes = [...new Set(
    listaProdutos
      .map((p) => p.descricao)
      .filter((d) => d && d.trim() !== "")
  )].sort((a, b) => a.localeCompare(b, "pt-BR"));

  datalist.innerHTML = descricoes
    .map((d) => `<option value="${d}"></option>`)
    .join("");
}

/* -------------------------------------------------------
   Carregar produtos
------------------------------------------------------- */
async function carregarProdutos() {
  const tbody = document.getElementById("listaProdutos");
  if (tbody) {
    tbody.innerHTML = `
      <tr><td colspan="10" style="text-align:center;">Carregando...</td></tr>
    `;
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    alerta("Erro ao carregar produtos!", "erro");
    return;
  }

  listaProdutos = data || [];
  paginaAtual = 1;
  atualizarSugestoesDescricao();
  renderTabela();
}

/* -------------------------------------------------------
   Salvar (INSERT / UPDATE)
------------------------------------------------------- */
document.getElementById("formProduto").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("btnSalvar");
  setLoading(btn, true);

  const produto = {
    codigo: document.getElementById("codigo").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    unidade: document.getElementById("unidade").value.trim(),
    comprimento_mm: toNumberBR(document.getElementById("comprimento_mm").value),
    acabamento: document.getElementById("acabamento").value.trim(),
    peso_bruto: toNumberBR(document.getElementById("peso_bruto").value),
    peso_liquido: toNumberBR(document.getElementById("peso_liquido").value),
    preco_custo: toNumberBR(document.getElementById("preco_custo").value),
    preco_venda: toNumberBR(document.getElementById("preco_venda").value),
  };

  if (!produto.descricao) {
    alerta("Descrição obrigatória!", "erro");
    setLoading(btn, false);
    return;
  }

  let retorno;

  if (editandoId) {
    retorno = await supabase.from("produtos").update(produto).eq("id", editandoId);
  } else {
    retorno = await supabase.from("produtos").insert([produto]);
  }

  const { error } = retorno;

  setLoading(btn, false);

  if (error) {
    alerta("Erro ao salvar produto!", "erro");
    console.error(error);
    return;
  }

  alerta(editandoId ? "Produto atualizado!" : "Produto cadastrado!", "sucesso");

  limparFormulario();
  await carregarProdutos();
});

/* -------------------------------------------------------
   Editar produto
------------------------------------------------------- */
window.editarProduto = async function (id) {
  editandoId = id;

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alerta("Erro ao carregar produto!", "erro");
    return;
  }

  preencherFormulario(data);
  alerta("Editando produto...", "info");
};

/* -------------------------------------------------------
   Preencher formulário
------------------------------------------------------- */
function preencherFormulario(data) {
  editandoId = data.id;

  document.getElementById("codigo").value = data.codigo ?? "";
  document.getElementById("descricao").value = data.descricao ?? "";
  document.getElementById("unidade").value = data.unidade ?? "";
  document.getElementById("comprimento_mm").value = formatBR(data.comprimento_mm);
  document.getElementById("acabamento").value = data.acabamento ?? "";
  document.getElementById("peso_bruto").value = formatBR(data.peso_bruto);
  document.getElementById("peso_liquido").value = formatBR(data.peso_liquido);
  document.getElementById("preco_custo").value = formatBR(data.preco_custo);
  document.getElementById("preco_venda").value = formatBR(data.preco_venda);

  document.getElementById("btnCancelar").style.display = "inline-block";
}

/* -------------------------------------------------------
   BUSCAR PRODUTO PELO CÓDIGO
------------------------------------------------------- */
document.getElementById("btnBuscarCodigo")?.addEventListener("click", buscarProdutoPorCodigo);

async function buscarProdutoPorCodigo() {
  const codigo = document.getElementById("codigo").value.trim();

  if (!codigo) {
    alerta("Digite um código para buscar!", "erro");
    return;
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) {
    alerta("Erro ao buscar produto!", "erro");
    return;
  }

  if (!data) {
    alerta("Nenhum produto encontrado!", "erro");
    return;
  }

  preencherFormulario(data);
  alerta("Produto carregado!", "sucesso");
}

/* -------------------------------------------------------
   Cancelar edição
------------------------------------------------------- */
document.getElementById("btnCancelar").addEventListener("click", () => {
  limparFormulario();
  alerta("Edição cancelada", "info");
});

/* -------------------------------------------------------
   Excluir
------------------------------------------------------- */
window.excluirProduto = async function (id) {
  if (!confirm("Excluir este produto?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    alerta("Erro ao excluir!", "erro");
    return;
  }

  alerta("Produto excluído!", "sucesso");
  await carregarProdutos();
};

/* -------------------------------------------------------
   Limpar formulário
------------------------------------------------------- */
function limparFormulario() {
  document.getElementById("formProduto").reset();
  document.getElementById("btnCancelar").style.display = "none";
  editandoId = null;
}

/* -------------------------------------------------------
   PAGINAÇÃO – BOTÕES
------------------------------------------------------- */
document.getElementById("btnAnterior")?.addEventListener("click", () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    renderTabela();
  }
});

document.getElementById("btnProximo")?.addEventListener("click", () => {
  const total = obterProdutosFiltrados().length;
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    renderTabela();
  }
});

/* -------------------------------------------------------
   APLICAR / LIMPAR FILTROS
------------------------------------------------------- */
document.getElementById("btnAplicarFiltros")?.addEventListener("click", () => {
  paginaAtual = 1;
  renderTabela();
});

document.getElementById("btnLimparFiltros")?.addEventListener("click", () => {
  document.getElementById("filtroCodigo").value = "";
  document.getElementById("filtroDescricao").value = "";
  document.getElementById("filtroUnidade").value = "";
  paginaAtual = 1;
  renderTabela();
});

/* -------------------------------------------------------
   EXPORTAR EXCEL (CSV)
------------------------------------------------------- */
document.getElementById("btnExportarExcel")?.addEventListener("click", () => {
  const produtos = obterProdutosFiltrados();
  if (produtos.length === 0) {
    alerta("Nenhum produto para exportar.", "info");
    return;
  }

  const cabecalho = [
    "Codigo","Descricao","Unidade",
    "Comprimento_mm","Acabamento",
    "Peso_bruto","Peso_liquido",
    "Preco_custo","Preco_venda"
  ];

  const linhas = produtos.map((p) => [
    p.codigo ?? "",
    p.descricao ?? "",
    p.unidade ?? "",
    p.comprimento_mm ?? "",
    p.acabamento ?? "",
    p.peso_bruto ?? "",
    p.peso_liquido ?? "",
    p.preco_custo ?? "",
    p.preco_venda ?? "",
  ]);

  const csv = [cabecalho, ...linhas]
    .map((linha) =>
      linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "produtos.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* -------------------------------------------------------
   EXPORTAR PDF (via print)
------------------------------------------------------- */
document.getElementById("btnExportarPDF")?.addEventListener("click", () => {
  const produtos = obterProdutosFiltrados();
  if (produtos.length === 0) {
    alerta("Nenhum produto para exportar.", "info");
    return;
  }

  const linhas = produtos.map((p) => `
    <tr>
      <td>${p.codigo ?? ""}</td>
      <td>${p.descricao ?? ""}</td>
      <td>${p.unidade ?? ""}</td>
      <td>${p.comprimento_mm ?? ""}</td>
      <td>${p.acabamento ?? ""}</td>
      <td>${p.peso_bruto ?? ""}</td>
      <td>${p.peso_liquido ?? ""}</td>
      <td>${p.preco_custo ?? ""}</td>
      <td>${p.preco_venda ?? ""}</td>
    </tr>
  `).join("");

  const htmlTabela = `
    <table>
      <thead>
        <tr>
          <th>Cód</th>
          <th>Descrição</th>
          <th>UN</th>
          <th>Comp</th>
          <th>Acab</th>
          <th>P. Bruto</th>
          <th>P. Líquido</th>
          <th>Custo</th>
          <th>Venda</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>Relatório de Produtos</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
          th { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <h2>Relatório de Produtos</h2>
        ${htmlTabela}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
});

/* -------------------------------------------------------
   Inicializar
------------------------------------------------------- */
carregarProdutos();
