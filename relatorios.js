import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarProdutosSelectRelatorio();
  carregarRelatorioEstoque();
  carregarRelatorioMovimentacoes();
});

/* ============================
    RELATÓRIO: PRODUTOS
============================ */

async function carregarRelatorioEstoque() {
  const tabela = document.querySelector("#rel-estoque tbody");
  tabela.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  const { data, error } = await supabase
    .from("estoque")
    .select(`
      quantidade,
      local,
      ultima_atualizacao,
      produtos (
        nome,
        sku
      )
    `);

  if (error) {
    tabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados.</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  data.forEach(item => {
    tabela.innerHTML += `
      <tr>
        <td>${item.produtos?.nome || "-"}</td>
        <td>${item.produtos?.sku || "-"}</td>
        <td>${item.quantidade}</td>
        <td>${item.local || "-"}</td>
        <td>${item.ultima_atualizacao ? new Date(item.ultima_atualizacao).toLocaleString() : "-"}</td>
      </tr>
    `;
  });
}

/* ============================
    RELATÓRIO: MOVIMENTAÇÕES
============================ */

async function carregarProdutosSelectRelatorio() {
  const select = document.getElementById("rel-produto");
  
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("nome", { ascending: true });

  select.innerHTML = "<option value=''>Todos</option>";

  data.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.sku} - ${p.nome}</option>`;
  });
}

async function carregarRelatorioMovimentacoes() {
  const tabela = document.querySelector("#rel-mov tbody");
  tabela.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";

  const produto_id = document.getElementById("rel-produto").value;
  const tipo = document.getElementById("rel-tipo").value;
  const inicio = document.getElementById("rel-inicio").value;
  const fim = document.getElementById("rel-fim").value;

  let query = supabase
    .from("movimentacoes")
    .select(`
      *,
      produtos (nome, sku)
    `)
    .order("id", { ascending: false });

  if (produto_id) query = query.eq("produto_id", produto_id);
  if (tipo) query = query.eq("tipo", tipo);
  if (inicio) query = query.gte("criado_em", inicio);
  if (fim) query = query.lte("criado_em", fim + " 23:59:59");

  const { data, error } = await query;

  if (error) {
    tabela.innerHTML = "<tr><td colspan='6'>Erro ao carregar movimentações.</td></tr>";
    return;
  }

  tabela.innerHTML = "";

  data.forEach(m => {
    tabela.innerHTML += `
      <tr>
        <td>${new Date(m.criado_em).toLocaleString()}</td>
        <td>${m.produtos?.nome || "-"}</td>
        <td>${m.tipo.toUpperCase()}</td>
        <td>${m.quantidade}</td>
        <td>${m.motivo || "-"}</td>
        <td>${m.referencia_id || "-"}</td>
      </tr>
    `;
  });
}

/* ============================
      EXPORTAR CSV
============================ */

document.addEventListener("click", (e) => {
  if (e.target.matches("#btn-exportar-mov")) {
    exportarCSVMovimentacoes();
  }
  if (e.target.matches("#btn-exportar-estoque")) {
    exportarCSVEstoque();
  }
});

/* CSV: Movimentações */
function exportarCSVMovimentacoes() {
  const linhas = [...document.querySelectorAll("#rel-mov tbody tr")]
    .map(tr => [...tr.children].map(td => td.innerText).join(";"))
    .join("\n");

  baixarCSV("relatorio_movimentacoes.csv", linhas);
}

/* CSV: Estoque */
function exportarCSVEstoque() {
  const linhas = [...document.querySelectorAll("#rel-estoque tbody tr")]
    .map(tr => [...tr.children].map(td => td.innerText).join(";"))
    .join("\n");

  baixarCSV("relatorio_estoque.csv", linhas);
}

/* Função comum */
function baixarCSV(nome, conteudo) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
}
