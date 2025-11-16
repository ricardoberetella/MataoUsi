import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarRelatorioEstoque();
  carregarProdutosRel();
  carregarRelatorioMovimentacoes();

  document.getElementById("btn-exportar-estoque").addEventListener("click", exportarCSVEstoque);
  document.getElementById("btn-exportar-mov").addEventListener("click", exportarCSVMOV);
});

async function carregarRelatorioEstoque() {
  const tabela = document.querySelector("#rel-estoque tbody");

  const { data } = await supabase
    .from("estoque")
    .select("*, produtos(nome, sku)");

  tabela.innerHTML = "";

  data.forEach(i => {
    tabela.innerHTML += `
      <tr>
        <td>${i.produtos.nome}</td>
        <td>${i.produtos.sku}</td>
        <td>${i.quantidade}</td>
        <td>${i.local}</td>
        <td>${i.ultima_atualizacao ? new Date(i.ultima_atualizacao).toLocaleString() : "-"}</td>
      </tr>
    `;
  });
}

async function carregarProdutosRel() {
  const select = document.getElementById("rel-produto");

  const { data } = await supabase.from("produtos").select("*");

  select.innerHTML = "<option value=''>Todos</option>";

  data.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.sku} - ${p.nome}</option>`;
  });
}

async function carregarRelatorioMovimentacoes() {
  const tabela = document.querySelector("#rel-mov tbody");

  const filtro = {
    produto_id: document.getElementById("rel-produto").value,
    tipo: document.getElementById("rel-tipo").value,
    inicio: document.getElementById("rel-inicio").value,
    fim: document.getElementById("rel-fim").value,
  };

  let query = supabase
    .from("movimentacoes")
    .select("*, produtos(nome, sku)")
    .order("id", { ascending: false });

  if (filtro.produto_id) query = query.eq("produto_id", filtro.produto_id);
  if (filtro.tipo) query = query.eq("tipo", filtro.tipo);
  if (filtro.inicio) query = query.gte("criado_em", filtro.inicio);
  if (filtro.fim) query = query.lte("criado_em", filtro.fim + " 23:59:59");

  const { data } = await query;

  tabela.innerHTML = "";

  data.forEach(m => {
    tabela.innerHTML += `
      <tr>
        <td>${new Date(m.criado_em).toLocaleString()}</td>
        <td>${m.produtos.nome}</td>
        <td>${m.tipo}</td>
        <td>${m.quantidade}</td>
        <td>${m.motivo}</td>
        <td>${m.referencia_id}</td>
      </tr>
    `;
  });
}

function exportarCSVEstoque() {
  exportarTabelaCSV("rel-estoque", "estoque.csv");
}

function exportarCSVMOV() {
  exportarTabelaCSV("rel-mov", "movimentacoes.csv");
}

function exportarTabelaCSV(idTabela, nomeArquivo) {
  let csv = "";
  document.querySelectorAll(`#${idTabela} tr`).forEach(tr => {
    const linha = [...tr.children].map(td => td.innerText).join(";");
    csv += linha + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
}
