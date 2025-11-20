import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let editandoId = null;
let listaProdutos = [];
let paginaAtual = 1;
const itensPorPagina = 20;

/* =====================================================================
   FORMATADORES PADRÃO BRASIL
===================================================================== */
function toNumberBR(valor) {
  if (!valor || valor.trim() === "") return 0;
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function formatBR(valor) {
  if (valor == null || valor === "") return "";
  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPreco(valor) {
  if (valor == null || valor === "") return "";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* =====================================================================
   ALERTA FUTURISTA
===================================================================== */
function alerta(msg, tipo = "info") {
  const box = document.createElement("div");
  box.className = `alert ${tipo}`;
  box.innerText = msg;

  document.body.appendChild(box);
  setTimeout(() => box.classList.add("show"), 20);

  setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.remove(), 300);
  }, 3000);
}

/* =====================================================================
   LOADING BUTTON
===================================================================== */
function setLoading(btn, estado) {
  btn.disabled = estado;
  btn.textContent = estado ? "⏳ Salvando..." : "Salvar";
}

/* =====================================================================
   FILTROS E PAGINAÇÃO
===================================================================== */
function obterProdutosFiltrados() {
  const cod = document.getElementById("filtroCodigo")?.value.trim().toLowerCase() || "";
  const desc = document.getElementById("filtroDescricao")?.value.trim().toLowerCase() || "";
  const uni = document.getElementById("filtroUnidade")?.value.trim().toLowerCase() || "";

  return listaProdutos.filter((p) => {
    if (cod && !(p.codigo || "").toLowerCase().includes(cod)) return false;
    if (desc && !(p.descricao || "").toLowerCase().includes(desc)) return false;
    if (uni && (p.unidade || "").toLowerCase() !== uni) return false;
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

  const fragment = document.createDocumentFragment();

  if (pagina.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Nenhum produto encontrado.</td></tr>`;
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
      fragment.appendChild(tr);
    });

    tbody.innerHTML = "";
    tbody.appendChild(fragment);
  }

  const info = document.getElementById("infoPagina");
  if (info) info.textContent = `Página ${paginaAtual} de ${totalPaginas} (${totalItens} itens)`;
}

/* =====================================================================
   AUTOCOMPLETE
===================================================================== */
function atualizarSugestoesDescricao() {
  const datalist = document.getElementById("sugestoesDescricao");
  if (!datalist) return;

  const descricoes = [...new Set(listaProdutos.map((p) => p.descricao).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  datalist.innerHTML = descricoes.map((d) => `<option value="${d}"></option>`).join("");
}

/* =====================================================================
   CARREGAR PRODUTOS
===================================================================== */
async function carregarProdutos() {
  const tbody = document.getElementById("listaProdutos");
  if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Carregando...</td></tr>`;

  const { data, error } = await supabase.from("produtos").select("*").order("id", { ascending: false });

  if (error) {
    alerta("Erro ao carregar produtos!", "erro");
    return;
  }

  listaProdutos = data || [];
  paginaAtual = 1;

  atualizarSugestoesDescricao();
  renderTabela();
}

/* =====================================================================
   SALVAR / EDITAR
===================================================================== */
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

  const operacao = editandoId
    ? supabase.from("produtos").update(produto).eq("id", editandoId)
    : supabase.from("produtos").insert([produto]);

  const { error } = await operacao;

  setLoading(btn, false);

  if (error) {
    alerta("Erro ao salvar produto!", "erro");
    return;
  }

  alerta(editandoId ? "Produto atualizado!" : "Produto cadastrado!", "sucesso");

  limparFormulario();
  carregarProdutos();
});

/* =====================================================================
   EDITAR
===================================================================== */
window.editarProduto = async function (id) {
  editandoId = id;

  const { data, error } = await supabase.from("produtos").select("*").eq("id", id).single();

  if (error) {
    alerta("Erro ao carregar produto!", "erro");
    return;
  }

  preencherFormulario(data);
  alerta("Editando produto...", "info");
};

function preencherFormulario(d) {
  editandoId = d.id;

  document.getElementById("codigo").value = d.codigo ?? "";
  document.getElementById("descricao").value = d.descricao ?? "";
  document.getElementById("unidade").value = d.unidade ?? "";
  document.getElementById("comprimento_mm").value = formatBR(d.comprimento_mm);
  document.getElementById("acabamento").value = d.acabamento ?? "";
  document.getElementById("peso_bruto").value = formatBR(d.peso_bruto);
  document.getElementById("peso_liquido").value = formatBR(d.peso_liquido);
  document.getElementById("preco_custo").value = formatBR(d.preco_custo);
  document.getElementById("preco_venda").value = formatBR(d.preco_venda);

  document.getElementById("btnCancelar").style.display = "inline-block";
}

/* =====================================================================
   BUSCAR POR CÓDIGO (ENTER + BOTÃO)
===================================================================== */

document.getElementById("btnBuscarCodigo")?.addEventListener("click", buscarProdutoPorCodigo);

document.getElementById("codigo")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") buscarProdutoPorCodigo();
});

async function buscarProdutoPorCodigo() {
  const codigo = document.getElementById("codigo").value.trim();
  if (!codigo) return alerta("Digite um código!", "erro");

  const { data, error } = await supabase.from("produtos").select("*").eq("codigo", codigo).maybeSingle();

  if (error) return alerta("Erro ao buscar!", "erro");
  if (!data) return alerta("Produto não encontrado!", "erro");

  preencherFormulario(data);
  alerta("Produto carregado!", "sucesso");
}

/* =====================================================================
   EXCLUIR
===================================================================== */
window.excluirProduto = async function (id) {
  if (!confirm("Excluir este produto?")) return;

  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) return alerta("Erro ao excluir!", "erro");

  alerta("Produto excluído!", "sucesso");
  carregarProdutos();
};

/* =====================================================================
   CANCELAR EDIÇÃO
===================================================================== */
document.getElementById("btnCancelar").addEventListener("click", () => {
  limparFormulario();
  alerta("Edição cancelada", "info");
});

function limparFormulario() {
  document.getElementById("formProduto").reset();
  document.getElementById("btnCancelar").style.display = "none";
  editandoId = null;
}

/* =====================================================================
   PAGINAÇÃO
===================================================================== */
document.getElementById("btnAnterior")?.addEventListener("click", () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    renderTabela();
  }
});

document.getElementById("btnProximo")?.addEventListener("click", () => {
  const total = obterProdutosFiltrados().length;
  const totalPaginas = Math.ceil(total / itensPorPagina);
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    renderTabela();
  }
});

/* =====================================================================
   FILTROS
===================================================================== */
document.getElementById("btnAplicarFiltros")?.addEventListener("click", () => {
  paginaAtual = 1;
  renderTabela();
});

document.getElementById("btnLimparFiltros")?.addEventListener("click", () => {
  ["filtroCodigo", "filtroDescricao", "filtroUnidade"].forEach((id) => {
    const campo = document.getElementById(id);
    if (campo) campo.value = "";
  });
  paginaAtual = 1;
  renderTabela();
});

/* =====================================================================
   EXPORTAR CSV / PDF
===================================================================== */
// Mantive iguais, estão funcionando muito bem.

document.getElementById("btnExportarExcel")?.addEventListener("click", () => {
  const produtos = obterProdutosFiltrados();
  if (produtos.length === 0) return alerta("Nenhum produto para exportar.", "info");

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
    .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "produtos.csv";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btnExportarPDF")?.addEventListener("click", () => {
  const produtos = obterProdutosFiltrados();
  if (produtos.length === 0) return alerta("Nenhum produto para exportar.", "info");

  const linhas = produtos.map((p) => `
    <tr>
      <td>${p.codigo}</td>
      <td>${p.descricao}</td>
      <td>${p.unidade}</td>
      <td>${p.comprimento_mm}</td>
      <td>${p.acabamento}</td>
      <td>${p.peso_bruto}</td>  
      <td>${p.peso_liquido}</td>
      <td>${p.preco_custo}</td>
      <td>${p.preco_venda}</td>
    </tr>
  `).join("");

  const html = `
    <html>
      <head>
        <title>Relatório de Produtos</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h2>Relatório de Produtos</h2>
        <table>
          <thead>
            <tr>
              <th>Cód</th><th>Desc</th><th>UN</th>
              <th>Comp</th><th>Acab</th>
              <th>P.Bruto</th><th>P.Liq</th>
              <th>Custo</th><th>Venda</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.print();
});

/* =====================================================================
   INICIALIZAR
===================================================================== */
carregarProdutos();
